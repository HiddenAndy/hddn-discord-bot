import { AttachmentBuilder, MessageFlags } from 'discord.js';
import { config } from '../config/env.js';
import {
  buildCurrentDrawClosedMessage,
  CLEANING_DRAW_BUTTON_ID,
  createCleaningDrawSession,
  drawCleaningZoneForDiscordUser,
  getReasonLabel,
  resetCurrentCleaningDraw,
  resetOldCleaningAssignments,
  UserFacingError,
} from '../services/cleaningService.js';
import {
  getCleaningAdminSnapshot,
} from '../services/cleaningAdminService.js';
import {
  assertGatheringChannel,
  clearGatheringVenues,
  getGatheringSnapshot,
  joinGathering,
  leaveGathering,
  resetGathering,
} from '../services/gatheringService.js';
import { isAdmin } from '../utils/permissions.js';
import {
  buildCleaningAdminPanel,
  buildMemberModal,
  buildScheduleModal,
  buildZoneModal,
  CLEANING_ADMIN_CUSTOM_IDS,
} from '../ui/cleaningAdminPanel.js';
import { buildCleaningPanelMessage } from '../ui/cleaningPanel.js';
import {
  buildGatheringAdminPanel,
  buildGatheringDateModal,
  buildGatheringVenueModal,
  buildGatheringVoteModal,
  GATHERING_ADMIN_CUSTOM_IDS,
} from '../ui/gatheringAdminPanel.js';
import {
  buildGatheringResultPanel,
  GATHERING_RESULT_CUSTOM_IDS,
} from '../ui/gatheringResultPanel.js';
import { TEST_PANEL_CUSTOM_IDS } from '../ui/testPanels.js';

const buttonHandlers = new Map([
  [CLEANING_DRAW_BUTTON_ID, handleCleaningDrawButton],
  [CLEANING_ADMIN_CUSTOM_IDS.viewSummary, handleViewSummaryButton],
  [CLEANING_ADMIN_CUSTOM_IDS.viewMembers, handleViewMembersButton],
  [CLEANING_ADMIN_CUSTOM_IDS.viewZones, handleViewZonesButton],
  [CLEANING_ADMIN_CUSTOM_IDS.viewSchedule, handleViewScheduleButton],
  [CLEANING_ADMIN_CUSTOM_IDS.addMember, handleAddMemberButton],
  [CLEANING_ADMIN_CUSTOM_IDS.addZone, handleAddZoneButton],
  [CLEANING_ADMIN_CUSTOM_IDS.editSchedule, handleEditScheduleButton],
  [CLEANING_ADMIN_CUSTOM_IDS.resetDraw, handleResetCleaningDrawButton],
  [CLEANING_ADMIN_CUSTOM_IDS.refresh, handleRefreshAdminPanelButton],
  [GATHERING_ADMIN_CUSTOM_IDS.editDate, handleGatheringDateButton],
  [GATHERING_ADMIN_CUSTOM_IDS.addVenue, handleGatheringVenueButton],
  [GATHERING_ADMIN_CUSTOM_IDS.clearVenues, handleGatheringClearVenuesButton],
  [GATHERING_ADMIN_CUSTOM_IDS.startVote, handleGatheringVoteButton],
  [GATHERING_ADMIN_CUSTOM_IDS.reset, handleGatheringResetButton],
  [GATHERING_ADMIN_CUSTOM_IDS.refresh, handleGatheringRefreshButton],
  [GATHERING_RESULT_CUSTOM_IDS.join, handleGatheringResultJoinButton],
  [GATHERING_RESULT_CUSTOM_IDS.leave, handleGatheringResultLeaveButton],
  [TEST_PANEL_CUSTOM_IDS.gatheringResultPrivate, handleGatheringTestResultPrivateButton],
  [TEST_PANEL_CUSTOM_IDS.gatheringResultPublic, handleGatheringTestResultPublicButton],
  [TEST_PANEL_CUSTOM_IDS.cleaningDrawPanel, handleCleaningTestDrawPanelButton],
  [TEST_PANEL_CUSTOM_IDS.cleaningClosedMessage, handleCleaningTestClosedMessageButton],
  [TEST_PANEL_CUSTOM_IDS.lunchRecommend, handleLunchTestRecommendButton],
]);

