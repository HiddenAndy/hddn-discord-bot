export const defaultMembers = [
  { id: 'Andy', name: 'Andy', active: true, discordUserId: '1503245272871079976' },
  { id: 'Jinuk', name: 'Jinuk', active: false, discordUserId: '' },
  { id: 'Daisy', name: 'Daisy', active: false, discordUserId: '' },
  { id: 'Jenny', name: 'Jenny', active: false, discordUserId: '' },
  { id: 'Jpark', name: 'Jpark', active: false, discordUserId: '' },
  { id: 'Joy', name: 'Joy', active: false, discordUserId: '' },
  { id: 'Zito', name: 'Zito', active: false, discordUserId: '' },
  { id: 'Ellie', name: 'Ellie', active: false, discordUserId: '' },
  { id: 'Jalynne', name: 'Jalynne', active: false, discordUserId: '' },
  { id: 'Saiah', name: 'Saiah', active: false, discordUserId: '' },
];

export const defaultCleaningZones = [
  { category: '바닥 걸레', zone: '바닥 걸레 A(테이블)', active: true, imagePath: 'assets/cleaning-zones/mop_a.png' },
  { category: '바닥 걸레', zone: '바닥 걸레 B(방)', active: true, imagePath: 'assets/cleaning-zones/mop_b.png' },
  { category: '바닥 걸레', zone: '바닥 걸레 C(탕비실)', active: true, imagePath: 'assets/cleaning-zones/mop_c.png' },
  { category: '먼지', zone: '먼지 A(공용컴)', active: true, imagePath: 'assets/cleaning-zones/dust_a.png' },
  { category: '먼지', zone: '먼지 B(탕비실)', active: true, imagePath: 'assets/cleaning-zones/dust_b.png' },
  { category: '먼지', zone: '먼지 C(방)', active: true, imagePath: 'assets/cleaning-zones/dust_c.png' },
  { category: '먼지', zone: '먼지 D(책장)', active: false, imagePath: 'assets/cleaning-zones/dust_d.png' },
  { category: '청소기', zone: '청소기 A(밖)', active: true, imagePath: 'assets/cleaning-zones/vacuum_a.png' },
  { category: '청소기', zone: '청소기 B(안)', active: true, imagePath: 'assets/cleaning-zones/vacuum_b.png' },
  { category: '주방', zone: '주방 A(전자렌지,오븐)', active: true, imagePath: 'assets/cleaning-zones/kitchen_a.png' },
  { category: '주방', zone: '주방 B(정수기,커피머신)', active: true, imagePath: 'assets/cleaning-zones/kitchen_b.png' },
  { category: '주방', zone: '주방 C(냉장고,계수대)', active: false, imagePath: 'assets/cleaning-zones/kitchen_c.png' },
  { category: '간식 정리 채우기', zone: '간식 정리 채우기', active: false, imagePath: 'assets/cleaning-zones/snacks.png' },
  { category: '식물 물 주기', zone: '식물 물 주기', active: true, imagePath: 'assets/cleaning-zones/plants.png' },
];

export const defaultPreferences = [
  { memberId: 'Andy', categories: ['먼지'] },
  { memberId: 'Jpark', categories: ['먼지', '청소기'] },
];
