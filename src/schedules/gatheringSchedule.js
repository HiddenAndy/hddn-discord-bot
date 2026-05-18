import { consumeClosedGatheringVoteResults } from '../services/gatheringService.js';
import { buildGatheringResultPanel } from '../ui/gatheringResultPanel.js';

const intervalMs = 60 * 1000;
let interval = null;
let scheduledClient = null;

export function scheduleGatheringVoteResults(client) {
  scheduledClient = client;

  if (interval) {
    clearInterval(interval);
  }

  interval = setInterval(announceClosedVoteResults, intervalMs);
  interval.unref?.();
  announceClosedVoteResults();
}

async function announceClosedVoteResults() {
  if (!scheduledClient) {
    return;
  }

  const results = await consumeClosedGatheringVoteResults();
  await Promise.all(results.map(async ({ channelId, gathering }) => {
    try {
      const channel = await scheduledClient.channels.fetch(channelId);
      await channel?.send(buildGatheringResultPanel(gathering, channel?.name || channelId, { ephemeral: false }));
    } catch (error) {
      console.warn(`${channelId} 채널에 모임 투표 결과를 공지하지 못했습니다.`, error);
    }
  }));
}
