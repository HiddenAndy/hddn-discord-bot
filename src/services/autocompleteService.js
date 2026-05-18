import { readStore } from '../data/store.js';

export async function getAutocompleteChoices(context) {
  const {
    commandName,
    subcommand,
    focusedName,
    focusedValue,
    channelId,
    options,
  } = context;
  const store = await readStore();
  const query = normalize(focusedValue);

  if (commandName === '청소' && subcommand === '선호구역' && ['1순위', '2순위'].includes(focusedName)) {
    const selectedFirst = String(options['1순위'] || '').trim();
    const categories = focusedName === '2순위'
      ? getActiveCategoryNames(store).filter((category) => category !== selectedFirst)
      : getActiveCategoryNames(store);

    return filterChoices(categories, query);
  }

  return [];
}

function getActiveCategoryNames(store) {
  return unique(store.cleaningZones
    .filter((zone) => zone.active)
    .map((zone) => zone.category));
}

function filterChoices(values, query) {
  return unique(values)
    .filter((value) => !query || normalize(value).includes(query))
    .slice(0, 25)
    .map((value) => ({
      name: value,
      value,
    }));
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}
