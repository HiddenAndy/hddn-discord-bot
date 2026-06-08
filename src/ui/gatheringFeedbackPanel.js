import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { formatDateWithWeekday } from '../utils/date.js';
import { GATHERING_ADMIN_CUSTOM_IDS } from './gatheringAdminPanel.js';

export function buildGatheringFeedbackRequestMessage(gathering, channelId, channelName = '') {
  return {
    embeds: [
      new EmbedBuilder()
        .setColor(0xf2c94c)
        .setTitle(channelName ? `[${channelName}] 모임 후기` : '모임 후기')
        .setDescription('오늘 모임에 대한 별점과 한줄평을 남겨주세요.')
        .addFields(
          { name: '모임일', value: formatDateWithWeekday(gathering.meetingDate), inline: true },
          { name: '응답 항목', value: '별점, 한줄평', inline: true },
        ),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`${GATHERING_ADMIN_CUSTOM_IDS.feedbackOpenPrefix}${channelId}`)
          .setLabel('후기 남기기')
          .setStyle(ButtonStyle.Primary),
      ),
    ],
  };
}
