import { config } from '../config/env.js';
import { UserFacingError } from '../services/cleaningService.js';
import {
  getCleaningAdminSnapshot,
  setCleaningSchedule,
  setCleaningMember,
  setCleaningZone,
  updateCleaningMember,
  updateCleaningZone,
} from '../services/cleaningAdminService.js';
import { rescheduleCleaningPanel } from '../schedules/cleaningSchedule.js';
import {
  addGatheringVenue,
  assertGatheringChannel,
  getGatheringSnapshot,
  saveGatheringFeedback,
  setGatheringMeetingDate,
  startGatheringVote,
  updateGatheringVenue,
} from '../services/gatheringService.js';
import { isAdmin } from '../utils/permissions.js';
import {
  buildCleaningAdminPanel,
  CLEANING_ADMIN_CUSTOM_IDS,
} from '../ui/cleaningAdminPanel.js';
import {
  buildMemberAdminPanel,
  MEMBER_ADMIN_CUSTOM_IDS,
} from '../ui/memberAdminPanel.js';
import {
  buildGatheringAdminPanel,
  GATHERING_ADMIN_CUSTOM_IDS,
} from '../ui/gatheringAdminPanel.js';
import { buildGatheringVoteMessage } from '../ui/gatheringVotePanel.js';
import { consumeModalContext } from './modalContext.js';

const modalHandlers = new Map([
  [MEMBER_ADMIN_CUSTOM_IDS.memberModal, handleMemberModal],
  [CLEANING_ADMIN_CUSTOM_IDS.zoneModal, handleZoneModal],
  [CLEANING_ADMIN_CUSTOM_IDS.scheduleModal, handleScheduleModal],
  [GATHERING_ADMIN_CUSTOM_IDS.dateModal, handleGatheringDateModal],
  [GATHERING_ADMIN_CUSTOM_IDS.venueModal, handleGatheringVenueModal],
  [GATHERING_ADMIN_CUSTOM_IDS.voteModal, handleGatheringVoteModal],
]);

export async function handleModalSubmitInteraction(interaction) {
  const handler = modalHandlers.get(interaction.customId) || getDynamicModalHandler(interaction.customId);
  if (handler) {
    await handler(interaction);
  }
}

async function handleMemberModal(interaction) {
  assertMemberAdminInteraction(interaction);

  await setCleaningMember({
    id: interaction.fields.getTextInputValue('id'),
    name: interaction.fields.getTextInputValue('name'),
    active: parseBooleanInput(interaction.fields.getTextInputValue('active')),
    discordUserId: interaction.fields.getTextInputValue('discordUserId'),
  });

  await interaction.reply(buildMemberAdminPanel(await getCleaningAdminSnapshot()));
}

async function handleZoneModal(interaction) {
  assertCleaningAdminInteraction(interaction);

  await setCleaningZone({
    category: interaction.fields.getTextInputValue('category'),
    zone: interaction.fields.getTextInputValue('zone'),
    active: parseBooleanInput(interaction.fields.getTextInputValue('active')),
    imagePath: interaction.fields.getTextInputValue('imagePath'),
  });

  await interaction.reply(buildCleaningAdminPanel(await getCleaningAdminSnapshot(), 'zones'));
}

async function handleEditMemberModal(interaction) {
  assertMemberAdminInteraction(interaction);

  const originalMemberId = resolveModalContextValue(interaction.customId, MEMBER_ADMIN_CUSTOM_IDS.editMemberModalPrefix);
  const result = await updateCleaningMember(originalMemberId, {
    id: interaction.fields.getTextInputValue('id'),
    name: interaction.fields.getTextInputValue('name'),
    active: parseBooleanInput(interaction.fields.getTextInputValue('active')),
    discordUserId: interaction.fields.getTextInputValue('discordUserId'),
  });

  await interaction.reply(buildMemberAdminPanel(await getCleaningAdminSnapshot(), { selectedMemberId: result.id }));
}

async function handleEditZoneModal(interaction) {
  assertCleaningAdminInteraction(interaction);

  const originalZoneName = resolveModalContextValue(interaction.customId, CLEANING_ADMIN_CUSTOM_IDS.editZoneModalPrefix);
  await updateCleaningZone(originalZoneName, {
    category: interaction.fields.getTextInputValue('category'),
    zone: interaction.fields.getTextInputValue('zone'),
    active: parseBooleanInput(interaction.fields.getTextInputValue('active')),
    imagePath: interaction.fields.getTextInputValue('imagePath'),
  });

  await interaction.reply(buildCleaningAdminPanel(await getCleaningAdminSnapshot(), 'zones'));
}

async function handleScheduleModal(interaction) {
  assertCleaningAdminInteraction(interaction);

  const schedule = parseScheduleInput(
    interaction.fields.getTextInputValue('weekday'),
    interaction.fields.getTextInputValue('time'),
  );

  const savedSchedule = await setCleaningSchedule(schedule);
  rescheduleCleaningPanel(savedSchedule);

  await interaction.reply(buildCleaningAdminPanel(await getCleaningAdminSnapshot(), 'schedule'));
}

async function handleGatheringDateModal(interaction) {
  assertGatheringAdminInteraction(interaction);

  await setGatheringMeetingDate(interaction.channelId, interaction.fields.getTextInputValue('meetingDate'), {
    feedbackEnabled: parseBooleanInput(interaction.fields.getTextInputValue('feedbackEnabled')),
  });

  await interaction.reply(buildGatheringAdminPanel(await getGatheringSnapshot(interaction.channelId), getChannelName(interaction)));
}

