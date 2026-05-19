import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
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
  const embed = new EmbedBuilder()
    .setColor(winner ? 0xf2c94c : 0x828282)
    .setTitle(title)
    .addFields(
      {
        name: '일정',
        value: `모임일: ${formatDateWithWeekday(gathering.meetingDate)}`,
      },
      {
        name: '선정 후보',
        value: winner ? formatWinner(gathering, winner) : '아직 투표가 없습니다.',
      },
      {
        name: '참여 현황',
        value: [
          `참여자: ${gathering.participants.length}명`,
          `투표수: ${Object.keys(gathering.votes || {}).length}표`,
        ].join('\n'),
        inline: true,
      },
    );

  const ranking = formatRanking(gathering);
  if (ranking) {
    embed.addFields({ name: '후보별 득표', value: truncateField(ranking) });
  }

  const panel = {
    embeds: [embed],
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

function truncateField(value) {
  return value.length > 1024 ? `${value.slice(0, 1020)}...` : value;
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
  const description = venue.description || '';

  return [
    `장소: ${venue.name}`,
    `득표: ${voteCount}표`,
    description,
    venue.venueUrl,
  ].filter(Boolean).join('\n');
}

function countVotes(gathering, venueName) {
  return Object.values(gathering.votes || {}).filter((votedVenue) => votedVenue === venueName).length;
}

function formatRanking(gathering) {
  if (gathering.venueOptions.length === 0) {
    return '';
  }

  return gathering.venueOptions
    .map((venue) => ({
      name: venue.name,
      voteCount: countVotes(gathering, venue.name),
    }))
    .sort((a, b) => b.voteCount - a.voteCount)
    .map((item, index) => `${index + 1}. ${item.name} - ${item.voteCount}표`)
    .join('\n');
}
