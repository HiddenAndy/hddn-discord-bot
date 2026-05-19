import { config } from '../config/env.js';
import { EmbedBuilder, MessageFlags } from 'discord.js';
import { UserFacingError } from '../services/cleaningService.js';
import {
  getCleaningZone,
  getCleaningMember,
  getCleaningAdminSnapshot,
} from '../services/cleaningAdminService.js';
import {
  assertGatheringChannel,
  getGatheringSnapshot,
  getGatheringVenue,
  voteGatheringVenue,
} from '../services/gatheringService.js';
import { isAdmin } from '../utils/permissions.js';
import {
  buildCleaningAdminPanel,
  CLEANING_ADMIN_CUSTOM_IDS,
} from '../ui/cleaningAdminPanel.js';
import {
  buildGatheringAdminPanel,
  GATHERING_ADMIN_CUSTOM_IDS,
} from '../ui/gatheringAdminPanel.js';
import { GATHERING_VOTE_SELECT_ID } from '../ui/gatheringVotePanel.js';

const selectMenuHandlers = new Map([
  [CLEANING_ADMIN_CUSTOM_IDS.editMemberSelect, handleEditMemberSelect],
  [CLEANING_ADMIN_CUSTOM_IDS.editZoneSelect, handleEditZoneSelect],
  [GATHERING_VOTE_SELECT_ID, handleGatheringVote],
  [GATHERING_ADMIN_CUSTOM_IDS.editVenueSelect, handleGatheringEditVenueSelect],
]);

export async function handleSelectMenuInteraction(interaction) {
  const handler = selectMenuHandlers.get(interaction.customId);
  if (handler) {
    await handler(interaction);
  }
}

async function handleEditMemberSelect(interaction) {
  assertCleaningAdminInteraction(interaction);

  const member = await getCleaningMember(interaction.values[0]);
  if (!member) {
    throw new UserFacingError(`수정할 멤버를 찾을 수 없어요: ${interaction.values[0]}`);
  }

  await interaction.update(buildCleaningAdminPanel(
    await getCleaningAdminSnapshot(),
    'members',
    { selectedMemberId: member.id },
  ));
}

async function handleEditZoneSelect(interaction) {
  assertCleaningAdminInteraction(interaction);

  const zone = await getCleaningZone(interaction.values[0]);
  if (!zone) {
    throw new UserFacingError(`수정할 청소 구역을 찾을 수 없어요: ${interaction.values[0]}`);
  }

  await interaction.update(buildCleaningAdminPanel(
    await getCleaningAdminSnapshot(),
    'zones',
    { selectedZoneName: zone.zone },
  ));
}

async function handleGatheringVote(interaction) {
  const name = interaction.member?.displayName || interaction.user.username;
  await voteGatheringVenue(interaction.channelId, {
    discordUserId: interaction.user.id,
    name,
  }, interaction.values[0]);
  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x27ae60)
        .setTitle('투표 완료')
        .setDescription('모임 참여도 함께 신청되었습니다.')
        .addFields({ name: '선택한 장소', value: interaction.values[0] }),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleGatheringEditVenueSelect(interaction) {
  assertGatheringAdminInteraction(interaction);

  const venue = await getGatheringVenue(interaction.channelId, interaction.values[0]);
  if (!venue) {
    throw new UserFacingError(`수정할 후보를 찾을 수 없어요: ${interaction.values[0]}`);
  }

  await interaction.update(buildGatheringAdminPanel(
    await getGatheringSnapshot(interaction.channelId),
    getChannelName(interaction),
    { selectedVenueName: venue.name },
  ));
}

function assertCleaningAdminInteraction(interaction) {
  if (!isAdmin(interaction)) {
    throw new UserFacingError('청소관리 UI는 관리자만 사용할 수 있어요.');
  }

  if (config.cleaningChannelId && interaction.channelId !== config.cleaningChannelId) {
    throw new UserFacingError('청소관리 UI는 지정된 청소 채널에서만 사용할 수 있어요.');
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
