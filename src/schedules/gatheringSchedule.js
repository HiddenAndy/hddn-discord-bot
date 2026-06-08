import {
  consumeClosedGatheringVoteResults,
  consumeDueGatheringFeedbackRequests,
} from '../services/gatheringService.js';
import { buildGatheringFeedbackRequestMessage } from '../ui/gatheringFeedbackPanel.js';
import { buildGatheringResultPanel } from '../ui/gatheringResultPanel.js';

const intervalMs = 60 * 1000;
let interval = null;
let scheduledClient = null;

export function scheduleGatheringVoteResults(client) {
  scheduledClient = client;

  if (interval) {
    clearInterval(interval);
  }

  interval = setInterval(runGatheringJobs, intervalMs);
  interval.unref?.();
  runGatheringJobs();
}

async function runGatheringJobs() {
  if (!scheduledClient) {
    return;
  }

  await announceClosedVoteResults();
  await sendDueFeedbackRequests();
}

async function announceClosedVoteResults() {
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

async function sendDueFeedbackRequests() {
  const results = await consumeDueGatheringFeedbackRequests();
  await Promise.all(results.map(async ({ channelId, gathering }) => {
    let channelName = channelId;
    try {
      const channel = await scheduledClient.channels.fetch(channelId);
      channelName = channel?.name || channelId;
    } catch (error) {
      console.warn(`${channelId} 채널 정보를 가져오지 못했습니다.`, error);
    }

    await Promise.all(gathering.participants.map(async (participant) => {
      try {
        const user = await scheduledClient.users.fetch(participant.discordUserId);
        await user.send(buildGatheringFeedbackRequestMessage(gathering, channelId, channelName));
      } catch (error) {
        console.warn(`${participant.name}님에게 모임 후기 요청 DM을 보내지 못했습니다.`, error);
      }
    }));
  }));
}
