import 'dotenv/config';

export const config = {
  token: process.env.DISCORD_TOKEN || '',
  clientId: process.env.DISCORD_CLIENT_ID || '',
  guildId: process.env.DISCORD_GUILD_ID || '',
  cleaningChannelId: process.env.CLEANING_CHANNEL_ID || '',
  gatheringChannelIds: (process.env.GATHERING_CHANNEL_IDS || '')
    .split(',')
    .map((channelId) => channelId.trim())
    .filter(Boolean),
  timezone: process.env.TIMEZONE || 'Asia/Seoul',
  preferenceWinRate: Number(process.env.PREFERENCE_WIN_RATE || 0.35),
};

export function assertRuntimeConfig() {
  const missing = [];
  if (!config.token) missing.push('DISCORD_TOKEN');
  if (!config.clientId) missing.push('DISCORD_CLIENT_ID');
  if (!config.guildId) missing.push('DISCORD_GUILD_ID');

  if (missing.length > 0) {
    throw new Error(`.env에 필수 값이 없습니다: ${missing.join(', ')}`);
  }
}
