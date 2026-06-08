import { EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import {
  addGatheringVenue,
  assertGatheringChannel,
  getGatheringSnapshot,
  getGatheringSummary,
  joinGathering,
  leaveGathering,
} from '../services/gatheringService.js';
import { buildGatheringAdminPanel } from '../ui/gatheringAdminPanel.js';
import { buildGatheringTestPanel } from '../ui/testPanels.js';

const commandNames = {
  join: '참여',
  leave: '신청취소',
  summary: '현황',
  addVenue: '후보추가',
  settings: '모임설정',
  test: '모임테스트',
};

export const gatheringUserCommands = [
  {
    data: new SlashCommandBuilder()
      .setName(commandNames.join)
      .setDescription('[소모임] 현재 채널의 열린 모임에 참여합니다.'),
    execute: handleJoin,
  },
  {
    data: new SlashCommandBuilder()
      .setName(commandNames.leave)
      .setDescription('[소모임] 현재 채널의 모임 참여를 취소합니다.'),
    execute: handleLeave,
  },
  {
    data: new SlashCommandBuilder()
      .setName(commandNames.summary)
      .setDescription('[소모임] 현재 채널의 모임 현황을 봅니다.'),
    execute: handleSummary,
  },
  {
    data: new SlashCommandBuilder()
      .setName(commandNames.addVenue)
      .setDescription('[소모임] 현재 채널의 모임 장소 후보를 추가합니다.')
      .addStringOption((option) => option
        .setName('장소명')
        .setDescription('추가할 장소 이름')
        .setRequired(true))
      .addStringOption((option) => option
        .setName('장소url')
        .setDescription('장소 링크')
        .setRequired(false))
      .addStringOption((option) => option
        .setName('설명')
        .setDescription('장소 설명')
        .setRequired(false)),
    execute: handleAddVenue,
  },
];

export const gatheringAdminCommands = [
  {
    data: new SlashCommandBuilder()
      .setName(commandNames.settings)
      .setDescription('[소모임설정] 현재 채널의 모임 설정 패널을 엽니다.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    execute: handleGatheringSettingsCommand,
  },
  {
    data: new SlashCommandBuilder()
      .setName(commandNames.test)
      .setDescription('[소모임테스트] 현재 채널의 모임 기능 테스트 패널을 엽니다.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    execute: handleGatheringTestCommand,
  },
];

export const gatheringCommands = [
  ...gatheringUserCommands,
  ...gatheringAdminCommands,
];

async function handleGatheringSettingsCommand(interaction) {
  assertGatheringChannel(interaction.channelId);

  await interaction.reply(buildGatheringAdminPanel(
    await getGatheringSnapshot(interaction.channelId),
    getChannelName(interaction),
  ));
}

async function handleGatheringTestCommand(interaction) {
  assertGatheringChannel(interaction.channelId);

  await interaction.reply(buildGatheringTestPanel(getChannelName(interaction)));
}

async function handleJoin(interaction) {
  assertGatheringChannel(interaction.channelId);

  const name = interaction.member.displayName || interaction.user.username;
  await joinGathering(interaction.channelId, {
    discordUserId: interaction.user.id,
    name,
  });

  await interaction.reply({
    content: `${formatChannelName(interaction)} ${name}님, 참가 신청이 완료되었습니다.`,
    flags: MessageFlags.Ephemeral,
  });
}

async function handleLeave(interaction) {
  assertGatheringChannel(interaction.channelId);

  await leaveGathering(interaction.channelId, interaction.user.id);
  await interaction.reply({ content: '참가 신청을 취소했습니다.', flags: MessageFlags.Ephemeral });
}

async function handleSummary(interaction) {
  assertGatheringChannel(interaction.channelId);
  const summary = await getGatheringSummary(interaction.channelId, getChannelName(interaction));

  await interaction.reply({
    embeds: [new EmbedBuilder()
      .setColor(0x27ae60)
      .setTitle('모임 현황')
      .setDescription(stripSummaryTitle(summary))],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleAddVenue(interaction) {
  assertGatheringChannel(interaction.channelId);

  const venue = {
    name: interaction.options.getString('장소명'),
    venueUrl: interaction.options.getString('장소url') || '',
    description: interaction.options.getString('설명') || '',
  };
  await addGatheringVenue(interaction.channelId, venue);

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x27ae60)
        .setTitle('모임 장소 후보 추가')
        .setDescription(`${venue.name} 후보를 추가했습니다.`)
        .addFields(
          { name: '채널', value: formatChannelName(interaction), inline: true },
          { name: '링크', value: venue.venueUrl || '없음', inline: true },
          { name: '설명', value: venue.description || '없음' },
        ),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

function formatChannelName(interaction) {
  return `[${getChannelName(interaction)}]`;
}

function getChannelName(interaction) {
  return interaction.channel?.name || interaction.channelId;
}

function stripSummaryTitle(summary) {
  return summary.replace(/^.+모임 현황\n\n/, '');
}
