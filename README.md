# Context Graph Demo

`Neo4j`를 활용해 Android 모바일 context data 기반 의사결정을 시뮬레이션하는 웹 데모입니다.

데모 목표:

- `YouTube 실행` 시점에 현재 context에서 `noise erase`를 켜야 하는지 판단
- `sharesheet 실행` 시점에 `direct share`와 `app` 순서를 어떻게 재정렬할지 계산
- 위 판단이 `user / device / scenario / app / share target / event` 관계 그래프에서 어떻게 나오는지 시각적으로 확인

## Demo Model

그래프에는 다음 개체를 넣습니다.

- `User`
- `Device`
- `Scenario`
- `App`
- `Contact`
- `ShareTarget`
- `EventType`

핵심 관계 예시:

- `(:User)-[:USES_DEVICE]->(:Device)`
- `(:User)-[:EXPERIENCES]->(:Scenario)`
- `(:Scenario)-[:SOURCE_APP]->(:App)`
- `(:Scenario)-[:RECENT_APP]->(:App)`
- `(:Scenario)-[:BOOSTS { eventType: "sharesheet_open" }]->(:ShareTarget|:App)`
- `(:EventType)-[:HAS_DIRECT_CANDIDATE]->(:ShareTarget)`
- `(:EventType)-[:HAS_APP_CANDIDATE]->(:App)`
- `(:User)-[:INTERACTED_WITH]->(:Contact)`
- `(:User)-[:SHARED_VIA]->(:App)`

## Included Scenarios

- `Morning Commute`
- `Office Focus Block`
- `Cafe Break`
- `Home at Night`

각 시나리오는 다음과 같은 context signal을 가집니다.

- `timeOfDay`
- `locationType`
- `motionState`
- `noiseDb`
- `bluetoothAudio`
- `wearingBuds`
- `focusMode`
- `batteryPct`
- `network`
- `sourceAppId`

## Quick Start

### 1. Neo4j 실행

로컬 Docker를 쓰는 경우:

```bash
docker compose up -d
```

기본 접속 정보:

- Browser: [http://localhost:7474](http://localhost:7474)
- Bolt: `bolt://127.0.0.1:7687`
- User: `neo4j`
- Password: `contextgraph123`

### 2. 환경변수 준비

```bash
copy .env.example .env
```

Aura 또는 별도 Neo4j 인스턴스를 쓰는 경우 `.env` 값을 변경하면 됩니다.

### 3. 의존성 설치

```bash
npm install
```

### 4. 웹 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 엽니다.

### 5. 더미 데이터 적재

UI의 `Seed Demo Graph` 버튼을 누르거나:

```bash
npm run seed
```

## How Simulation Works

### Noise Erase

`noise erase` 판단은 시나리오의 다음 속성을 사용합니다.

- 주변 소음(`noiseDb`)
- Bluetooth / earbuds 오디오 경로
- 이동 상태(`motionState`)
- 이벤트 타입(`youtube_launch`, `sharesheet_open`)
- 집중 모드(`focusMode`)

예:

- `commute-morning + youtube_launch` 조합은 높은 소음 + 이동 중 + 이어버드 활성 상태라서 noise erase 점수가 높게 나옵니다.
- `office-focus + sharesheet_open` 조합은 소음이 낮고 시각적 상호작용 중심이라서 noise erase 우선순위가 낮습니다.

### Direct Share Ranking

`sharesheet_open`에서 direct share 후보는 다음 신호를 합산합니다.

- 기본 prior score
- 시나리오별 boost
- 사용자 contact 상호작용 빈도
- contact 최근성
- 현재 시나리오에서 해당 채널 앱의 최근 사용 여부
- location fit

### App Ordering

앱 순서 재정렬은 다음 신호를 합산합니다.

- 기본 prior score
- 시나리오별 boost
- 사용자 app 공유 이력
- 최근 app 사용 여부
- 현재 source app과 target app 간 affinity

## API

- `GET /api/health`
- `POST /api/seed`
- `GET /api/scenarios`
- `GET /api/graph/:scenarioId`
- `POST /api/simulate`

예시 요청:

```json
{
  "scenarioId": "office-focus",
  "eventType": "sharesheet_open"
}
```

## Extension Ideas

- 실제 Android telemetry를 모방한 timestamped event stream 추가
- `Location`, `Activity`, `AudioRoute`, `NotificationState` 같은 노드 타입 세분화
- Cypher 기반 추천 설명(explainability) 강화
- 동일한 event에 대해 rule-based와 graph-based ranking 비교
- Neo4j Bloom 또는 Browser와 연결해 별도 그래프 탐색 화면 제공
