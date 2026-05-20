# GCP Operations Guide

이 문서는 HDDN Discord Bot을 GCP Compute Engine VM에서 운영하거나, 다른 GCP 계정/프로젝트로 이전할 때 필요한 절차를 정리합니다.

## 권장 구성

- 서비스: Compute Engine VM
- 리전/존: `us-central1-a` 권장. Free Tier 대상 리전은 `us-west1`, `us-central1`, `us-east1`입니다.
- 머신 타입: `e2-micro`
- 프로비저닝 모델: Standard. Preemptible/Spot이 아닙니다.
- OS: Debian 12
- 디스크: Standard persistent disk, 30GB 이하
- 실행 방식: systemd 서비스
- 저장소: SQLite
- 저장 위치: 기본 코드 기준 `~/hddn-discord-bot/src/data/store.sqlite`

서울 리전인 `asia-northeast3`도 기술적으로는 사용할 수 있지만, Compute Engine Free Tier 대상 리전이 아니므로 유료 운영으로 봐야 합니다.

## Free Tier 체크리스트

VM 생성 후 다음 조건을 확인합니다.

- Zone이 `us-west1`, `us-central1`, `us-east1` 중 하나인지
- Machine type이 `e2-micro`인지
- Provisioning model이 `STANDARD`인지
- Preemptible/Spot이 꺼져 있는지
- Boot disk가 Standard persistent disk인지
- Boot disk가 30GB 이하인지
- GPU/TPU가 없는지
- 불필요한 스냅샷 일정이 꺼져 있는지
- Ops Agent가 필요 없으면 비활성화되어 있는지

디스크 타입 확인:

```bash
gcloud compute disks describe hddn-discord-bot \
  --zone=us-central1-a \
  --format="get(type,sizeGb)"
```

`pd-standard`와 30GB 이하가 나오면 됩니다.

## VM 접속

GCP 콘솔에서 가장 간단하게 접속할 수 있습니다.

1. Compute Engine > VM instances
2. `hddn-discord-bot` 행의 `SSH` 클릭

로컬 터미널에서 접속할 수도 있습니다.

```bash
gcloud compute ssh hddn-discord-bot --zone=us-central1-a
```

로컬에서 `gcloud compute ssh`를 사용할 때는 VM 내부가 아니라 Mac 로컬 터미널에서 실행해야 합니다.

## 초기 서버 세팅

VM 접속 후 기본 패키지를 설치합니다.

```bash
sudo apt update
sudo apt install -y git curl build-essential python3 make g++ sqlite3
```

Node.js 22 설치:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

Ops Agent가 설치되어 있고 사용하지 않을 경우 비활성화합니다.

```bash
sudo systemctl disable --now google-cloud-ops-agent
sudo systemctl disable --now google-cloud-ops-agent-fluent-bit || true
sudo systemctl disable --now google-cloud-ops-agent-opentelemetry-collector || true
```

상태 확인:

```bash
systemctl status google-cloud-ops-agent
```

`disabled`, `inactive (dead)`이면 됩니다.

## 코드 배포

현재 운영 방식은 별도 봇 전용 사용자 없이 SSH 사용자 홈 디렉터리에 클론하는 방식입니다.

```bash
cd ~
git clone <REPOSITORY_URL> hddn-discord-bot
cd ~/hddn-discord-bot
npm ci --omit=dev
```

`.env` 파일을 생성하고 값을 채웁니다.

```bash
vim .env
chmod 600 .env
```

필수 값:

```env
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=
CLEANING_CHANNEL_ID=
GATHERING_CHANNEL_IDS=
TIMEZONE=Asia/Seoul
PREFERENCE_WIN_RATE=0.35
```

최초 1회 또는 명령어 변경 시 Discord 슬래시 명령어를 등록합니다.

```bash
npm run commands:register
```

직접 실행 테스트:

```bash
npm start
```

정상 로그인 후 `Ctrl + C`로 종료합니다.

## systemd 서비스 등록

현재 사용자와 npm 경로를 확인합니다.

```bash
whoami
pwd
which npm
```

서비스 파일을 엽니다.

```bash
sudo vim /etc/systemd/system/hddn-discord-bot.service
```

예시:

