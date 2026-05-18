import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import { formatDateWithWeekday } from '../utils/date.js';

export const GATHERING_RESULT_CUSTOM_IDS = {
  join: 'gathering-result:join',
  leave: 'gathering-result:leave',
};

export function buildGatheringResultPanel(gathering, channelName = '', options = {}) {
  const { ephemeral = true } = options;
  const winner = getWinningVenue(gathering);
  const title = channelName ? `[${channelName}] 모임 투표 결과` : '모임 투표 결과';
  const panel = {
    content: [
      `**${title}**`,
      '',
      `모임일: ${formatDateWithWeekday(gathering.meetingDate)}`,
      winner ? formatWinner(gathering, winner) : '- 아직 투표가 없어요.',
      '',
      `참여자: ${gathering.participants.length}명`,
    ].join('\n'),
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(GATHERING_RESULT_CUSTOM_IDS.join)
          .setLabel('참여하기')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(GATHERING_RESULT_CUSTOM_IDS.leave)
          .setLabel('신청 취소')
          .setStyle(ButtonStyle.Secondary),
      ),
    ],
  };

  if (ephemeral) {
    panel.flags = MessageFlags.Ephemeral;
  }

  return panel;
}

function getWinningVenue(gathering) {
  const ranked = gathering.venueOptions.map((venue) => ({
    venue,
    voteCount: countVotes(gathering, venue.name),
  }));

  const winner = ranked.reduce((best, current) => {
    if (!best || current.voteCount > best.voteCount) {
      return current;
    }

    return best;
  }, null);

  return winner?.voteCount > 0 ? winner : null;
}

function formatWinner(gathering, winner) {
  const { venue, voteCount } = winner;
  const venueUrl = venue.venueUrl ? `\n장소 URL: ${venue.venueUrl}` : '';
  const description = venue.description ? `\n\n${venue.description}` : '';

  return [
    `장소: ${venue.name}`,
    `득표: ${voteCount}표`,
    `${venueUrl}${description}`,
  ].filter(Boolean).join('\n');
}

function countVotes(gathering, venueName) {
  return Object.values(gathering.votes || {}).filter((votedVenue) => votedVenue === venueName).length;
}
