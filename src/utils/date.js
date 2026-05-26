import { config } from '../config/env.js';

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: config.timezone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function todayKey() {
  return formatKey(getLocalDateParts(new Date()));
}

export function formatDateWithWeekday(dateKey) {
  if (!dateKey) {
    return '미설정';
  }

  const match = String(dateKey).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return dateKey;
  }

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return `${dateKey}(${weekdayLabels[date.getDay()]})`;
}

export function mondayKey(date = new Date()) {
  const parts = getLocalDateParts(date);
  const zonedDate = new Date(parts.year, parts.month - 1, parts.day);
  const day = zonedDate.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  zonedDate.setDate(zonedDate.getDate() + diff);
  return formatKey({
    year: zonedDate.getFullYear(),
    month: zonedDate.getMonth() + 1,
    day: zonedDate.getDate(),
  });
}

export function nowText() {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: config.timezone,
    dateStyle: 'short',
    timeStyle: 'medium',
}).format(new Date());
}

function getLocalDateParts(date) {
  return formatter.formatToParts(date).reduce((result, part) => {
    if (part.type === 'year') result.year = Number(part.value);
    if (part.type === 'month') result.month = Number(part.value);
    if (part.type === 'day') result.day = Number(part.value);
    return result;
  }, {});
}

function formatKey(parts) {
  return [
    parts.year,
    String(parts.month).padStart(2, '0'),
    String(parts.day).padStart(2, '0'),
  ].join('-');
}

const weekdayLabels = ['일', '월', '화', '수', '목', '금', '토'];
