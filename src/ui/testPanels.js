import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';

export const TEST_PANEL_CUSTOM_IDS = {
  gatheringResultPrivate: 'test:gathering-result-private',
  gatheringResultPublic: 'test:gathering-result-public',
  cleaningDrawPanel: 'test:cleaning-draw-panel',
  cleaningClosedMessage: 'test:cleaning-closed-message',
  lunchRecommend: 'test:lunch-recommend',
};

export function buildGatheringTestPanel(channelName) {
  return {
    content: `**[${channelName}] 모임 기능 테스트**`,
    components: [
      new ActionRowBuilder().addComponents(
        buildButton(TEST_PANEL_CUSTOM_IDS.gatheringResultPrivate, '투표 결과 보기', ButtonStyle.Secondary),
        buildButton(TEST_PANEL_CUSTOM_IDS.gatheringResultPublic, '투표 결과 공지', ButtonStyle.Success),
      ),
    ],
    flags: MessageFlags.Ephemeral,
  };
}

export function buildCleaningTestPanel() {
  return {
    content: '**청소 기능 테스트**',
    components: [
      new ActionRowBuilder().addComponents(
        buildButton(TEST_PANEL_CUSTOM_IDS.cleaningDrawPanel, '추첨 패널 올리기', ButtonStyle.Primary),
        buildButton(TEST_PANEL_CUSTOM_IDS.cleaningClosedMessage, '마감 후 문구 보기', ButtonStyle.Secondary),
      ),
    ],
    flags: MessageFlags.Ephemeral,
  };
}

export function buildLunchTestPanel() {
  return {
    content: '**점심 기능 테스트**',
    components: [
      new ActionRowBuilder().addComponents(
        buildButton(TEST_PANEL_CUSTOM_IDS.lunchRecommend, '추천 테스트', ButtonStyle.Primary),
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
