# 신재생에너지 경제성 시나리오 검토 웹앱

연료전지 + 태양광 조합의 **시나리오별 경제성 검토**(연간 순익 매트릭스, 감가상각,
Payback, 전력 자급 판정, 열사용비율 민감도, NPV/IRR)를 엑셀 없이 수행하는 웹앱.
원본 엑셀 워크북 3종(고양창릉 — 건물용 / PAFC / SOFC)의 수식을 TypeScript로 재구현했다.

## 기술 스택

- Next.js 14 (App Router) + TypeScript — 정적 배포 가능
- 계산 엔진: `lib/engine/*` 순수 TS (UI 무의존, 100% 단위테스트)
- 상태: Zustand (+ localStorage persist) / 차트: Recharts / 스타일: Tailwind CSS
- 재무 함수(NPV·IRR): 자체 구현 (IRR = Newton-Raphson + 이분법 폴백)

## 실행

```bash
npm install
npm run dev          # 개발 서버 (http://localhost:3000)
npm run build        # 프로덕션 빌드
npm test             # 골든 테스트 (§9) 포함 단위테스트
npm run typecheck    # 타입 검사
npm run lint         # ESLint
```

## 디렉토리

```
data/
  fuel-cell-products.json   # ★ 연료전지 제품 마스터 (코드와 분리, 앱 내 CRUD)
  building-usage.json       # 용도별 단위면적당 에너지사용량 테이블
  tariffs.json              # 에너지 단가 (전기절감/전기비용/가스/열)
  pv-profile.json           # 태양광 가정
  projects/goyang.json          # 골든 테스트용 베이스라인 프리셋(원본 §4.4 4값)
  projects/goyang-profile.json  # 라이브 앱 기본 프로젝트(용도+면적 기반)
lib/engine/                 # 계산 엔진 (types/derive/profit/generation/finance)
lib/                        # 포맷터, 시나리오 축, Zustand 스토어
app/                        # matrix(메인)/products/assumptions/sensitivity/cases/report
components/                 # 공용 UI
tests/golden/               # 골든 테스트 (원본 엑셀 값, 상대오차 1e-4)
```

## 데이터 분리 원칙

연료전지 제품 테이블은 코드와 분리된 `data/fuel-cell-products.json`로 관리한다.
앱의 **제품 관리(`/products`)** 화면에서 행 추가/수정/삭제/복제 및 JSON
가져오기/내보내기가 가능하다. 단가·태양광·프로젝트 가정도 단일 JSON으로 분리되어
**가정값(`/assumptions`)** 화면에서 편집한다. 모든 편집값은 localStorage에 저장된다.

### 프로젝트 가정 — 용도·면적 기반

프로젝트의 전기 베이스라인은 **용도 선택 + 면적 입력**으로 산출한다.

```
총 에너지사용량(kWh/년) = 면적(㎡) × 단위면적당 에너지사용량(용도별, building-usage.json)
전기비용(₩/년)          = 총 에너지사용량 × 전기비용 단가(tariffs.elecCostKrwPerKwh)
```

용도 테이블(`building-usage.json`)과 전기비용 단가는 코드와 분리되어 있다.
오피스/오피스텔 각각 용도·면적을 지정하며, "오피스텔 포함" 토글 시 합산된다.
기본 프로필(`goyang-profile.json`)은 업무 용도·전기비용 단가 142.3333₩/kWh로
원본 고양창릉 베이스라인(오피스 333,082,152.76₩ / 2,340,155.64kWh)을 그대로 재현한다.

## 계산 검증

골든 테스트(`tests/golden/golden.test.ts`)는 원본 엑셀 값 12종을 재현한다.
허용오차는 상대 1e-4 — `tariffs.json`의 단가가 원본 정밀값의 역산 반올림값이라
절대오차로는 센트 단위 차이가 남(상대 1e-4는 12자리 유효숫자 일치를 요구).

골든 테스트의 연료전지 capex는 워크북 값(5,000,000,000/기)을 사용해 재현하고,
실서비스 기본값은 제품 마스터의 장비비(범한 10kW = 250,000,000)를 쓴다.

## 미확정 항목 (TODO)

1. 단가 정밀값: 원본 「요금조건」 시트 확인 후 `tariffs.json` 갱신
2. 케이스평가 시트의 할인율 값 (NPV/할인회수 검증용 — 현재 4.5% 기본)
3. 제품 마스터 `etcCostKrw`(원본 12열)의 의미 — 스택교체비 추정, 발주처 확인
4. 연료전지 이용률(현재 100% 가정) — UI 슬라이더로 노출, 기본 1.0
