import { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { registerGuildCommands } from '../services/commandRegistrationService.js';

const commandNames = {
  refreshCommands: '명령어갱신',
};

export const systemAdminCommands = [
  {
    data: new SlashCommandBuilder()
      .setName(commandNames.refreshCommands)
      .setDescription('[관리] 현재 봇 코드 기준으로 서버 슬래시 명령어를 다시 등록합니다.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    execute: handleRefreshCommands,
  },
];

async function handleRefreshCommands(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const commandCount = await registerGuildCommands();

  await interaction.editReply({
    content: `슬래시 명령어 ${commandCount}개를 현재 서버에 다시 등록했습니다.`,
  });
}
