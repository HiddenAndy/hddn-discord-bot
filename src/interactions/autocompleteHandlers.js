import { getAutocompleteChoices } from '../services/autocompleteService.js';

export async function handleAutocompleteInteraction(interaction) {
  const focused = interaction.options.getFocused(true);
  const subcommand = getSubcommand(interaction);
  const choices = await getAutocompleteChoices({
    commandName: interaction.commandName,
    subcommand,
    focusedName: focused.name,
    focusedValue: focused.value,
    channelId: interaction.channelId,
    options: getEnteredOptions(interaction),
  });

  await interaction.respond(choices);
}

function getEnteredOptions(interaction) {
  return interaction.options.data.reduce((result, option) => {
    if (option.options) {
      option.options.forEach((subOption) => {
        result[subOption.name] = subOption.value;
      });
    } else {
      result[option.name] = option.value;
    }

    return result;
  }, {});
}

function getSubcommand(interaction) {
  try {
    return interaction.options.getSubcommand(false);
  } catch {
    return '';
  }
}