export async function handleButtonInteraction(interaction) {
  const handler = buttonHandlers.get(interaction.customId);
  if (handler) {
    await handler(interaction);
  }
}

async function handleCleaningDrawButton(interaction) {
  if (config.cleaningChannelId && interaction.channelId !== config.cleaningChannelId) {
    throw new UserFacingError('청소 추첨 버튼은 지정된 청소 채널에서만 사용할 수 있어요.');
  }

  const result = await drawCleaningZoneForDiscordUser(interaction.user, interaction.member);
  const reasonLabel = getReasonLabel(result.assignment.reason);
  const publicMessage = `${result.member.name}님이 ${result.assignment.zone} (${reasonLabel}) 뽑았습니다. 남은 구역: ${result.remainingCount}개`;
  const privateMessage = `${result.member.name}님, 이번 주 청소 구역은 "${result.assignment.zone}"입니다.\n배정 방식: ${reasonLabel}`;

  const files = result.imagePath ? [new AttachmentBuilder(result.imagePath)] : [];
  await interaction.reply({ content: privateMessage, files, flags: MessageFlags.Ephemeral });
  await interaction.channel?.send(publicMessage);
}

async function handleAddMemberButton(interaction) {
  assertCleaningAdminInteraction(interaction);
  await interaction.showModal(buildMemberModal());
}

async function handleAddZoneButton(interaction) {
  assertCleaningAdminInteraction(interaction);
  await interaction.showModal(buildZoneModal());
}

async function handleEditScheduleButton(interaction) {
  assertCleaningAdminInteraction(interaction);
  const snapshot = await getCleaningAdminSnapshot();
  await interaction.showModal(buildScheduleModal(snapshot.schedule));
}

async function handleRefreshAdminPanelButton(interaction) {
  assertCleaningAdminInteraction(interaction);
  await interaction.update(buildCleaningAdminPanel(await getCleaningAdminSnapshot(), getViewFromMessage(interaction)));
}

async function handleViewSummaryButton(interaction) {
  assertCleaningAdminInteraction(interaction);
  await interaction.update(buildCleaningAdminPanel(await getCleaningAdminSnapshot(), 'summary'));
}

async function handleViewMembersButton(interaction) {
  assertCleaningAdminInteraction(interaction);
  await interaction.update(buildCleaningAdminPanel(await getCleaningAdminSnapshot(), 'members'));
}

async function handleViewZonesButton(interaction) {
  assertCleaningAdminInteraction(interaction);
  await interaction.update(buildCleaningAdminPanel(await getCleaningAdminSnapshot(), 'zones'));
}

async function handleViewScheduleButton(interaction) {
  assertCleaningAdminInteraction(interaction);
  await interaction.update(buildCleaningAdminPanel(await getCleaningAdminSnapshot(), 'schedule'));
}

