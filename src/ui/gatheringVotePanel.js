import { ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder } from 'discord.js';
import { formatDateWithWeekday } from '../utils/date.js';

export const GATHERING_VOTE_SELECT_ID = 'gathering:vote-venue';

export function buildGatheringVoteMessage(gathering, channelName = '') {
  const embed = new EmbedBuilder()
    .setColor(0x27ae60)
    .setTitle(channelName ? `[${channelName}] 모임 장소 투표` : '모임 장소 투표')
    .setDescription('아래 선택 메뉴에서 가고 싶은 장소를 골라주세요. 선택하면 모임 참여도 함께 신청됩니다.')
    .addFields(
      {
        name: '일정',
        value: [
          `모임일: ${formatDateWithWeekday(gathering.meetingDate)}`,
          `투표 마감: ${formatDateWithWeekday(gathering.voteDeadline)}`,
        ].join('\n'),
      },
      {
        name: '후보 장소',
        value: truncateField(formatVenueOptions(gathering)),
      },
    );

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(GATHERING_VOTE_SELECT_ID)
          .setPlaceholder('장소 선택')
          .addOptions(gathering.venueOptions.slice(0, 25).map((venue) => ({
            label: venue.name.slice(0, 100),
            description: venue.description ? venue.description.slice(0, 100) : undefined,
            value: venue.name,
          }))),
      ),
    ],
  };
}

function truncateField(value) {
  return value.length > 1024 ? `${value.slice(0, 1020)}...` : value;
}

function formatVenueOptions(gathering) {
  if (gathering.venueOptions.length === 0) {
    return '- 아직 후보 장소가 없습니다.';
  }

  return gathering.venueOptions.map((venue, index) => {
    const voteCount = Object.values(gathering.votes || {}).filter((votedVenue) => votedVenue === venue.name).length;
    const url = venue.venueUrl ? `\n  ${venue.venueUrl}` : '';
    const description = venue.description ? `\n  ${venue.description.replace(/\n/g, '\n  ')}` : '';
    return `${index + 1}. ${venue.name} (${voteCount}표)${url}${description}`;
  }).join('\n');
}
