import { config } from '../config/env.js';
import { UserFacingError } from './cleaningService.js';
import { formatDateWithWeekday, todayKey } from '../utils/date.js';
import { readStore, updateStore } from '../data/store.js';

export function assertGatheringChannel(channelId) {
  if (config.gatheringChannelIds.length > 0 && !config.gatheringChannelIds.includes(channelId)) {
    throw new UserFacingError('모임 명령어는 지정된 모임 채널에서만 사용할 수 있어요.');
  }
}

export async function setGatheringMeetingDate(channelId, meetingDate) {
  validateDateKey(meetingDate, '모임일');

  if (meetingDate < todayKey()) {
    throw new UserFacingError('모임일은 오늘 이전 날짜로 설정할 수 없어요.');
  }

  await updateStore((store) => {
    const gathering = getFreshGatheringForChannel(store, channelId);
    gathering.meetingDate = meetingDate;
    gathering.voteResultAnnouncedAt = '';
  });
}

export async function addGatheringVenue(channelId, venue) {
  const name = String(venue.name || '').trim();
  const description = String(venue.description || '').trim();
  const venueUrl = String(venue.venueUrl || '').trim();

  if (!name) {
    throw new UserFacingError('장소명을 1개 이상 입력해주세요.');
  }

  await updateStore((store) => {
    const gathering = getFreshGatheringForChannel(store, channelId);
    const existing = gathering.venueOptions.find((item) => item.name === name);
    if (existing) {
      existing.description = description;
      existing.venueUrl = venueUrl;
    } else {
      gathering.venueOptions.push({ name, description, venueUrl });
    }
  });
}

export async function updateGatheringVenue(channelId, originalName, venue) {
  const nextName = String(venue.name || '').trim();
  const description = String(venue.description || '').trim();
  const venueUrl = String(venue.venueUrl || '').trim();

  if (!nextName) {
    throw new UserFacingError('장소명을 입력해주세요.');
  }

  await updateStore((store) => {
    const gathering = getFreshGatheringForChannel(store, channelId);
    const index = gathering.venueOptions.findIndex((item) => item.name === originalName);
    if (index < 0) {
      throw new UserFacingError(`수정할 후보를 찾을 수 없어요: ${originalName}`);
    }

    const duplicated = gathering.venueOptions.some((item) => item.name === nextName && item.name !== originalName);
    if (duplicated) {
      throw new UserFacingError(`이미 같은 이름의 후보가 있어요: ${nextName}`);
    }

    gathering.venueOptions[index] = { name: nextName, description, venueUrl };
    if (originalName !== nextName) {
      gathering.votes = Object.fromEntries(
        Object.entries(gathering.votes || {}).map(([userId, votedVenue]) => [
          userId,
          votedVenue === originalName ? nextName : votedVenue,
        ]),
      );
    }
  });
}

export async function getGatheringVenue(channelId, venueName) {
  const gathering = await getGatheringSnapshot(channelId);
  return gathering.venueOptions.find((venue) => venue.name === venueName) || null;
}

export async function clearGatheringVenues(channelId) {
  await updateStore((store) => {
    const gathering = getFreshGatheringForChannel(store, channelId);
    gathering.venueOptions = [];
    gathering.votes = {};
  });
}

export async function getGatheringSnapshot(channelId) {
  return updateStore((store) => {
    const gathering = getFreshGatheringForChannel(store, channelId);
    return cloneGathering(gathering);
  });
}

export async function startGatheringVote(channelId, voteDeadline = '') {
  if (voteDeadline) {
    validateDateKey(voteDeadline, '투표 마감일');
  }

  return updateStore((store) => {
    const gathering = getFreshGatheringForChannel(store, channelId);
    assertMeetingConfigured(gathering);

    if (voteDeadline && voteDeadline < todayKey()) {
      throw new UserFacingError('투표 마감일은 오늘 이전 날짜로 설정할 수 없어요.');
    }

    if (gathering.venueOptions.length === 0) {
      throw new UserFacingError('먼저 `/모임설정`에서 투표에 올릴 장소명을 설정해주세요.');
    }

    if (voteDeadline && voteDeadline > gathering.meetingDate) {
      throw new UserFacingError('투표 마감일은 모임일을 넘어갈 수 없어요.');
    }

    gathering.voteDeadline = voteDeadline;
    gathering.voteResultAnnouncedAt = '';

    return cloneGathering(gathering);
  });
}

export async function voteGatheringVenue(channelId, participant, venue) {
  await updateStore((store) => {
    const gathering = getFreshGatheringForChannel(store, channelId);
    assertMeetingConfigured(gathering);

    if (isVoteClosed(gathering)) {
      throw new UserFacingError('투표 마감일이 지나 투표할 수 없어요.');
    }

    if (!gathering.venueOptions.some((item) => item.name === venue)) {
      throw new UserFacingError('현재 후보에 없는 장소명이에요.');
    }

    gathering.votes[participant.discordUserId] = venue;
    addParticipant(gathering, participant);
  });
}

export async function joinGathering(channelId, participant) {
  await updateStore((store) => {
    const gathering = getFreshGatheringForChannel(store, channelId);
    assertMeetingConfigured(gathering);

    addParticipant(gathering, participant);
  });
}

export async function leaveGathering(channelId, discordUserId) {
  await updateStore((store) => {
    const gathering = getFreshGatheringForChannel(store, channelId);
    gathering.participants = gathering.participants
      .filter((item) => item.discordUserId !== discordUserId);
    delete gathering.votes[discordUserId];
  });
}

