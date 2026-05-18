import { REST, Routes } from 'discord.js';
import { assertRuntimeConfig, config } from './config/env.js';
import { buildCommands } from './commands.js';

assertRuntimeConfig();

const rest = new REST({ version: '10' }).setToken(config.token);
const commands = buildCommands();

await rest.put(
  Routes.applicationGuildCommands(config.clientId, config.guildId),
  { body: commands },
);

console.log(`${commands.length}개 슬래시 명령어를 등록했습니다.`);
