import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { defaultCleaningZones, defaultMembers, defaultPreferences } from './defaultData.js';
import { fromProjectRoot } from '../utils/paths.js';

const storePath = fromProjectRoot('data/store.sqlite');
const seedStorePath = fromProjectRoot('data/store.json');
const stateKey = 'store';

let db = null;
let updateQueue = Promise.resolve();

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
  return readStoreSync();
}

export async function writeStore(store) {
  writeStoreSync(store);
}

export async function updateStore(updater) {
  const run = updateQueue.then(async () => {
    const store = readStoreSync();
    const result = await updater(store);
    writeStoreSync(store);
    return result;
  });
  updateQueue = run.catch(() => {});
  return run;
}

function readStoreSync() {
  const raw = getDb()
    .prepare('SELECT value FROM app_state WHERE key = ?')
    .get(stateKey)?.value;

  if (!raw) {
    const initialStore = readSeedStore();
    writeStoreSync(initialStore);
    return initialStore;
  }

  return normalizeStore(JSON.parse(raw));
}

function writeStoreSync(store) {
  const normalized = normalizeStore(store);
  getDb()
    .prepare(`
      INSERT INTO app_state (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `)
    .run(stateKey, JSON.stringify(normalized));
}

function getDb() {
  if (db) {
    return db;
  }

  mkdirSync(path.dirname(storePath), { recursive: true });
  db = new Database(storePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  return db;
}

function readSeedStore() {
  if (!existsSync(seedStorePath)) {
    return createInitialStore();
  }

  return normalizeStore(JSON.parse(readFileSync(seedStorePath, 'utf8')));
}

function normalizeStore(parsed) {
  const initialStore = createInitialStore();
  return {
    ...initialStore,
    ...parsed,
    settings: {
      ...initialStore.settings,
      ...(parsed.settings || {}),
      cleaningSchedule: {
        ...initialStore.settings.cleaningSchedule,
        ...(parsed.settings?.cleaningSchedule || {}),
      },
    },
    gatheringsByChannel: parsed.gatheringsByChannel || {},
    cleaningDrawSessions: parsed.cleaningDrawSessions || {},
  };
}
