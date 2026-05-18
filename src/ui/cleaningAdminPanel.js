import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { createModalContext } from '../interactions/modalContext.js';

export const CLEANING_ADMIN_CUSTOM_IDS = {
  panel: 'cleaning-admin:panel',
  viewSummary: 'cleaning-admin:view-summary',
  viewMembers: 'cleaning-admin:view-members',
  viewZones: 'cleaning-admin:view-zones',
  viewSchedule: 'cleaning-admin:view-schedule',
  addMember: 'cleaning-admin:add-member',
  addZone: 'cleaning-admin:add-zone',
  editSchedule: 'cleaning-admin:edit-schedule',
  resetDraw: 'cleaning-admin:reset-draw',
  refresh: 'cleaning-admin:refresh',
  editMemberSelect: 'cleaning-admin:edit-member-select',
  editZoneSelect: 'cleaning-admin:edit-zone-select',
  memberModal: 'cleaning-admin:member-modal',
  editMemberModalPrefix: 'cleaning-admin:edit-member-modal:',
  zoneModal: 'cleaning-admin:zone-modal',
  editZoneModalPrefix: 'cleaning-admin:edit-zone-modal:',
  scheduleModal: 'cleaning-admin:schedule-modal',
};

export function buildCleaningAdminPanel(snapshot, view = 'summary') {
  const activeMembers = snapshot.members.filter((member) => member.active);
  const activeZones = snapshot.zones.filter((zone) => zone.active);

  if (view === 'members') {
    return buildMembersPanel(snapshot, activeMembers);
  }

  if (view === 'zones') {
    return buildZonesPanel(snapshot, activeZones);
  }

  if (view === 'schedule') {
    return buildSchedulePanel(snapshot);
  }

  const content = [
    '**청소관리 패널**',
    `추첨 완료 인원: ${snapshot.drawProgress?.completedCount || 0}/${snapshot.drawProgress?.targetCount || 0}`,
    '',
    '**활성 인원**',
    formatList(activeMembers.map((member) => member.name), 8),
    '',
    '**카테고리별 활성 구역**',
    formatCategorySummary(activeZones),
  ].join('\n');

  return {
    content,
    components: [
      buildNavigationRow('summary'),
      buildResetDrawRow(),
    ],
    flags: MessageFlags.Ephemeral,
  };
}

function buildSchedulePanel(snapshot) {
  return {
    content: [
      '**청소관리 - 스케줄**',
      formatScheduleText(snapshot.schedule),
      '',
      `요일 값: ${snapshot.schedule.weekday}`,
      `시간 값: ${String(snapshot.schedule.hour).padStart(2, '0')}:${String(snapshot.schedule.minute).padStart(2, '0')}`,
    ].join('\n'),
    components: [
      buildNavigationRow('schedule'),
      buildScheduleActionRow(),
      buildResetDrawRow(),
    ],
    flags: MessageFlags.Ephemeral,
  };
}

function buildMembersPanel(snapshot, activeMembers) {
  return {
    content: [
      '**청소관리 - 인원**',
      `활성 인원: ${activeMembers.length}/${snapshot.members.length}`,
      '',
      formatMemberList(snapshot.members),
    ].join('\n'),
    components: [
      buildNavigationRow('members'),
      buildMemberActionRow(),
      buildMemberSelectRow(snapshot.members),
      buildResetDrawRow(),
    ].filter(Boolean),
    flags: MessageFlags.Ephemeral,
  };
}

function buildZonesPanel(snapshot, activeZones) {
  return {
    content: [
      '**청소관리 - 구역**',
      `활성 구역: ${activeZones.length}/${snapshot.zones.length}`,
      '',
      formatZoneList(snapshot.zones),
    ].join('\n'),
    components: [
      buildNavigationRow('zones'),
      buildZoneActionRow(),
      buildZoneSelectRow(snapshot.zones),
      buildResetDrawRow(),
    ].filter(Boolean),
    flags: MessageFlags.Ephemeral,
  };
}

export function buildMemberModal(member = null) {
  const contextToken = member ? createModalContext(member.id) : '';

  return new ModalBuilder()
    .setCustomId(member ? `${CLEANING_ADMIN_CUSTOM_IDS.editMemberModalPrefix}${contextToken}` : CLEANING_ADMIN_CUSTOM_IDS.memberModal)
    .setTitle(member ? '추첨 인원 수정' : '추첨 인원 추가')
    .addComponents(
      buildTextInputRow('id', '멤버 ID', 'Andy', true, member?.id),
      buildTextInputRow('name', '표시 이름', 'Andy', true, member?.name),
      buildTextInputRow('active', '활성 여부', 'Y 또는 N', true, member ? formatActiveInput(member.active) : 'Y'),
      buildTextInputRow('discordUserId', '디스코드 유저 ID', '비워두면 변경 안 함', false, member?.discordUserId),
    );
}

export function buildZoneModal(zone = null) {
  const contextToken = zone ? createModalContext(zone.zone) : '';

  return new ModalBuilder()
    .setCustomId(zone ? `${CLEANING_ADMIN_CUSTOM_IDS.editZoneModalPrefix}${contextToken}` : CLEANING_ADMIN_CUSTOM_IDS.zoneModal)
    .setTitle(zone ? '청소 구역 수정' : '청소 구역 추가')
    .addComponents(
      buildTextInputRow('category', '카테고리', '먼지', true, zone?.category),
      buildTextInputRow('zone', '구역명', '먼지 A(공용컴)', true, zone?.zone),
      buildTextInputRow('active', '활성 여부', 'Y 또는 N', true, zone ? formatActiveInput(zone.active) : 'Y'),
      buildTextInputRow('imagePath', '이미지 경로', 'assets/cleaning-zones/dust-a.png', false, zone?.imagePath),
    );
}

