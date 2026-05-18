import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { defaultCleaningZones, defaultMembers, defaultPreferences } from './defaultData.js';
import { fromProjectRoot } from '../utils/paths.js';

const storePath = fromProjectRoot('data/store.json');

function createInitialStore() {
  return {
    members: defaultMembers,
    cleaningZones: defaultCleaningZones,
    preferences: defaultPreferences,
    assignments: [],
    cleaningDrawSessions: {},
    settings: {
      cleaningSchedule: {
        weekday: 1,
        hour: 12,
        minute: 55,
      },
    },
    gatheringsByChannel: {},
  };
}

export async function readStore() {
  try {
    const raw = await readFile(storePath, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      ...createInitialStore(),
      ...parsed,
      settings: {
        ...createInitialStore().settings,
        ...(parsed.settings || {}),
        cleaningSchedule: {
          ...createInitialStore().settings.cleaningSchedule,
          ...(parsed.settings?.cleaningSchedule || {}),
        },
      },
      gatheringsByChannel: parsed.gatheringsByChannel || {},
      cleaningDrawSessions: parsed.cleaningDrawSessions || {},
    };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }

    const initialStore = createInitialStore();
    await writeStore(initialStore);
    return initialStore;
  }
}

export async function writeStore(store) {
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
}

export async function updateStore(updater) {
  const store = await readStore();
  const result = await updater(store);
  await writeStore(store);
  return result;
}
