import { PermissionFlagsBits } from 'discord.js';

export function isAdmin(interaction) {
  return interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
}
