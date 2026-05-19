import { registerGuildCommands } from './services/commandRegistrationService.js';

const commandCount = await registerGuildCommands();
console.log(`${commandCount}개 슬래시 명령어를 등록했습니다.`);
