import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { formatDateWithWeekday } from '../utils/date.js';
import { formatVenueList } from './venueFormatters.js';

export const GATHERING_VOTE_SELECT_ID = 'gathering:vote-venue';

export function buildGatheringVoteMessage(gathering, channelName = '') {
  return {
    content: [
      `**${channelName ? `[${channelName}] ` : ''}모임 장소 투표를 시작합니다**`,
      `모임일: ${formatDateWithWeekday(gathering.meetingDate)}`,
      `투표 마감: ${formatDateWithWeekday(gathering.voteDeadline)}`,
      '',
      '**후보 장소**',
      formatVenueList(gathering),
      '',
      '아래 메뉴에서 가고 싶은 장소를 선택해주세요.',
    ].join('\n'),
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
