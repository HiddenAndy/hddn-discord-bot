import { cleaningAdminCommands, cleaningUserCommands } from './cleaningCommands.js';
import { gatheringAdminCommands, gatheringUserCommands } from './gatheringCommands.js';
import { lunchAdminCommands, lunchUserCommands } from './lunchCommands.js';

export const commandGroups = {
  user: [
    ...cleaningUserCommands,
    ...lunchUserCommands,
    ...gatheringUserCommands,
  ],
  admin: [
    ...cleaningAdminCommands,
    ...lunchAdminCommands,
    ...gatheringAdminCommands,
  ],
};

export const commandModules = [
  ...commandGroups.user,
  ...commandGroups.admin,
];

const commandByName = new Map(commandModules.map((command) => [command.data.name, command]));

export function buildCommands() {
  return commandModules.map((command) => command.data.toJSON());
}

export function getCommandHandler(commandName) {
  return commandByName.get(commandName)?.execute || null;
}
