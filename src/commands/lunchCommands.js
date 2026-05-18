import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { buildLunchTestPanel } from '../ui/testPanels.js';

const commandNames = {
  user: '점심',
  test: '점심테스트',
};

const subcommandNames = {
  recommend: '추천',
};

export const lunchUserCommands = [
  {
    data: new SlashCommandBuilder()
      .setName(commandNames.user)
      .setDescription('[점메추] 점심 메뉴')
      .addSubcommand((subcommand) => subcommand
        .setName(subcommandNames.recommend)
        .setDescription('점심 메뉴 추천은 아직 준비 중입니다.')),
    execute: handleLunchCommand,
  },
];

export const lunchAdminCommands = [
  {
    data: new SlashCommandBuilder()
      .setName(commandNames.test)
      .setDescription('[점심테스트] 점심 기능 테스트 패널을 엽니다.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    execute: handleLunchTestCommand,
  },
];

export const lunchCommands = [
  ...lunchUserCommands,
  ...lunchAdminCommands,
];

async function handleLunchCommand(interaction) {
  await interaction.reply({ content: '점심 메뉴 추천은 다음 단계에서 붙이면 딱 좋겠어요.', flags: MessageFlags.Ephemeral });
}

async function handleLunchTestCommand(interaction) {
  await interaction.reply(buildLunchTestPanel());
}
