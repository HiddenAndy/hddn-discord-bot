import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { getCleaningAdminSnapshot } from '../services/cleaningAdminService.js';
import { buildMemberAdminPanel } from '../ui/memberAdminPanel.js';

const commandNames = {
  admin: '인원관리',
};

export const memberAdminCommands = [
  {
    data: new SlashCommandBuilder()
      .setName(commandNames.admin)
      .setDescription('[인원관리] 봇 공통 인원과 Discord ID 연결을 관리합니다.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    execute: handleMemberAdminCommand,
  },
];

async function handleMemberAdminCommand(interaction) {
  await interaction.reply(buildMemberAdminPanel(await getCleaningAdminSnapshot()));
}