```ini
[Unit]
Description=HDDN Discord Bot
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=<WHOAMI_RESULT>
WorkingDirectory=/home/<WHOAMI_RESULT>/hddn-discord-bot
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

`User`, `WorkingDirectory`, `ExecStart`는 실제 서버 값에 맞춥니다.

서비스 시작:

```bash
sudo systemctl daemon-reload
sudo systemctl enable hddn-discord-bot
sudo systemctl start hddn-discord-bot
sudo systemctl status hddn-discord-bot
```

로그 확인:

```bash
journalctl -u hddn-discord-bot -f
```

## 수동 업데이트

코드 업데이트 후에는 실행 중인 Node 프로세스를 재시작해야 새 코드가 반영됩니다.

```bash
cd ~/hddn-discord-bot
git pull
npm ci --omit=dev
sudo systemctl restart hddn-discord-bot
sudo systemctl status hddn-discord-bot
```

상황별 처리:

- 코드만 바뀐 경우: `git pull` 후 `sudo systemctl restart hddn-discord-bot`
- `package.json` 또는 `package-lock.json`이 바뀐 경우: `npm ci --omit=dev` 후 재시작
- 새 슬래시 명령어를 추가하거나 이름/설명을 바꾼 경우: 재시작 후 Discord에서 `/명령어갱신` 실행
- `.env`를 바꾼 경우: `sudo systemctl restart hddn-discord-bot`

## SQLite 데이터

현재 SQLite 파일은 기본 코드 기준으로 아래 위치에 생성됩니다.

```text
~/hddn-discord-bot/src/data/store.sqlite
```

WAL 모드를 사용하므로 다음 파일이 함께 생길 수 있습니다.

```text
store.sqlite
store.sqlite-shm
store.sqlite-wal
```

운영 중에는 이 파일들을 실수로 덮어쓰지 않도록 주의합니다. 파일 전송 또는 rsync를 사용할 때는 운영 DB 파일을 제외하는 것이 안전합니다.

```bash
rsync -av \
  --exclude node_modules \
  --exclude .git \
  --exclude .env \
  --exclude 'src/data/store.sqlite*' \
  /local/path/hddn-discord-bot/ \
  <VM_USER>@<VM_IP>:~/hddn-discord-bot/
```

## 백업

백업 디렉터리를 만듭니다.

```bash
sudo mkdir -p /var/backups/hddn-discord-bot
sudo chown "$USER:$USER" /var/backups/hddn-discord-bot
```

백업 스크립트를 생성합니다.

```bash
sudo vim /usr/local/bin/backup-hddn-discord-bot.sh
```

내용:

```bash
#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$HOME/hddn-discord-bot"
BACKUP_DIR="/var/backups/hddn-discord-bot"
DATE="$(date +%Y%m%d-%H%M%S)"

sqlite3 "$APP_DIR/src/data/store.sqlite" ".backup '$BACKUP_DIR/store-$DATE.sqlite'"
find "$BACKUP_DIR" -name 'store-*.sqlite' -mtime +14 -delete
```

실행 권한:

```bash
sudo chmod +x /usr/local/bin/backup-hddn-discord-bot.sh
```

백업 테스트:

```bash
/usr/local/bin/backup-hddn-discord-bot.sh
ls -lh /var/backups/hddn-discord-bot
```

매일 새벽 4시 백업:

```bash
crontab -e
```

```cron
0 4 * * * /usr/local/bin/backup-hddn-discord-bot.sh
```

## 다른 GCP 계정으로 서버 이전

새 GCP 계정/프로젝트에서 다음 순서로 진행합니다.

1. Free Tier 조건에 맞는 새 VM 생성
2. 초기 서버 세팅
3. repo clone
4. `.env` 생성
5. 기존 서버에서 SQLite 백업 생성
6. 백업 파일을 새 서버로 전송
7. 새 서버의 `src/data/store.sqlite` 위치에 복원
8. `npm ci --omit=dev`
9. `npm run commands:register`
10. systemd 서비스 등록 및 시작
11. Discord에서 주요 명령어 테스트
12. 기존 서버 중지

기존 서버에서 백업 생성:

```bash
sqlite3 ~/hddn-discord-bot/src/data/store.sqlite ".backup '$HOME/store-transfer.sqlite'"
```

Mac 로컬로 내려받기:

```bash
scp <OLD_VM_USER>@<OLD_VM_IP>:~/store-transfer.sqlite .
```

새 서버로 업로드:

```bash
scp store-transfer.sqlite <NEW_VM_USER>@<NEW_VM_IP>:~/
```

새 서버에서 복원:

```bash
cd ~/hddn-discord-bot
sudo systemctl stop hddn-discord-bot || true
cp ~/store-transfer.sqlite src/data/store.sqlite
rm -f src/data/store.sqlite-shm src/data/store.sqlite-wal
npm ci --omit=dev
npm run commands:register
sudo systemctl start hddn-discord-bot
sudo systemctl status hddn-discord-bot
```

로그 확인:

```bash
journalctl -u hddn-discord-bot -f
```

## 비용 관리

- 예산 알림을 1달러 또는 3달러로 설정합니다.
- 스냅샷 일정은 자동 생성하지 않습니다.
- 사용하지 않는 VM, 디스크, 고정 IP는 삭제합니다.
- 서울 리전은 Free Tier 대상이 아니므로 무료 운영 목적이면 사용하지 않습니다.
- Monitoring/Logging 고급 기능은 사용하지 않습니다.
