import { UserFacingError } from './cleaningService.js';
import { readStore, updateStore } from '../data/store.js';
import { mondayKey } from '../utils/date.js';

export async function getCleaningAdminSnapshot() {
  const store = await readStore();
  const assignmentDate = mondayKey();
  const activeTargetMembers = store.members.filter((member) => member.active && member.discordUserId);
  const completedMemberIds = new Set(
    store.assignments
      .filter((assignment) => assignment.assignmentDate === assignmentDate)
      .map((assignment) => assignment.memberId),
  );

  return {
    members: store.members,
    zones: store.cleaningZones,
    preferences: store.preferences,
    schedule: store.settings.cleaningSchedule,
    drawProgress: {
      completedCount: activeTargetMembers.filter((member) => completedMemberIds.has(member.id)).length,
      targetCount: activeTargetMembers.length,
    },
  };
}

export async function setCleaningMember({ id, name, active, discordUserId = '' }) {
  const memberId = String(id || '').trim();
  const memberName = String(name || id || '').trim();

  if (!memberId) {
    throw new UserFacingError('멤버 ID를 입력해주세요.');
  }

  return updateStore((store) => {
    const existing = store.members.find((member) => member.id === memberId);
    const isActive = active ?? existing?.active ?? true;
    if (existing) {
      existing.name = memberName;
      existing.active = isActive;
      if (discordUserId) existing.discordUserId = discordUserId;
    } else {
      store.members.push({ id: memberId, name: memberName, active: isActive, discordUserId });
    }

    return { id: memberId, name: memberName, active: isActive };
  });
}

export async function getCleaningMember(memberId) {
  const store = await readStore();
  return store.members.find((member) => member.id === memberId) || null;
}

export async function updateCleaningMember(originalMemberId, { id, name, active, discordUserId = '' }) {
  const memberId = String(id || '').trim();
  const memberName = String(name || id || '').trim();

  if (!memberId) {
    throw new UserFacingError('멤버 ID를 입력해주세요.');
  }

  await updateStore((store) => {
    const member = store.members.find((item) => item.id === originalMemberId);
    if (!member) {
      throw new UserFacingError(`멤버를 찾을 수 없어요: ${originalMemberId}`);
    }

    const duplicated = store.members.find((item) => item.id === memberId && item.id !== originalMemberId);
    if (duplicated) {
      throw new UserFacingError(`이미 사용 중인 멤버 ID예요: ${memberId}`);
    }

    member.id = memberId;
    member.name = memberName;
    if (active !== undefined) member.active = active;
    if (discordUserId) member.discordUserId = discordUserId;

    store.preferences.forEach((preference) => {
      if (preference.memberId === originalMemberId) {
        preference.memberId = memberId;
      }
    });

    store.assignments.forEach((assignment) => {
      if (assignment.memberId === originalMemberId) {
        assignment.memberId = memberId;
        assignment.memberName = memberName;
      }
    });
  });

  return { id: memberId, name: memberName, active };
}

export async function setCleaningZone({ category, zone, active, imagePath = '' }) {
  const categoryName = String(category || '').trim();
  const zoneName = String(zone || '').trim();

  if (!categoryName || !zoneName) {
    throw new UserFacingError('카테고리와 구역을 모두 입력해주세요.');
  }

  return updateStore((store) => {
    const existing = store.cleaningZones.find((item) => item.zone === zoneName);
    const isActive = active ?? existing?.active ?? true;
    if (existing && existing.category !== categoryName) {
      throw new UserFacingError(`"${zoneName}"은 이미 "${existing.category}" 카테고리에 있는 구역이에요. 다른 구역명을 입력하거나 기존 카테고리를 선택해주세요.`);
    }

    if (existing) {
      existing.category = categoryName;
      existing.active = isActive;
      existing.imagePath = imagePath;
    } else {
      store.cleaningZones.push({ category: categoryName, zone: zoneName, active: isActive, imagePath });
    }

    return { category: categoryName, zone: zoneName, active: isActive };
  });
}

export async function getCleaningZone(zoneName) {
  const store = await readStore();
  return store.cleaningZones.find((zone) => zone.zone === zoneName) || null;
}

export async function updateCleaningZone(originalZoneName, { category, zone, active, imagePath = '' }) {
  const categoryName = String(category || '').trim();
  const zoneName = String(zone || '').trim();

  if (!categoryName || !zoneName) {
    throw new UserFacingError('카테고리와 구역을 모두 입력해주세요.');
  }

  await updateStore((store) => {
    const zoneItem = store.cleaningZones.find((item) => item.zone === originalZoneName);
    if (!zoneItem) {
      throw new UserFacingError(`청소 구역을 찾을 수 없어요: ${originalZoneName}`);
    }

    const duplicated = store.cleaningZones.find((item) => item.zone === zoneName && item.zone !== originalZoneName);
    if (duplicated) {
      throw new UserFacingError(`이미 사용 중인 구역명이에요: ${zoneName}`);
    }

    zoneItem.category = categoryName;
    zoneItem.zone = zoneName;
    if (active !== undefined) zoneItem.active = active;
    zoneItem.imagePath = imagePath;

    store.assignments.forEach((assignment) => {
      if (assignment.zone === originalZoneName) {
        assignment.zone = zoneName;
        assignment.category = categoryName;
      }
    });
  });

  return { category: categoryName, zone: zoneName, active };
}

export async function setCleaningPreferenceForMember(memberId, categories) {
  const normalizedMemberId = String(memberId || '').trim();
  const normalizedCategories = categories.map((category) => String(category || '').trim()).filter(Boolean);

  if (!normalizedMemberId) {
    throw new UserFacingError('선호구역을 설정할 인원을 선택해주세요.');
  }

  return updateStore((store) => {
    const member = store.members.find((item) => item.id === normalizedMemberId);
    if (!member) {
      throw new UserFacingError(`멤버를 찾을 수 없어요: ${normalizedMemberId}`);
    }

    const activeCategories = new Set(store.cleaningZones.filter((zone) => zone.active).map((zone) => zone.category));
    const invalid = normalizedCategories.find((category) => !activeCategories.has(category));
    if (invalid) {
      throw new UserFacingError(`활성 청소 카테고리에 없는 값이에요: ${invalid}`);
    }

    const uniqueCategories = Array.from(new Set(normalizedCategories)).slice(0, 2);
    const existing = store.preferences.find((preference) => preference.memberId === normalizedMemberId);
    if (existing) {
      existing.categories = uniqueCategories;
    } else {
      store.preferences.push({ memberId: normalizedMemberId, categories: uniqueCategories });
    }

    return {
      member,
      categories: uniqueCategories,
    };
  });
}

export async function setCleaningSchedule(schedule) {
  return updateStore((store) => {
    store.settings.cleaningSchedule = schedule;
    return store.settings.cleaningSchedule;
  });
}
