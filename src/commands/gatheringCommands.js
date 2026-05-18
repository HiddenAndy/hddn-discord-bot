import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import {
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

  await interaction.reply(`${formatChannelName(interaction)} ${name}님 참가 신청 완료!`);
}

async function handleLeave(interaction) {
  assertGatheringChannel(interaction.channelId);

  await leaveGathering(interaction.channelId, interaction.user.id);
  await interaction.reply({ content: '참가 신청을 취소했어요.', flags: MessageFlags.Ephemeral });
}

async function handleSummary(interaction) {
  assertGatheringChannel(interaction.channelId);

  await interaction.reply({
    content: await getGatheringSummary(interaction.channelId, getChannelName(interaction)),
    flags: MessageFlags.Ephemeral,
  });
}

function formatChannelName(interaction) {
  return `[${getChannelName(interaction)}]`;
}

function getChannelName(interaction) {
  return interaction.channel?.name || interaction.channelId;
}
