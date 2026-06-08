import { AttachmentBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { config } from '../config/env.js';
import {
  buildCurrentDrawClosedMessage,
  buildResultSummary,
  CLEANING_DRAW_BUTTON_ID,
  createCleaningDrawSession,
  drawCleaningZoneForDiscordUser,
  getReasonLabel,
  getThisWeekAssignments,
  getThisWeekExemptMembers,
  resetCurrentCleaningDraw,
  resetOldCleaningAssignments,
  resolveAssignmentImagePath,
  UserFacingError,
} from '../services/cleaningService.js';
import {
  getCleaningMember,
  getCleaningAdminSnapshot,
  getCleaningZone,
} from '../services/cleaningAdminService.js';
import {
  assertGatheringChannel,
  clearGatheringVenues,
  getGatheringSnapshot,
  getGatheringSummary,
  getGatheringVenue,
  joinGathering,
  leaveGathering,
  resetGatheringVoteStatus,
  resetGathering,
} from '../services/gatheringService.js';
import { readStore } from '../data/store.js';
import { isAdmin } from '../utils/permissions.js';
import {
  buildCleaningAdminPanel,
  buildScheduleModal,
  buildZoneModal,
  CLEANING_ADMIN_CUSTOM_IDS,
} from '../ui/cleaningAdminPanel.js';
import {
  buildCommonMemberModal,
  buildMemberAdminPanel,
  MEMBER_ADMIN_CUSTOM_IDS,
} from '../ui/memberAdminPanel.js';
import { buildCleaningPanelMessage } from '../ui/cleaningPanel.js';
import {
  buildGatheringAdminPanel,
  buildGatheringDateModal,
  buildGatheringEditVenueModal,
  buildGatheringFeedbackModal,
  buildGatheringVenueModal,
  buildGatheringVoteModal,
  GATHERING_ADMIN_CUSTOM_IDS,
} from '../ui/gatheringAdminPanel.js';
import { buildGatheringVoteMessage } from '../ui/gatheringVotePanel.js';
import {
  buildGatheringResultPanel,
  GATHERING_RESULT_CUSTOM_IDS,
} from '../ui/gatheringResultPanel.js';
import { TEST_PANEL_CUSTOM_IDS } from '../ui/testPanels.js';
import { readModalContext } from './modalContext.js';

const buttonHandlers = new Map([
  [CLEANING_DRAW_BUTTON_ID, handleCleaningDrawButton],
  [CLEANING_ADMIN_CUSTOM_IDS.viewSummary, handleViewSummaryButton],
  [CLEANING_ADMIN_CUSTOM_IDS.viewZones, handleViewZonesButton],
  [CLEANING_ADMIN_CUSTOM_IDS.viewPreferences, handleViewPreferencesButton],
  [CLEANING_ADMIN_CUSTOM_IDS.viewSchedule, handleViewScheduleButton],
  [CLEANING_ADMIN_CUSTOM_IDS.addZone, handleAddZoneButton],
  [CLEANING_ADMIN_CUSTOM_IDS.editSchedule, handleEditScheduleButton],
  [CLEANING_ADMIN_CUSTOM_IDS.resetDraw, handleResetCleaningDrawButton],
  [CLEANING_ADMIN_CUSTOM_IDS.refresh, handleRefreshAdminPanelButton],
  [MEMBER_ADMIN_CUSTOM_IDS.addMember, handleAddMemberButton],
  [MEMBER_ADMIN_CUSTOM_IDS.refresh, handleRefreshMemberAdminPanelButton],
  [GATHERING_ADMIN_CUSTOM_IDS.editDate, handleGatheringDateButton],
  [GATHERING_ADMIN_CUSTOM_IDS.addVenue, handleGatheringVenueButton],
  [GATHERING_ADMIN_CUSTOM_IDS.clearVenues, handleGatheringClearVenuesButton],
  [GATHERING_ADMIN_CUSTOM_IDS.startVote, handleGatheringVoteButton],
  [GATHERING_ADMIN_CUSTOM_IDS.resetVoteStatus, handleGatheringResetVoteStatusButton],
  [GATHERING_ADMIN_CUSTOM_IDS.reset, handleGatheringResetButton],
  [GATHERING_ADMIN_CUSTOM_IDS.refresh, handleGatheringRefreshButton],
  [GATHERING_RESULT_CUSTOM_IDS.join, handleGatheringResultJoinButton],
  [GATHERING_RESULT_CUSTOM_IDS.leave, handleGatheringResultLeaveButton],
  [TEST_PANEL_CUSTOM_IDS.gatheringResultPrivate, handleGatheringTestResultPrivateButton],
  [TEST_PANEL_CUSTOM_IDS.gatheringResultPublic, handleGatheringTestResultPublicButton],
  [TEST_PANEL_CUSTOM_IDS.gatheringVoteMessage, handleGatheringTestVoteMessageButton],
  [TEST_PANEL_CUSTOM_IDS.gatheringSummary, handleGatheringTestSummaryButton],
  [TEST_PANEL_CUSTOM_IDS.cleaningDrawPanel, handleCleaningTestDrawPanelButton],
  [TEST_PANEL_CUSTOM_IDS.cleaningDrawSelf, handleCleaningTestDrawSelfButton],
  [TEST_PANEL_CUSTOM_IDS.cleaningResultSummary, handleCleaningTestResultSummaryButton],
  [TEST_PANEL_CUSTOM_IDS.cleaningClosedMessage, handleCleaningTestClosedMessageButton],
  [TEST_PANEL_CUSTOM_IDS.lunchRecommend, handleLunchTestRecommendButton],
]);

export async function handleButtonInteraction(interaction) {
  const handler = buttonHandlers.get(interaction.customId) || getDynamicButtonHandler(interaction.customId);
  if (handler) {
    await handler(interaction);
  }
}

async function handleCleaningDrawButton(interaction) {
  if (config.cleaningChannelId && interaction.channelId !== config.cleaningChannelId) {
    throw new UserFacingError('청소 추첨 버튼은 지정된 청소 채널에서만 사용할 수 있어요.');
  }

  const result = await drawCleaningZoneForDiscordUser(interaction.user, interaction.member);
  const files = result.imagePath ? [new AttachmentBuilder(result.imagePath)] : [];
  await interaction.reply({
    embeds: [buildCleaningAssignmentEmbed(result)],
    files,
    flags: MessageFlags.Ephemeral,
  });
  await interaction.channel?.send({ embeds: [buildCleaningAnnouncementEmbed(result)] });
}

async function handleAddMemberButton(interaction) {
  assertMemberAdminInteraction(interaction);
  await interaction.showModal(buildCommonMemberModal());
}

async function handleAddZoneButton(interaction) {
  assertCleaningAdminInteraction(interaction);
  await interaction.showModal(buildZoneModal());
}

async function handleEditSelectedMemberButton(interaction) {
  assertMemberAdminInteraction(interaction);
  const memberId = resolveButtonContextValue(interaction.customId, MEMBER_ADMIN_CUSTOM_IDS.editSelectedMemberPrefix);
  const member = await getCleaningMember(memberId);
  if (!member) {
    throw new UserFacingError(`수정할 멤버를 찾을 수 없어요: ${memberId}`);
  }

  await interaction.showModal(buildCommonMemberModal(member));
}

async function handleEditSelectedZoneButton(interaction) {
  assertCleaningAdminInteraction(interaction);
  const zoneName = resolveButtonContextValue(interaction.customId, CLEANING_ADMIN_CUSTOM_IDS.editSelectedZonePrefix);
  const zone = await getCleaningZone(zoneName);
  if (!zone) {
    throw new UserFacingError(`수정할 청소 구역을 찾을 수 없어요: ${zoneName}`);
  }

  await interaction.showModal(buildZoneModal(zone));
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

async function handleViewZonesButton(interaction) {
  assertCleaningAdminInteraction(interaction);
  await interaction.update(buildCleaningAdminPanel(await getCleaningAdminSnapshot(), 'zones'));
}

async function handleViewPreferencesButton(interaction) {
  assertCleaningAdminInteraction(interaction);
  await interaction.update(buildCleaningAdminPanel(await getCleaningAdminSnapshot(), 'preferences'));
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

async function handleRefreshMemberAdminPanelButton(interaction) {
  assertMemberAdminInteraction(interaction);
  await interaction.update(buildMemberAdminPanel(await getCleaningAdminSnapshot()));
}

async function handleCleaningTestClosedMessageButton(interaction) {
  assertCleaningAdminInteraction(interaction);
  await interaction.reply({
    content: await buildCurrentDrawClosedMessage(),
    flags: MessageFlags.Ephemeral,
  });
}

async function handleCleaningTestDrawPanelButton(interaction) {
  assertCleaningAdminInteraction(interaction);
  await resetOldCleaningAssignments();
  const drawSession = await createCleaningDrawSession();
  await interaction.channel?.send(buildCleaningPanelMessage(drawSession));
  await interaction.reply({
    content: '청소 추첨 패널을 현재 채널에 게시했습니다.',
    flags: MessageFlags.Ephemeral,
  });
}

async function handleCleaningTestDrawSelfButton(interaction) {
  assertCleaningAdminInteraction(interaction);
  const result = await drawCleaningZoneForDiscordUser(interaction.user, interaction.member);
  const files = result.imagePath ? [new AttachmentBuilder(result.imagePath)] : [];
  await interaction.reply({
    embeds: [buildCleaningAssignmentEmbed(result, '테스트 추첨 결과')],
    files,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleCleaningTestResultSummaryButton(interaction) {
  assertCleaningAdminInteraction(interaction);
  const store = await readStore();
  const assignments = getThisWeekAssignments(store);
  const exemptMembers = await getThisWeekExemptMembers(store);
  const myAssignment = assignments.find((assignment) => assignment.discordUserId === interaction.user.id);
  const imagePath = await resolveAssignmentImagePath(myAssignment, store);
  const files = imagePath ? [new AttachmentBuilder(imagePath)] : [];
  await interaction.reply({
    embeds: [buildCleaningResultSummaryEmbed(assignments, exemptMembers)],
    files,
    flags: MessageFlags.Ephemeral,
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

function getViewFromMessage(interaction) {
  const content = interaction.message?.content || '';
  if (content.includes('청소관리 - 인원')) {
    return 'members';
  }

  if (content.includes('청소관리 - 구역')) {
    return 'zones';
  }

  if (content.includes('청소관리 - 선호구역')) {
    return 'preferences';
  }

  if (content.includes('청소관리 - 스케줄')) {
    return 'schedule';
  }

  return 'summary';
}

function getDynamicButtonHandler(customId) {
  if (customId.startsWith(MEMBER_ADMIN_CUSTOM_IDS.editSelectedMemberPrefix)) {
    return handleEditSelectedMemberButton;
  }

  if (customId.startsWith(CLEANING_ADMIN_CUSTOM_IDS.editSelectedZonePrefix)) {
    return handleEditSelectedZoneButton;
  }

  if (customId.startsWith(GATHERING_ADMIN_CUSTOM_IDS.editSelectedVenuePrefix)) {
    return handleGatheringEditSelectedVenueButton;
  }

  if (customId.startsWith(GATHERING_ADMIN_CUSTOM_IDS.feedbackOpenPrefix)) {
    return handleGatheringFeedbackOpenButton;
  }

  return null;
}

function resolveButtonContextValue(customId, prefix) {
  const token = customId.replace(prefix, '');
  return readModalContext(token) || decodeURIComponent(token);
}

async function handleGatheringDateButton(interaction) {
  assertGatheringAdminInteraction(interaction);
  await interaction.showModal(buildGatheringDateModal(await getGatheringSnapshot(interaction.channelId)));
}

async function handleGatheringVenueButton(interaction) {
  assertGatheringAdminInteraction(interaction);
  await interaction.showModal(buildGatheringVenueModal());
}

async function handleGatheringEditSelectedVenueButton(interaction) {
  assertGatheringAdminInteraction(interaction);
  const venueName = resolveButtonContextValue(interaction.customId, GATHERING_ADMIN_CUSTOM_IDS.editSelectedVenuePrefix);
  const venue = await getGatheringVenue(interaction.channelId, venueName);
  if (!venue) {
    throw new UserFacingError(`수정할 후보를 찾을 수 없어요: ${venueName}`);
  }

  await interaction.showModal(buildGatheringEditVenueModal(venue));
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

async function handleGatheringResetVoteStatusButton(interaction) {
  assertGatheringAdminInteraction(interaction);
  const result = await resetGatheringVoteStatus(interaction.channelId);
  await interaction.update(buildGatheringAdminPanel(await getGatheringSnapshot(interaction.channelId), getChannelName(interaction)));
  await interaction.followUp({
    content: `투표 현황을 초기화했습니다. 삭제된 참여자: ${result.participantCount}명, 삭제된 투표: ${result.voteCount}표`,
    flags: MessageFlags.Ephemeral,
  });
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

async function handleGatheringFeedbackOpenButton(interaction) {
  const channelId = interaction.customId.replace(GATHERING_ADMIN_CUSTOM_IDS.feedbackOpenPrefix, '');
  await interaction.showModal(buildGatheringFeedbackModal(channelId));
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
  await interaction.reply(buildGatheringResultPanel(
    await getGatheringSnapshot(interaction.channelId),
    getChannelName(interaction),
  ));
}

async function handleGatheringTestResultPublicButton(interaction) {
  assertGatheringAdminInteraction(interaction);
  await interaction.channel?.send(buildGatheringResultPanel(
    await getGatheringSnapshot(interaction.channelId),
    getChannelName(interaction),
    { ephemeral: false },
  ));
  await interaction.reply({
    content: '모임 투표 결과를 현재 채널에 공지했습니다.',
    flags: MessageFlags.Ephemeral,
  });
}

async function handleGatheringTestVoteMessageButton(interaction) {
  assertGatheringAdminInteraction(interaction);
  const gathering = await getGatheringSnapshot(interaction.channelId);
  if (gathering.venueOptions.length === 0) {
    throw new UserFacingError('투표 메시지를 올리려면 먼저 `/모임설정`에서 장소 후보를 1개 이상 추가해주세요.');
  }

  await interaction.channel?.send(buildGatheringVoteMessage(
    gathering,
    getChannelName(interaction),
  ));
  await interaction.reply({
    content: '모임 투표 메시지를 현재 채널에 게시했습니다.',
    flags: MessageFlags.Ephemeral,
  });
}

async function handleGatheringTestSummaryButton(interaction) {
  assertGatheringAdminInteraction(interaction);
  const summary = await getGatheringSummary(interaction.channelId, getChannelName(interaction));
  await interaction.reply({
    embeds: [new EmbedBuilder()
      .setColor(0x27ae60)
      .setTitle('모임 현황')
      .setDescription(stripSummaryTitle(summary))],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleLunchTestRecommendButton(interaction) {
  if (!isAdmin(interaction)) {
    throw new UserFacingError('점심테스트 UI는 관리자만 사용할 수 있어요.');
  }

  await interaction.reply({
    content: '점심 추천 기능은 아직 준비 중입니다.',
    flags: MessageFlags.Ephemeral,
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

function buildCleaningAssignmentEmbed(result, title = '이번 주 청소 구역') {
  const reasonLabel = getReasonLabel(result.assignment.reason);
  return new EmbedBuilder()
    .setColor(0x2f80ed)
    .setTitle(title)
    .setDescription(`${result.member.name}님의 배정이 완료되었습니다.`)
    .addFields(
      { name: '배정 구역', value: result.assignment.zone },
      { name: '카테고리', value: result.assignment.category, inline: true },
      { name: '배정 방식', value: reasonLabel, inline: true },
      { name: '남은 구역', value: `${result.remainingCount}개`, inline: true },
    );
}

function buildCleaningAnnouncementEmbed(result) {
  const reasonLabel = getReasonLabel(result.assignment.reason);
  return new EmbedBuilder()
    .setColor(0x56ccf2)
    .setTitle('청소 구역 배정 완료')
    .setDescription(`${result.member.name}님이 구역을 뽑았습니다.`)
    .addFields(
      { name: '배정 구역', value: result.assignment.zone },
      { name: '배정 방식', value: reasonLabel, inline: true },
      { name: '남은 구역', value: `${result.remainingCount}개`, inline: true },
    );
}

function buildCleaningResultSummaryEmbed(assignments, exemptMembers) {
  return new EmbedBuilder()
    .setColor(0x2f80ed)
    .setTitle('이번 주 청소 결과')
    .setDescription(buildResultSummary(assignments, exemptMembers));
}

function stripSummaryTitle(summary) {
  return summary.replace(/^.+모임 현황\n\n/, '');
}
