import { Client, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import { assertRuntimeConfig, config } from './config/env.js';
import { getCommandHandler } from './commands.js';
import { UserFacingError } from './services/cleaningService.js';
import { handleAutocompleteInteraction } from './interactions/autocompleteHandlers.js';
import { handleButtonInteraction } from './interactions/buttonHandlers.js';
import { handleModalSubmitInteraction } from './interactions/modalHandlers.js';
import { handleSelectMenuInteraction } from './interactions/selectMenuHandlers.js';
import { scheduleCleaningPanel } from './schedules/cleaningSchedule.js';
import { scheduleGatheringVoteResults } from './schedules/gatheringSchedule.js';

assertRuntimeConfig();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, async () => {
  console.log(`${client.user.tag} 로그인 완료`);
  scheduleCleaningPanel(client);
  scheduleGatheringVoteResults(client);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
      return;
    }

    if (interaction.isAutocomplete()) {
      await handleAutocompleteInteraction(interaction);
      return;
    }

    if (interaction.isStringSelectMenu()) {
      await handleSelectMenuInteraction(interaction);
      return;
    }

    if (interaction.isModalSubmit()) {
      await handleModalSubmitInteraction(interaction);
      return;
    }

    if (!interaction.isChatInputCommand()) {
      return;
    }

    const handler = getCommandHandler(interaction.commandName);
    if (handler) {
      await handler(interaction);
    }
  } catch (error) {
    await replyError(interaction, error);
  }
});

async function replyError(interaction, error) {
  console.error(error);
  const content = error instanceof UserFacingError
    ? error.message
    : '처리 중 오류가 났어요. 콘솔 로그를 확인해주세요.';
  const payload = interaction.inGuild?.()
    ? { content, flags: MessageFlags.Ephemeral }
    : { content };

  if (interaction.deferred || interaction.replied) {
    await interaction.followUp(payload);
  } else {
    await interaction.reply(payload);
  }
}

client.login(config.token);
