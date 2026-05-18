import { AttachmentBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { config } from '../config/env.js';
import {
  buildResultSummary,
  findMemberByDiscordUser,
  getThisWeekExemptMembers,
  getThisWeekAssignments,
  resolveAssignmentImagePath,
  UserFacingError,
} from '../services/cleaningService.js';
import { getCleaningAdminSnapshot } from '../services/cleaningAdminService.js';
import { isAdmin } from '../utils/permissions.js';
import { readStore, updateStore } from '../data/store.js';
import { buildCleaningAdminPanel } from '../ui/cleaningAdminPanel.js';
import { buildCleaningTestPanel } from '../ui/testPanels.js';

const commandNames = {
  user: '청소',
  admin: '청소관리',
  test: '청소테스트',
};

const subcommandNames = {
  settingsPanel: '설정패널',
  preference: '선호구역',
  preferenceView: '선호확인',
  resultView: '결과보기',
};

const optionNames = {
  firstPreference: '1순위',
  secondPreference: '2순위',
};

const manageSubcommands = [subcommandNames.settingsPanel];
const userSubcommands = [subcommandNames.preference, subcommandNames.preferenceView, subcommandNames.resultView];

export const cleaningUserCommands = [
  {
    data: new SlashCommandBuilder()
      .setName(commandNames.user)
      .setDescription('청소 구역 추첨')
      .addSubcommand((subcommand) => subcommand
        .setName(subcommandNames.preference)
        .setDescription('[청소] 내 선호 구역을 최대 2개까지 설정합니다.')
        .addStringOption((option) => option.setName(optionNames.firstPreference).setDescription('선호 카테고리를 선택하세요.').setRequired(true).setAutocomplete(true))
        .addStringOption((option) => option.setName(optionNames.secondPreference).setDescription('선호 카테고리를 선택하세요.').setAutocomplete(true)))
      .addSubcommand((subcommand) => subcommand
        .setName(subcommandNames.preferenceView)
        .setDescription('[청소] 내가 설정한 선호 구역을 확인합니다.'))
      .addSubcommand((subcommand) => subcommand
        .setName(subcommandNames.resultView)
        .setDescription('[청소] 이번 주 모든 청소 배정 결과를 봅니다.')),
    execute: handleCleaningCommand,
  },
];

export const cleaningAdminCommands = [
  {
    data: new SlashCommandBuilder()
      .setName(commandNames.admin)
      .setDescription('[청소관리] 청소 구역 관리자 설정')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
      .addSubcommand((subcommand) => subcommand
        .setName(subcommandNames.settingsPanel)
        .setDescription('[청소관리] 버튼과 선택 메뉴로 청소 설정을 관리합니다.')),
    execute: handleCleaningCommand,
  },
  {
    data: new SlashCommandBuilder()
      .setName(commandNames.test)
      .setDescription('[청소테스트] 청소 추첨 패널과 마감 후 안내를 테스트합니다.')
      .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    execute: handleCleaningTestCommand,
  },
];

export const cleaningCommands = [
  ...cleaningUserCommands,
  ...cleaningAdminCommands,
];

async function handleCleaningCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();
  const isManageCommand = interaction.commandName === commandNames.admin;

  assertCleaningCommandAccess(interaction, isManageCommand, subcommand);

  if (subcommand === subcommandNames.settingsPanel) {
    await interaction.reply(buildCleaningAdminPanel(await getCleaningAdminSnapshot()));
    return;
  }

  if (subcommand === subcommandNames.preference) {
    await setCleaningPreference(interaction);
    return;
  }

  if (subcommand === subcommandNames.preferenceView) {
    await showCleaningPreference(interaction);
    return;
  }

  if (subcommand === subcommandNames.resultView) {
    const store = await readStore();
    const assignments = getThisWeekAssignments(store);
    const member = findMemberByDiscordUser(store.members, interaction.user, interaction.member);
    const myAssignment = member
      ? assignments.find((assignment) => assignment.memberId === member.id)
      : null;
    const imagePath = await resolveAssignmentImagePath(myAssignment, store);
    const files = imagePath ? [new AttachmentBuilder(imagePath)] : [];
    const exemptMembers = await getThisWeekExemptMembers(store);
    await interaction.reply({ content: buildResultSummary(assignments, exemptMembers), files, flags: MessageFlags.Ephemeral });
  }
}

async function handleCleaningTestCommand(interaction) {
  assertCleaningCommandAccess(interaction, true, commandNames.test);
  await interaction.reply(buildCleaningTestPanel());
}

function assertCleaningCommandAccess(interaction, isManageCommand, subcommand) {
  if (config.cleaningChannelId && interaction.channelId !== config.cleaningChannelId) {
    throw new UserFacingError('청소 명령어는 지정된 청소 채널에서만 사용할 수 있어요.');
  }

  if (isManageCommand && !isAdmin(interaction)) {
    throw new UserFacingError('이 명령어는 관리자만 사용할 수 있어요.');
  }

  if (!isManageCommand && manageSubcommands.includes(subcommand)) {
    throw new UserFacingError('관리자 설정은 `/청소관리` 명령어를 사용해주세요.');
  }

  if (isManageCommand && userSubcommands.includes(subcommand)) {
    throw new UserFacingError('일반 청소 기능은 `/청소` 명령어를 사용해주세요.');
  }
}

async function showCleaningPreference(interaction) {
  const store = await readStore();
  const member = findInteractionMember(store, interaction);

  if (!member) {
    throw new UserFacingError('추첨 인원으로 등록되어 있지 않아요. 먼저 관리자에게 디스코드 유저 연결을 요청해주세요.');
  }

  const preference = store.preferences.find((item) => item.memberId === member.id);
  if (!preference || preference.categories.length === 0) {
    await interaction.reply({ content: `${member.name}님은 아직 선호 구역을 설정하지 않았어요.`, flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.reply({
    content: [
      `${member.name}님의 현재 선호 구역`,
      `1순위: ${preference.categories[0] || '없음'}`,
      `2순위: ${preference.categories[1] || '없음'}`,
    ].join('\n'),
    flags: MessageFlags.Ephemeral,
  });
}

async function setCleaningPreference(interaction) {
  const first = interaction.options.getString(optionNames.firstPreference, true).trim();
  const second = interaction.options.getString(optionNames.secondPreference)?.trim();

  const result = await updateStore((store) => {
    const member = findInteractionMember(store, interaction);

    if (!member) {
      throw new UserFacingError('추첨 인원으로 등록되어 있지 않아요. 먼저 관리자에게 디스코드 유저 연결을 요청해주세요.');
    }

    const activeCategories = new Set(store.cleaningZones.filter((zone) => zone.active).map((zone) => zone.category));
    const categories = [first, second].filter(Boolean);
    const invalid = categories.find((category) => !activeCategories.has(category));
    if (invalid) {
      throw new UserFacingError(`활성 청소 카테고리에 없는 값이에요: ${invalid}`);
    }

    const existing = store.preferences.find((item) => item.memberId === member.id);
    if (existing) {
      existing.categories = categories;
    } else {
      store.preferences.push({ memberId: member.id, categories });
    }

    return { member, categories };
  });

  await interaction.reply({ content: `${result.member.name}님 선호 구역 설정 완료: ${result.categories.join(', ')}`, flags: MessageFlags.Ephemeral });
}

function findInteractionMember(store, interaction) {
  return store.members.find((item) => item.discordUserId === interaction.user.id)
    || store.members.find((item) => item.id.toUpperCase() === interaction.user.username.toUpperCase())
    || store.members.find((item) => item.name.toUpperCase() === interaction.member.displayName.toUpperCase());
}
