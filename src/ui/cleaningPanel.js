import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { config } from '../config/env.js';
import { CLEANING_DRAW_BUTTON_ID } from '../services/cleaningService.js';

export function buildCleaningPanelMessage(drawSession = null) {
  const content = [
    '이번 주 청소 구역 추첨을 시작합니다. 버튼을 누른 사람부터 한 명씩 배정돼요.',
    '35% 확률로 선호 구역이 배정됩니다!',
  ];

  if (drawSession) {
    content.push(`추첨 마감: ${formatTime(drawSession.session.endsAt)}`);
    if (drawSession.exemptMembers.length > 0) {
      content.push('');
      content.push('이번 주 면제 인원');
      content.push(drawSession.exemptMembers.map((member) => `- ${member.name}`).join('\n'));
    }
  }

  return {
    content: content.join('\n'),
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(CLEANING_DRAW_BUTTON_ID)
          .setLabel('청소 구역 뽑기')
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
