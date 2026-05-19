import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { createModalContext } from '../interactions/modalContext.js';

export const MEMBER_ADMIN_CUSTOM_IDS = {
  addMember: 'member-admin:add-member',
  refresh: 'member-admin:refresh',
  editMemberSelect: 'member-admin:edit-member-select',
  editSelectedMemberPrefix: 'member-admin:edit-selected-member:',
  memberModal: 'member-admin:member-modal',
  editMemberModalPrefix: 'member-admin:edit-member-modal:',
};

export function buildMemberAdminPanel(snapshot, options = {}) {
  const selectedMember = options.selectedMemberId
    ? snapshot.members.find((member) => member.id === options.selectedMemberId)
    : null;
  const activeMembers = snapshot.members.filter((member) => member.active);
  const linkedMembers = snapshot.members.filter((member) => member.discordUserId);

  return {
    content: [
      '**인원관리 패널**',
      `활성 인원: ${activeMembers.length}/${snapshot.members.length}`,
      `Discord ID 연결: ${linkedMembers.length}/${snapshot.members.length}`,
      selectedMember ? `선택됨: ${selectedMember.name} (${selectedMember.id})` : '선택된 인원: 없음',
      '',
      formatMemberList(snapshot.members),
    ].join('\n'),
    components: [
      buildActionRow(),
      buildMemberSelectRow(snapshot.members, selectedMember?.id),
      buildSelectedMemberActionRow(selectedMember),
    ].filter(Boolean),
    flags: MessageFlags.Ephemeral,
  };
}

export function buildCommonMemberModal(member = null) {
  const contextToken = member ? createModalContext(member.id) : '';

  return new ModalBuilder()
    .setCustomId(member ? `${MEMBER_ADMIN_CUSTOM_IDS.editMemberModalPrefix}${contextToken}` : MEMBER_ADMIN_CUSTOM_IDS.memberModal)
    .setTitle(member ? '인원 수정' : '인원 추가')
    .addComponents(
      buildTextInputRow('id', '멤버 ID', 'Andy', true, member?.id),
      buildTextInputRow('name', '표시 이름', 'Andy', true, member?.name),
      buildTextInputRow('active', '활성 여부', 'Y 또는 N', true, member ? formatActiveInput(member.active) : 'Y'),
      buildTextInputRow('discordUserId', '디스코드 유저 ID', '비워두면 변경 안 함', false, member?.discordUserId),
    );
}

function buildActionRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(MEMBER_ADMIN_CUSTOM_IDS.addMember)
      .setLabel('인원 추가')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(MEMBER_ADMIN_CUSTOM_IDS.refresh)
      .setLabel('새로고침')
      .setStyle(ButtonStyle.Secondary),
  );
}

function buildMemberSelectRow(members, selectedMemberId = '') {
  const options = members.slice(0, 25).map((member) => ({
    label: `${member.active ? 'ON' : 'OFF'} ${member.name}`,
    description: `${member.id} / ${member.discordUserId ? 'Discord ID 연결됨' : 'Discord ID 미연결'}`.slice(0, 100),
    value: member.id,
    default: member.id === selectedMemberId,
  }));

  if (options.length === 0) {
    return null;
  }

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(MEMBER_ADMIN_CUSTOM_IDS.editMemberSelect)
      .setPlaceholder('수정할 인원 선택')
      .addOptions(options),
  );
}

function buildSelectedMemberActionRow(member) {
  if (!member) {
    return null;
  }

  const contextToken = createModalContext(member.id);
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${MEMBER_ADMIN_CUSTOM_IDS.editSelectedMemberPrefix}${contextToken}`)
      .setLabel('선택한 인원 수정')
      .setStyle(ButtonStyle.Secondary),
  );
}

function buildTextInputRow(customId, label, placeholder, required, value = '') {
  const input = new TextInputBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setPlaceholder(placeholder)
    .setRequired(required)
    .setStyle(TextInputStyle.Short);

  if (value) {
    input.setValue(value);
  }

  return new ActionRowBuilder().addComponents(input);
}

function formatMemberList(members) {
  if (members.length === 0) {
    return '- 등록된 인원이 없습니다.';
  }

  return members.slice(0, 20).map((member) => {
    const state = member.active ? 'ON' : 'OFF';
    const linked = member.discordUserId ? `ID ${member.discordUserId}` : 'Discord ID 미연결';
    return `[${state}] ${member.name} (${member.id}, ${linked})`;
  }).join('\n') + (members.length > 20 ? `\n- 외 ${members.length - 20}명` : '');
}

function formatActiveInput(active) {
  return active ? 'Y' : 'N';
}