export function buildScheduleModal(schedule) {
  return new ModalBuilder()
    .setCustomId(CLEANING_ADMIN_CUSTOM_IDS.scheduleModal)
    .setTitle('청소 추첨 스케줄 변경')
    .addComponents(
      buildTextInputRow('weekday', '요일', '월 또는 1 (일=0, 월=1 ... 토=6)', true, formatWeekdayInput(schedule.weekday)),
      buildTextInputRow('time', '시간', '12:55', true, `${String(schedule.hour).padStart(2, '0')}:${String(schedule.minute).padStart(2, '0')}`),
    );
}

function buildMemberSelectRow(members) {
  const options = members.slice(0, 25).map((member) => ({
    label: `${member.active ? 'ON' : 'OFF'} ${member.name}`,
    description: member.id,
    value: member.id,
  }));

  if (options.length === 0) {
    return null;
  }

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(CLEANING_ADMIN_CUSTOM_IDS.editMemberSelect)
      .setPlaceholder('수정할 인원 선택')
      .addOptions(options),
  );
}

function buildZoneSelectRow(zones) {
  const options = zones.slice(0, 25).map((zone) => ({
    label: `${zone.active ? 'ON' : 'OFF'} ${zone.zone}`.slice(0, 100),
    description: zone.category.slice(0, 100),
    value: zone.zone,
  }));

  if (options.length === 0) {
    return null;
  }

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(CLEANING_ADMIN_CUSTOM_IDS.editZoneSelect)
      .setPlaceholder('수정할 구역 선택')
      .addOptions(options),
  );
}

function buildNavigationRow(currentView) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CLEANING_ADMIN_CUSTOM_IDS.viewSummary)
      .setLabel('요약')
      .setStyle(currentView === 'summary' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(currentView === 'summary'),
    new ButtonBuilder()
      .setCustomId(CLEANING_ADMIN_CUSTOM_IDS.viewMembers)
      .setLabel('인원')
      .setStyle(currentView === 'members' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(currentView === 'members'),
    new ButtonBuilder()
      .setCustomId(CLEANING_ADMIN_CUSTOM_IDS.viewZones)
      .setLabel('구역')
      .setStyle(currentView === 'zones' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(currentView === 'zones'),
    new ButtonBuilder()
      .setCustomId(CLEANING_ADMIN_CUSTOM_IDS.viewSchedule)
      .setLabel('스케줄')
      .setStyle(currentView === 'schedule' ? ButtonStyle.Primary : ButtonStyle.Secondary)
      .setDisabled(currentView === 'schedule'),
    new ButtonBuilder()
      .setCustomId(CLEANING_ADMIN_CUSTOM_IDS.refresh)
      .setLabel('새로고침')
      .setStyle(ButtonStyle.Secondary),
  );
}

function buildResetDrawRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CLEANING_ADMIN_CUSTOM_IDS.resetDraw)
      .setLabel('추첨 결과 초기화')
      .setStyle(ButtonStyle.Danger),
  );
}

function buildMemberActionRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CLEANING_ADMIN_CUSTOM_IDS.addMember)
      .setLabel('인원 추가')
      .setStyle(ButtonStyle.Primary),
  );
}

function buildZoneActionRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CLEANING_ADMIN_CUSTOM_IDS.addZone)
      .setLabel('구역 추가')
      .setStyle(ButtonStyle.Primary),
  );
}

function buildScheduleActionRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(CLEANING_ADMIN_CUSTOM_IDS.editSchedule)
      .setLabel('스케줄 변경')
      .setStyle(ButtonStyle.Primary),
  );
}

function buildTextInputRow(customId, label, placeholder, required, value = '') {
  const input = new TextInputBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setPlaceholder(placeholder)
    .setRequired(required)
    .setStyle(TextInputStyle.Short);

  if (value) {
    input.setValue(value);
  }

  return new ActionRowBuilder().addComponents(
    input,
  );
}

function formatList(values, limit = 12) {
  if (values.length === 0) {
    return '- 없음';
  }

  return values.slice(0, limit).map((value) => `- ${value}`).join('\n')
    + (values.length > limit ? `\n- 외 ${values.length - limit}개` : '');
}

function formatCategorySummary(zones) {
  if (zones.length === 0) {
    return '- 없음';
  }

  const counts = zones.reduce((result, zone) => {
    result[zone.category] = (result[zone.category] || 0) + 1;
    return result;
  }, {});

  return Object.entries(counts)
    .map(([category, count]) => `- ${category}: ${count}개`)
    .join('\n');
}

function formatMemberList(members) {
  return formatList(members.map((member) => {
    const state = member.active ? 'ON' : 'OFF';
    const linked = member.discordUserId ? '연결됨' : '미연결';
    return `[${state}] ${member.name} (${member.id}, ${linked})`;
  }), 20);
}

function formatZoneList(zones) {
  return formatList(zones.map((zone) => {
    const state = zone.active ? 'ON' : 'OFF';
    return `[${state}] ${zone.category} - ${zone.zone}`;
  }), 20);
}

function formatScheduleText(schedule) {
  return `현재 예약: 매주 ${weekdayLabels[schedule.weekday]}요일 ${String(schedule.hour).padStart(2, '0')}:${String(schedule.minute).padStart(2, '0')}`;
}

function formatActiveInput(active) {
  return active ? 'Y' : 'N';
}

function formatWeekdayInput(weekday) {
  return weekdayLabels[weekday] || String(weekday);
}

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];
