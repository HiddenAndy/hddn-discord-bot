import path from 'node:path';
import { access } from 'node:fs/promises';
import { mondayKey, nowText } from '../utils/date.js';
import { readStore, updateStore } from '../data/store.js';
import { config } from '../config/env.js';
import { fromProjectRoot } from '../utils/paths.js';

export const CLEANING_DRAW_BUTTON_ID = 'cleaning:draw';
const drawDurationMs = 30 * 60 * 1000;

const reasonLabels = {
  preference: '선호 구역 당첨',
  random: '랜덤 배정',
};

export function getReasonLabel(reason) {
  return reasonLabels[reason] || reason;
}

export async function drawCleaningZoneForDiscordUser(discordUser, guildMember) {
  return updateStore(async (store) => {
    const member = findMemberByDiscordUser(store.members, discordUser, guildMember);
    if (!member) {
      throw new UserFacingError('추첨 인원으로 등록되어 있지 않아요. 관리자에게 `/청소관리 설정패널`에서 인원 등록을 요청해주세요.');
    }

    if (!member.active) {
      throw new UserFacingError(`${member.name}님은 현재 추첨 비활성 상태예요.`);
    }

    const assignmentDate = mondayKey();
    const session = getCurrentDrawSession(store, assignmentDate);
    if (session?.exemptMemberIds?.includes(member.id)) {
      throw new UserFacingError(`${member.name}님은 이번 주 청소 면제 대상이에요.`);
    }

    if (session && Date.now() > Date.parse(session.endsAt)) {
      throw new UserFacingError(buildDrawClosedMessage(store, assignmentDate));
    }

    const alreadyAssigned = store.assignments.find((assignment) => {
      return assignment.assignmentDate === assignmentDate && assignment.memberId === member.id;
    });
    if (alreadyAssigned) {
      throw new UserFacingError(`이미 이번 주 청소 구역을 뽑았어요: ${alreadyAssigned.zone}`);
    }

    const activeZones = store.cleaningZones.filter((item) => item.active);
    const assignedZones = new Set(
      store.assignments
        .filter((assignment) => assignment.assignmentDate === assignmentDate)
        .map((assignment) => assignment.zone),
    );
    const remainingZones = activeZones.filter((item) => !assignedZones.has(item.zone));

    if (remainingZones.length === 0) {
      throw new UserFacingError('이번 주에 남은 청소 구역이 없어요.');
    }

    const preference = store.preferences.find((item) => item.memberId === member.id);
    const preferredCategories = preference?.categories || [];
    const shouldTryPreference = Math.random() < config.preferenceWinRate;
    const preferredPick = shouldTryPreference ? pickPreferredZone(remainingZones, preferredCategories) : null;
    const pickedZone = preferredPick?.zoneItem || pickRandom(remainingZones);
    const reason = preferredPick?.reason || 'random';

    const assignment = {
      assignmentDate,
      memberId: member.id,
      memberName: member.name,
      discordUserId: discordUser.id,
      zone: pickedZone.zone,
      category: pickedZone.category,
      reason,
      createdAt: nowText(),
      imagePath: pickedZone.imagePath || '',
    };

    store.assignments.push(assignment);

    return {
      assignment,
      member,
      imagePath: await resolveImagePath(pickedZone.imagePath),
      remainingCount: remainingZones.length - 1,
    };
  });
}

export function buildResultSummary(assignments, exemptMembers = []) {
  if (assignments.length === 0) {
    return exemptMembers.length === 0
      ? '아직 이번 주 배정 결과가 없어요.'
      : `아직 이번 주 배정 결과가 없어요.\n\n면제 인원\n${formatMemberNames(exemptMembers)}`;
  }

  const assignmentText = assignments
    .map((assignment) => {
      return `- ${assignment.memberName}: ${assignment.zone} (${getReasonLabel(assignment.reason)})`;
    })
    .join('\n');

  if (exemptMembers.length === 0) {
    return assignmentText;
  }

  return `${assignmentText}\n\n면제 인원\n${formatMemberNames(exemptMembers)}`;
}

export function getThisWeekAssignments(store) {
  const assignmentDate = mondayKey();
  return store.assignments.filter((assignment) => assignment.assignmentDate === assignmentDate);
}

export async function resetOldCleaningAssignments() {
  return updateStore((store) => {
    const assignmentDate = mondayKey();
    const beforeCount = store.assignments.length;
    store.assignments = store.assignments.filter((assignment) => assignment.assignmentDate === assignmentDate);
    store.cleaningDrawSessions = Object.fromEntries(
      Object.entries(store.cleaningDrawSessions || {}).filter(([key]) => key === assignmentDate),
    );
    return beforeCount - store.assignments.length;
  });
}