export async function resetGathering(channelId) {
  await updateStore((store) => {
    store.gatheringsByChannel[channelId] = createEmptyGathering();
  });
}

export async function getGatheringSummary(channelId, channelName = '') {
  return updateStore((store) => {
    return buildGatheringSummary(getFreshGatheringForChannel(store, channelId), channelName);
  });
}

export async function consumeClosedGatheringVoteResults() {
  return updateStore((store) => {
    const results = [];
    const gatheringsByChannel = store.gatheringsByChannel || {};

    Object.entries(gatheringsByChannel).forEach(([channelId, rawGathering]) => {
      const gathering = normalizeGathering(rawGathering);
      if (isPastMeeting(gathering) || !isVoteClosed(gathering) || gathering.voteResultAnnouncedAt) {
        return;
      }

      gathering.voteResultAnnouncedAt = new Date().toISOString();
      results.push({
        channelId,
        gathering: cloneGathering(gathering),
      });
    });

    return results;
  });
}

function getGatheringForChannel(store, channelId) {
  if (!store.gatheringsByChannel) {
    store.gatheringsByChannel = {};
  }

  if (!store.gatheringsByChannel[channelId]) {
    store.gatheringsByChannel[channelId] = createEmptyGathering();
  }

  return normalizeGathering(store.gatheringsByChannel[channelId]);
}

function getFreshGatheringForChannel(store, channelId) {
  const gathering = getGatheringForChannel(store, channelId);
  if (isPastMeeting(gathering)) {
    store.gatheringsByChannel[channelId] = createEmptyGathering();
    return store.gatheringsByChannel[channelId];
  }

  return gathering;
}

function createEmptyGathering() {
  return {
    meetingDate: '',
    voteDeadline: '',
    venueOptions: [],
    participants: [],
    votes: {},
    voteResultAnnouncedAt: '',
  };
}

function cloneGathering(gathering) {
  return {
    meetingDate: gathering.meetingDate,
    voteDeadline: gathering.voteDeadline,
    venueOptions: gathering.venueOptions.map((venue) => ({ ...venue })),
    participants: gathering.participants.map((participant) => ({ ...participant })),
    votes: { ...gathering.votes },
    voteResultAnnouncedAt: gathering.voteResultAnnouncedAt || '',
  };
}

function normalizeGathering(gathering) {
  if (!gathering.venueOptions) {
    gathering.venueOptions = gathering.pollOptions || [];
  }
  gathering.venueOptions = gathering.venueOptions.map((venue) => {
    if (typeof venue === 'string') {
      return { name: venue, description: '', venueUrl: '' };
    }

    return {
      name: String(venue.name || '').trim(),
      description: String(venue.description || '').trim(),
      venueUrl: String(venue.venueUrl || venue.url || '').trim(),
    };
  }).filter((venue) => venue.name);
  if (!gathering.participants) {
    gathering.participants = [];
  }
  if (!gathering.meetingDate) {
    gathering.meetingDate = '';
  }
  if (!gathering.voteDeadline) {
    gathering.voteDeadline = '';
  }
  if (!gathering.votes) {
    gathering.votes = {};
  }
  if (!gathering.voteResultAnnouncedAt) {
    gathering.voteResultAnnouncedAt = '';
  }
  delete gathering.pollOptions;
  return gathering;
}

function addParticipant(gathering, participant) {
  const exists = gathering.participants.some((item) => item.discordUserId === participant.discordUserId);
  if (!exists) {
    gathering.participants.push(participant);
    return;
  }

  gathering.participants = gathering.participants.map((item) => {
    return item.discordUserId === participant.discordUserId
      ? { ...item, name: participant.name || item.name }
      : item;
  });
}

function buildGatheringSummary(gathering, channelName) {
  const schedule = [
    `모임일: ${formatDateWithWeekday(gathering.meetingDate)}`,
    `투표 마감: ${formatDateWithWeekday(gathering.voteDeadline)}`,
  ].join('\n');
  const options = gathering.venueOptions.length
    ? gathering.venueOptions.map((venue) => {
      const venueUrl = venue.venueUrl ? ` ${venue.venueUrl}` : '';
      const description = venue.description ? `\n  ${venue.description.replace(/\n/g, '\n  ')}` : '';
      return `- ${venue.name}: ${countVotes(gathering, venue.name)}표${venueUrl}${description}`;
    }).join('\n')
    : '- 아직 모임 장소 후보가 없어요.';
  const participants = gathering.participants.length
    ? gathering.participants.map((item) => `- ${item.name}`).join('\n')
    : '- 아직 참가자가 없어요.';

  const title = channelName ? `[${channelName}] 모임 현황` : '모임 현황';
  return `${title}\n\n모임 일정\n${schedule}\n\n모임 장소 후보\n${options}\n\n참가자\n${participants}`;
}

function assertMeetingConfigured(gathering) {
  if (!gathering.meetingDate) {
    throw new UserFacingError('먼저 `/모임설정`에서 모임일을 설정해주세요.');
  }
}

function isPastMeeting(gathering) {
  return Boolean(gathering.meetingDate && gathering.meetingDate < todayKey());
}

function isVoteClosed(gathering) {
  return Boolean(gathering.voteDeadline && gathering.voteDeadline < todayKey());
}

function countVotes(gathering, venue) {
  return Object.values(gathering.votes || {}).filter((votedVenue) => votedVenue === venue).length;
}

function validateDateKey(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) {
    throw new UserFacingError(`${label}은 YYYY-MM-DD 형식으로 입력해주세요.`);
  }
}
