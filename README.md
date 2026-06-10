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
  tariffs.json              # 에너지 단가 (계절·부하별 전기/가스/열 매트릭스 + 건물 베이스라인 단가)
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
프로젝트는 **용도 세그먼트 목록**으로 정의한다 — 가정값 화면에서 용도를 자유롭게
추가/삭제하고, 각 세그먼트의 **평가 포함 체크박스**로 베이스라인 합산 여부를 정한다.
(오피스/오피스텔 고정 구분은 폐지됨) 기본 프로필(`goyang-profile.json`)은 업무 용도·
전기비용 단가 142.3333₩/kWh로, 오피스 세그먼트만 포함했을 때 원본 고양창릉
베이스라인(333,082,152.76₩ / 2,340,155.64kWh)을 그대로 재현한다.

## 파생 계산 — 월별 엔진 (§2~4)

연료전지 전기절감·열절감·가스비용은 **계절·부하별 월간 누적**으로 계산한다
(`lib/engine/derive.ts` + `calendar.ts`). 월별로 일수·계절(여름/봄가을/겨울)·
부하단가(중간/최대)를 적용해 1년을 합산하며, `derivePerUnit`의 공개 시그니처
(product → per-unit 절감액 객체)는 유지되어 §6 시나리오 엔진이 그대로 호출한다.
운전조건(중간부하 18h + 최대부하 6h)은 `EngineContext.operatingHours`로 조정 가능하다.

> 기존 단일 평균단가(185/68.6/86)는 이 월별 모델의 역산 평균이었다. 따라서 새 엔진의
> 연간 집계값은 기존 골든값(범한10kW: 전기 16,208,082.81 / 가스 11,418,820.92 /
> 열 9,957,127.18)을 그대로 재현하며, §9 골든 프로핏 테스트도 변경 없이 통과한다.

## 계산 검증

골든 테스트(`tests/golden/golden.test.ts`)는 원본 엑셀 값 12종을 재현한다.
`tests/golden/derive.test.ts`는 월별 엔진의 원본 셀 값(§5: 1월 가스/생산/절감, 계절별 전기절감 등)을 검증한다.
허용오차는 상대 1e-4 — `tariffs.json`의 단가가 원본 정밀값의 역산 반올림값이라
절대오차로는 센트 단위 차이가 남(상대 1e-4는 12자리 유효숫자 일치를 요구).

골든 테스트의 연료전지 capex는 워크북 값(5,000,000,000/기)을 사용해 재현하고,
실서비스 기본값은 제품 마스터의 장비비(범한 10kW = 250,000,000)를 쓴다.

## 미확정 항목 (TODO)

1. 단가 정밀값: 원본 「요금조건」 시트 확인 후 `tariffs.json` 갱신
2. 케이스평가 시트의 할인율 값 (NPV/할인회수 검증용 — 현재 4.5% 기본)
3. 제품 마스터 `etcCostKrw`(원본 12열)의 의미 — 스택교체비 추정, 발주처 확인
4. 연료전지 이용률(현재 100% 가정) — UI 슬라이더로 노출, 기본 1.0
