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
import { formatDateWithWeekday } from '../utils/date.js';
import { formatVenueList } from './venueFormatters.js';

export const GATHERING_ADMIN_CUSTOM_IDS = {
  editDate: 'gathering-admin:edit-date',
  addVenue: 'gathering-admin:add-venue',
  editVenueSelect: 'gathering-admin:edit-venue-select',
  editSelectedVenuePrefix: 'gathering-admin:edit-selected-venue:',
  clearVenues: 'gathering-admin:clear-venues',
  startVote: 'gathering-admin:start-vote',
  resetVoteStatus: 'gathering-admin:reset-vote-status',
  reset: 'gathering-admin:reset',
  refresh: 'gathering-admin:refresh',
  dateModal: 'gathering-admin:date-modal',
  venueModal: 'gathering-admin:venue-modal',
  editVenueModalPrefix: 'gathering-admin:edit-venue-modal:',
  voteModal: 'gathering-admin:vote-modal',
};

export function buildGatheringAdminPanel(gathering, channelName, options = {}) {
  const selectedVenue = options.selectedVenueName
    ? gathering.venueOptions.find((venue) => venue.name === options.selectedVenueName)
    : null;
  const components = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(GATHERING_ADMIN_CUSTOM_IDS.editDate)
        .setLabel('모임일 설정')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(GATHERING_ADMIN_CUSTOM_IDS.addVenue)
        .setLabel('후보 추가')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(GATHERING_ADMIN_CUSTOM_IDS.clearVenues)
        .setLabel('후보 초기화')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(GATHERING_ADMIN_CUSTOM_IDS.startVote)
        .setLabel('투표 시작')
        .setStyle(ButtonStyle.Success),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(GATHERING_ADMIN_CUSTOM_IDS.refresh)
        .setLabel('새로고침')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(GATHERING_ADMIN_CUSTOM_IDS.resetVoteStatus)
        .setLabel('투표 현황 리셋')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(GATHERING_ADMIN_CUSTOM_IDS.reset)
        .setLabel('초기화')
        .setStyle(ButtonStyle.Danger),
    ),
    buildVenueEditSelectRow(gathering, selectedVenue?.name),
    buildSelectedVenueActionRow(selectedVenue),
  ].filter(Boolean);

  return {
    content: [
      `**[${channelName}] 모임 설정 패널**`,
      '',
      '**일정**',
      `모임일: ${formatDateWithWeekday(gathering.meetingDate)}`,
      `투표 마감: ${formatDateWithWeekday(gathering.voteDeadline)}`,
      '',
      '**모임 장소 후보**',
      formatVenueList(gathering),
      selectedVenue ? `\n선택됨: ${selectedVenue.name}` : '\n선택된 후보: 없음',
      '',
      '**참여/투표**',
      `참여자: ${gathering.participants.length}명`,
      `투표수: ${Object.keys(gathering.votes || {}).length}표`,
    ].join('\n'),
    components,
    flags: MessageFlags.Ephemeral,
  };
}

export function buildGatheringDateModal(gathering) {
  return new ModalBuilder()
    .setCustomId(GATHERING_ADMIN_CUSTOM_IDS.dateModal)
    .setTitle('모임일 설정')
    .addComponents(
      buildTextInputRow('meetingDate', '모임일', 'YYYY-MM-DD', true, gathering.meetingDate),
    );
}

export function buildGatheringVenueModal() {
  return new ModalBuilder()
    .setCustomId(GATHERING_ADMIN_CUSTOM_IDS.venueModal)
    .setTitle('모임 장소 후보 추가')
    .addComponents(
      buildTextInputRow('name', '장소명', '정면', true),
      buildTextInputRow('venueUrl', '장소 URL', 'https://...', false),
      buildTextInputRow('description', '장소 설명', '한국식 쌀국수 / 어린이대공원 / 예약 필요', false, '', TextInputStyle.Paragraph),
    );
}

export function buildGatheringEditVenueModal(venue) {
  const contextToken = createModalContext(venue.name);

  return new ModalBuilder()
    .setCustomId(`${GATHERING_ADMIN_CUSTOM_IDS.editVenueModalPrefix}${contextToken}`)
    .setTitle('모임 장소 후보 수정')
    .addComponents(
      buildTextInputRow('name', '장소명', '정면', true, venue.name),
      buildTextInputRow('venueUrl', '장소 URL', 'https://...', false, venue.venueUrl),
      buildTextInputRow('description', '장소 설명', '한국식 쌀국수 / 어린이대공원 / 예약 필요', false, venue.description, TextInputStyle.Paragraph),
    );
}

export function buildGatheringVoteModal(gathering) {
  return new ModalBuilder()
    .setCustomId(GATHERING_ADMIN_CUSTOM_IDS.voteModal)
    .setTitle('투표 시작')
    .addComponents(
      buildTextInputRow('voteDeadline', '투표 마감일', 'YYYY-MM-DD', true, gathering.voteDeadline),
    );
}

function buildTextInputRow(customId, label, placeholder, required, value = '', style = TextInputStyle.Short) {
  const input = new TextInputBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setPlaceholder(placeholder)
    .setRequired(required)
    .setStyle(style);

  if (value) {
    input.setValue(value);
  }

  return new ActionRowBuilder().addComponents(input);
}

function buildVenueEditSelectRow(gathering, selectedVenueName = '') {
  if (gathering.venueOptions.length === 0) {
    return null;
  }

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(GATHERING_ADMIN_CUSTOM_IDS.editVenueSelect)
      .setPlaceholder('수정할 후보 선택')
      .addOptions(gathering.venueOptions.slice(0, 25).map((venue) => ({
        label: venue.name.slice(0, 100),
        description: venue.description ? venue.description.slice(0, 100) : undefined,
        value: venue.name,
        default: venue.name === selectedVenueName,
      }))),
  );
}

function buildSelectedVenueActionRow(venue) {
  if (!venue) {
    return null;
  }

  const contextToken = createModalContext(venue.name);
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${GATHERING_ADMIN_CUSTOM_IDS.editSelectedVenuePrefix}${contextToken}`)
      .setLabel('선택한 후보 수정')
      .setStyle(ButtonStyle.Secondary),
  );
}
