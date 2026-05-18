import cron from 'node-cron';
import { config } from '../config/env.js';
import { readStore } from '../data/store.js';
import {
  createCleaningDrawSession,
  resetOldCleaningAssignments,
} from '../services/cleaningService.js';
import { buildCleaningPanelMessage } from '../ui/cleaningPanel.js';

let scheduledTask = null;
let scheduledClient = null;

export async function scheduleCleaningPanel(client) {
  scheduledClient = client;
  const store = await readStore();
  rescheduleCleaningPanel(store.settings.cleaningSchedule);
}

export function rescheduleCleaningPanel(schedule) {
  if (!config.cleaningChannelId) {
    console.log('CLEANING_CHANNEL_ID가 없어 월요일 자동 추첨 패널 예약은 건너뜁니다.');
    return;
  }

  if (!scheduledClient) {
    console.log('디스코드 클라이언트가 준비되지 않아 청소 추첨 패널 예약을 건너뜁니다.');
    return;
  }

  if (scheduledTask) {
    scheduledTask.stop();
  }

  const normalized = normalizeSchedule(schedule);
  scheduledTask = cron.schedule(toCronExpression(normalized), async () => {
    const removedCount = await resetOldCleaningAssignments();
    if (removedCount > 0) {
      console.log(`지난 청소 배정 기록 ${removedCount}개를 정리했습니다.`);
    }

    const drawSession = await createCleaningDrawSession();

    const channel = await scheduledClient.channels.fetch(config.cleaningChannelId);
    await channel?.send(buildCleaningPanelMessage(drawSession));
  }, {
    timezone: config.timezone,
  });

  console.log(`${formatScheduleText(normalized)}(${config.timezone}) 청소 추첨 패널 예약 완료`);
}

export function formatScheduleText(schedule) {
  const normalized = normalizeSchedule(schedule);
  return `매주 ${weekdayLabels[normalized.weekday]}요일 ${String(normalized.hour).padStart(2, '0')}:${String(normalized.minute).padStart(2, '0')}`;
}

export function normalizeSchedule(schedule) {
  return {
    weekday: clampInteger(schedule?.weekday, 0, 6, 1),
    hour: clampInteger(schedule?.hour, 0, 23, 12),
    minute: clampInteger(schedule?.minute, 0, 59, 55),
  };
}

function toCronExpression(schedule) {
  return `${schedule.minute} ${schedule.hour} * * ${schedule.weekday}`;
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    return fallback;
  }

  return number;
}

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];
