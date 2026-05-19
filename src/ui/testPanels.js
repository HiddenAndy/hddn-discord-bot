import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';

export const TEST_PANEL_CUSTOM_IDS = {
  gatheringResultPrivate: 'test:gathering-result-private',
  gatheringResultPublic: 'test:gathering-result-public',
  gatheringVoteMessage: 'test:gathering-vote-message',
  gatheringSummary: 'test:gathering-summary',
  cleaningDrawPanel: 'test:cleaning-draw-panel',
  cleaningDrawSelf: 'test:cleaning-draw-self',
  cleaningResultSummary: 'test:cleaning-result-summary',
  cleaningClosedMessage: 'test:cleaning-closed-message',
  lunchRecommend: 'test:lunch-recommend',
};

export function buildGatheringTestPanel(channelName) {
  return {
    content: [
      '**모임 테스트 패널**',
      `채널: ${channelName}`,
      '투표 메시지, 결과 화면, 현황 문구를 새 메시지로 확인합니다.',
    ].join('\n'),
    components: [
      new ActionRowBuilder().addComponents(
        buildButton(TEST_PANEL_CUSTOM_IDS.gatheringVoteMessage, '투표 메시지 게시', ButtonStyle.Primary),
        buildButton(TEST_PANEL_CUSTOM_IDS.gatheringResultPrivate, '결과 미리보기', ButtonStyle.Secondary),
        buildButton(TEST_PANEL_CUSTOM_IDS.gatheringResultPublic, '결과 채널 공지', ButtonStyle.Success),
        buildButton(TEST_PANEL_CUSTOM_IDS.gatheringSummary, '현황 요약', ButtonStyle.Secondary),
      ),
    ],
    flags: MessageFlags.Ephemeral,
  };
}

export function buildCleaningTestPanel() {
  return {
    content: [
      '**청소 테스트 패널**',
      '추첨 패널, 개인 추첨, 결과/마감 문구를 새 메시지로 확인합니다.',
    ].join('\n'),
    components: [
      new ActionRowBuilder().addComponents(
        buildButton(TEST_PANEL_CUSTOM_IDS.cleaningDrawPanel, '추첨 패널 게시', ButtonStyle.Primary),
        buildButton(TEST_PANEL_CUSTOM_IDS.cleaningDrawSelf, '내 추첨 실행', ButtonStyle.Success),
        buildButton(TEST_PANEL_CUSTOM_IDS.cleaningResultSummary, '결과 요약', ButtonStyle.Secondary),
        buildButton(TEST_PANEL_CUSTOM_IDS.cleaningClosedMessage, '마감 안내', ButtonStyle.Secondary),
      ),
    ],
    flags: MessageFlags.Ephemeral,
  };
}

export function buildLunchTestPanel() {
  return {
    content: [
      '**점심 테스트 패널**',
      '점심 추천 응답 문구를 새 메시지로 확인합니다.',
    ].join('\n'),
    components: [
      new ActionRowBuilder().addComponents(
        buildButton(TEST_PANEL_CUSTOM_IDS.lunchRecommend, '추천 응답 확인', ButtonStyle.Primary),
      ),
    ],
    flags: MessageFlags.Ephemeral,
  };
}

function buildButton(customId, label, style) {
  return new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(style);
}
