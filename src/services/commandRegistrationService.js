import { REST, Routes } from 'discord.js';
import { assertRuntimeConfig, config } from '../config/env.js';

export async function registerGuildCommands() {
  assertRuntimeConfig();

  const { buildCommands } = await import('../commands.js');
  const commands = buildCommands();
  const rest = new REST({ version: '10' }).setToken(config.token);

  await rest.put(
    Routes.applicationGuildCommands(config.clientId, config.guildId),
    { body: commands },
  );

  return commands.length;
}