export async function resetCurrentCleaningDraw() {
  return updateStore((store) => {
    const assignmentDate = mondayKey();
    const beforeCount = store.assignments.length;
    store.assignments = store.assignments.filter((assignment) => assignment.assignmentDate !== assignmentDate);
    if (store.cleaningDrawSessions) {
      delete store.cleaningDrawSessions[assignmentDate];
    }
    return beforeCount - store.assignments.length;
  });
}

export async function createCleaningDrawSession(startedAt = new Date()) {
  return updateStore((store) => {
    const assignmentDate = mondayKey(startedAt);
    const activeZones = getActiveZones(store);
    const eligibleMembers = getEligibleMembers(store);
    const exemptCount = Math.max(eligibleMembers.length - activeZones.length, 0);
    const exemptMembers = shuffle(eligibleMembers).slice(0, exemptCount);
    const session = {
      assignmentDate,
      startedAt: startedAt.toISOString(),
      endsAt: new Date(startedAt.getTime() + drawDurationMs).toISOString(),
      exemptMemberIds: exemptMembers.map((member) => member.id),
    };

    store.cleaningDrawSessions = {
      ...(store.cleaningDrawSessions || {}),
      [assignmentDate]: session,
    };

    return {
      session,
      exemptMembers,
      activeZoneCount: activeZones.length,
      eligibleMemberCount: eligibleMembers.length,
    };
  });
}

export async function getThisWeekExemptMembers(store = null) {
  const loadedStore = store || await readStore();
  const assignmentDate = mondayKey();
  const session = getCurrentDrawSession(loadedStore, assignmentDate);
  const exemptIds = new Set(session?.exemptMemberIds || []);
  return loadedStore.members.filter((member) => exemptIds.has(member.id));
}

export async function buildCurrentDrawClosedMessage(store = null) {
  const loadedStore = store || await readStore();
  return buildDrawClosedMessage(loadedStore, mondayKey());
}

export async function resolveAssignmentImagePath(assignment, store = null) {
  if (!assignment) {
    return '';
  }

  const loadedStore = store || await readStore();
  const zone = loadedStore.cleaningZones.find((item) => item.zone === assignment.zone);
  return resolveImagePath(assignment.imagePath || zone?.imagePath);
}

export function findMemberByDiscordUser(members, discordUser, guildMember) {
  const displayName = guildMember?.displayName || discordUser.globalName || discordUser.username;
  const candidates = [
    discordUser.id,
    discordUser.username,
    discordUser.globalName,
    displayName,
  ].filter(Boolean);

  return members.find((member) => {
    return member.discordUserId === discordUser.id
      || candidates.some((candidate) => normalize(candidate) === normalize(member.id))
      || candidates.some((candidate) => normalize(candidate) === normalize(member.name));
  });
}

function getCurrentDrawSession(store, assignmentDate) {
  return store.cleaningDrawSessions?.[assignmentDate] || null;
}

function buildDrawClosedMessage(store, assignmentDate) {
  const remainingZones = getRemainingZones(store, assignmentDate);
  const remainingText = remainingZones.length === 0
    ? '- 남은 구역이 없어요.'
    : remainingZones.map((zone) => `- ${zone.category} - ${zone.zone}`).join('\n');

  return `이번 주 청소 추첨 시간이 종료됐어요.\n\n남은 청소 구역\n${remainingText}`;
}

function getRemainingZones(store, assignmentDate) {
  const assignedZones = new Set(
    store.assignments
      .filter((assignment) => assignment.assignmentDate === assignmentDate)
      .map((assignment) => assignment.zone),
  );
  return getActiveZones(store).filter((zone) => !assignedZones.has(zone.zone));
}

function getActiveZones(store) {
  return store.cleaningZones.filter((zone) => zone.active);
}

function getEligibleMembers(store) {
  return store.members.filter((member) => member.active && member.discordUserId);
}

function formatMemberNames(members) {
  return members.length === 0
    ? '- 없음'
    : members.map((member) => `- ${member.name}`).join('\n');
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function pickPreferredZone(remainingZones, preferredCategories) {
  for (const [index, category] of preferredCategories.entries()) {
    const candidates = remainingZones.filter((zone) => zone.category === category);
    if (candidates.length > 0) {
      return {
        zoneItem: pickRandom(candidates),
        reason: 'preference',
      };
    }
  }

  return null;
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function normalize(value) {
  return String(value || '').trim().toUpperCase();
}

export async function resolveImagePath(imagePath) {
  const value = String(imagePath || '').trim();
  if (!value) {
    return '';
  }

  const candidates = path.isAbsolute(value)
    ? [value]
    : [
      fromProjectRoot(value),
      path.resolve(process.cwd(), value),
    ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next possible project root.
    }
  }

  return '';
}

export class UserFacingError extends Error {}