async function handleGatheringVenueModal(interaction) {
  assertGatheringAdminInteraction(interaction);

  await addGatheringVenue(interaction.channelId, {
    name: interaction.fields.getTextInputValue('name'),
    venueUrl: interaction.fields.getTextInputValue('venueUrl'),
    description: interaction.fields.getTextInputValue('description'),
  });

  await interaction.reply(buildGatheringAdminPanel(await getGatheringSnapshot(interaction.channelId), getChannelName(interaction)));
}

async function handleGatheringEditVenueModal(interaction) {
  assertGatheringAdminInteraction(interaction);

  const originalName = resolveModalContextValue(interaction.customId, GATHERING_ADMIN_CUSTOM_IDS.editVenueModalPrefix);
  await updateGatheringVenue(interaction.channelId, originalName, {
    name: interaction.fields.getTextInputValue('name'),
    venueUrl: interaction.fields.getTextInputValue('venueUrl'),
    description: interaction.fields.getTextInputValue('description'),
  });

  await interaction.reply(buildGatheringAdminPanel(await getGatheringSnapshot(interaction.channelId), getChannelName(interaction)));
}

async function handleGatheringVoteModal(interaction) {
  assertGatheringAdminInteraction(interaction);

  const gathering = await startGatheringVote(
    interaction.channelId,
    interaction.fields.getTextInputValue('voteDeadline').trim(),
  );

  await interaction.reply(buildGatheringVoteMessage(gathering, getChannelName(interaction)));
}

async function handleGatheringFeedbackModal(interaction) {
  const channelId = interaction.customId.replace(GATHERING_ADMIN_CUSTOM_IDS.feedbackModalPrefix, '');
  const result = await saveGatheringFeedback(channelId, interaction.user.id, {
    rating: interaction.fields.getTextInputValue('rating'),
    comment: interaction.fields.getTextInputValue('comment'),
  });

  await interaction.reply({
    content: `${result.participant.name}님, 모임 후기를 남겼습니다.`,
  });
}

function assertCleaningAdminInteraction(interaction) {
  if (!isAdmin(interaction)) {
    throw new UserFacingError('청소관리 UI는 관리자만 사용할 수 있어요.');
  }

  if (config.cleaningChannelId && interaction.channelId !== config.cleaningChannelId) {
    throw new UserFacingError('청소관리 UI는 지정된 청소 채널에서만 사용할 수 있어요.');
  }
}

function assertMemberAdminInteraction(interaction) {
  if (!isAdmin(interaction)) {
    throw new UserFacingError('인원관리 UI는 관리자만 사용할 수 있어요.');
  }
}

function assertGatheringAdminInteraction(interaction) {
  if (!isAdmin(interaction)) {
    throw new UserFacingError('모임 설정 UI는 관리자만 사용할 수 있어요.');
  }

  assertGatheringChannel(interaction.channelId);
}

function getChannelName(interaction) {
  return interaction.channel?.name || interaction.channelId;
}

function getDynamicModalHandler(customId) {
  if (customId.startsWith(MEMBER_ADMIN_CUSTOM_IDS.editMemberModalPrefix)) {
    return handleEditMemberModal;
  }

  if (customId.startsWith(CLEANING_ADMIN_CUSTOM_IDS.editZoneModalPrefix)) {
    return handleEditZoneModal;
  }

  if (customId.startsWith(GATHERING_ADMIN_CUSTOM_IDS.editVenueModalPrefix)) {
    return handleGatheringEditVenueModal;
  }

  if (customId.startsWith(GATHERING_ADMIN_CUSTOM_IDS.feedbackModalPrefix)) {
    return handleGatheringFeedbackModal;
  }

  return null;
}

function resolveModalContextValue(customId, prefix) {
  const token = customId.replace(prefix, '');
  return consumeModalContext(token) || decodeURIComponent(token);
}

function parseBooleanInput(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['true', 't', 'yes', 'y', '1', 'on', '활성'].includes(normalized)) {
    return true;
  }

  if (['false', 'f', 'no', 'n', '0', 'off', '비활성'].includes(normalized)) {
    return false;
  }

  throw new UserFacingError('활성 여부는 Y 또는 N으로 입력해주세요.');
}

function parseScheduleInput(weekdayValue, timeValue) {
  const weekday = parseWeekday(weekdayValue);
  const timeMatch = String(timeValue || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!timeMatch) {
    throw new UserFacingError('시간은 HH:mm 형식으로 입력해주세요. 예: 12:55');
  }

  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new UserFacingError('시간은 00:00부터 23:59 사이로 입력해주세요.');
  }

  return { weekday, hour, minute };
}

function parseWeekday(value) {
  const normalized = String(value || '').trim();
  const labels = ['일', '월', '화', '수', '목', '금', '토'];
  const labelIndex = labels.indexOf(normalized.replace(/요일$/, ''));
  if (labelIndex >= 0) {
    return labelIndex;
  }

  const number = Number(normalized);
  if (Number.isInteger(number) && number >= 0 && number <= 6) {
    return number;
  }

  throw new UserFacingError('요일은 일/월/화/수/목/금/토 또는 0~6으로 입력해주세요.');
}