async function handleResetCleaningDrawButton(interaction) {
  assertCleaningAdminInteraction(interaction);
  const removedCount = await resetCurrentCleaningDraw();
  await interaction.update(buildCleaningAdminPanel(await getCleaningAdminSnapshot(), getViewFromMessage(interaction)));
  await interaction.followUp({
    content: `이번 주 추첨 결과를 초기화했어요. 삭제된 배정: ${removedCount}개`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleCleaningTestClosedMessageButton(interaction) {
  assertCleaningAdminInteraction(interaction);
  await interaction.update({
    content: await buildCurrentDrawClosedMessage(),
    components: [],
  });
}

async function handleCleaningTestDrawPanelButton(interaction) {
  assertCleaningAdminInteraction(interaction);
  await resetOldCleaningAssignments();
  const drawSession = await createCleaningDrawSession();
  await interaction.channel?.send(buildCleaningPanelMessage(drawSession));
  await interaction.update({
    content: '청소 추첨 패널을 현재 채널에 올렸어요.',
    components: [],
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

function getViewFromMessage(interaction) {
  const content = interaction.message?.content || '';
  if (content.includes('청소관리 - 인원')) {
    return 'members';
  }

  if (content.includes('청소관리 - 구역')) {
    return 'zones';
  }

  if (content.includes('청소관리 - 스케줄')) {
    return 'schedule';
  }

  return 'summary';
}

async function handleGatheringDateButton(interaction) {
  assertGatheringAdminInteraction(interaction);
  await interaction.showModal(buildGatheringDateModal(await getGatheringSnapshot(interaction.channelId)));
}

async function handleGatheringVenueButton(interaction) {
  assertGatheringAdminInteraction(interaction);
  await interaction.showModal(buildGatheringVenueModal());
}

async function handleGatheringClearVenuesButton(interaction) {
  assertGatheringAdminInteraction(interaction);
  await clearGatheringVenues(interaction.channelId);
  await interaction.update(buildGatheringAdminPanel(await getGatheringSnapshot(interaction.channelId), getChannelName(interaction)));
}

async function handleGatheringVoteButton(interaction) {
  assertGatheringAdminInteraction(interaction);
  await interaction.showModal(buildGatheringVoteModal(await getGatheringSnapshot(interaction.channelId)));
}

async function handleGatheringResetButton(interaction) {
  assertGatheringAdminInteraction(interaction);
  await resetGathering(interaction.channelId);
  await interaction.update(buildGatheringAdminPanel(await getGatheringSnapshot(interaction.channelId), getChannelName(interaction)));
}

async function handleGatheringRefreshButton(interaction) {
  assertGatheringAdminInteraction(interaction);
  await interaction.update(buildGatheringAdminPanel(await getGatheringSnapshot(interaction.channelId), getChannelName(interaction)));
}

async function handleGatheringResultJoinButton(interaction) {
  assertGatheringChannel(interaction.channelId);

  await joinGathering(interaction.channelId, {
    discordUserId: interaction.user.id,
    name: interaction.member?.displayName || interaction.user.username,
  });
  await interaction.update(asUpdatePayload(buildGatheringResultPanel(
    await getGatheringSnapshot(interaction.channelId),
    getChannelName(interaction),
    { ephemeral: isEphemeralMessage(interaction) },
  )));
}

async function handleGatheringResultLeaveButton(interaction) {
  assertGatheringChannel(interaction.channelId);

  await leaveGathering(interaction.channelId, interaction.user.id);
  await interaction.update(asUpdatePayload(buildGatheringResultPanel(
    await getGatheringSnapshot(interaction.channelId),
    getChannelName(interaction),
    { ephemeral: isEphemeralMessage(interaction) },
  )));
}

async function handleGatheringTestResultPrivateButton(interaction) {
  assertGatheringAdminInteraction(interaction);
  await interaction.update(asUpdatePayload(buildGatheringResultPanel(
    await getGatheringSnapshot(interaction.channelId),
    getChannelName(interaction),
  )));
}

async function handleGatheringTestResultPublicButton(interaction) {
  assertGatheringAdminInteraction(interaction);
  await interaction.channel?.send(buildGatheringResultPanel(
    await getGatheringSnapshot(interaction.channelId),
    getChannelName(interaction),
    { ephemeral: false },
  ));
  await interaction.update({
    content: '모임 투표 결과를 현재 채널에 공지했어요.',
    components: [],
  });
}

async function handleLunchTestRecommendButton(interaction) {
  if (!isAdmin(interaction)) {
    throw new UserFacingError('점심테스트 UI는 관리자만 사용할 수 있어요.');
  }

  await interaction.update({
    content: '점심 메뉴 추천은 다음 단계에서 붙이면 딱 좋겠어요.',
    components: [],
  });
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

function isEphemeralMessage(interaction) {
  return Boolean(interaction.message?.flags?.has?.(MessageFlags.Ephemeral));
}

function asUpdatePayload(payload) {
  const { flags, ...rest } = payload;
  return rest;
}
