import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { config } from '../config/env.js';
import { CLEANING_DRAW_BUTTON_ID } from '../services/cleaningService.js';

export function buildCleaningPanelMessage(drawSession = null) {
  const embed = new EmbedBuilder()
    .setColor(0x2f80ed)
    .setTitle('이번 주 청소 구역 추첨')
    .setDescription('버튼을 누른 순서대로 한 명씩 구역이 배정됩니다.')
    .addFields(
      {
        name: '진행 방식',
        value: [
          '- 등록된 활성 인원만 참여할 수 있습니다.',
          '- 이미 배정된 구역은 다시 나오지 않습니다.',
          '- 선호 구역은 35% 확률로 먼저 시도합니다.',
        ].join('\n'),
      },
    );

  if (drawSession) {
    embed.addFields({
      name: '추첨 마감',
      value: formatTime(drawSession.session.endsAt),
      inline: true,
    });

    if (drawSession.exemptMembers.length > 0) {
      embed.addFields({
        name: '이번 주 면제 인원',
        value: drawSession.exemptMembers.map((member) => `- ${member.name}`).join('\n'),
      });
    }
  }

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(CLEANING_DRAW_BUTTON_ID)
          .setLabel('구역 뽑기')
          .setStyle(ButtonStyle.Primary),
      ),
    ],
  };
}

function formatTime(value) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: config.timezone,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}
