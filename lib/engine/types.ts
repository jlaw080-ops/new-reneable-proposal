// 계산 엔진 타입 정의 (UI 무의존, §3 디렉토리 구조)

/** 연료전지 제품 마스터 (§4.1). 코드와 분리된 데이터로 관리. */
export interface FuelCellProduct {
  id: string;
  type: "PEMFC" | "SOFC" | "PAFC" | string; // 형식
  maker: string; // 메이커
  name: string; // 제품명
  capacityKw: number; // 발전용량(kW)
  heatOutputKw: number; // 열생산량(kW, 시간당)
  fuelConsumptionKw: number; // 연료소비량(kW)
  elecEfficiencyPct: number; // 발전효율(%)
  heatEfficiencyPct: number; // 열효율(%)
  equipmentCostKrw: number | null; // 장비비(₩/기)
  annualMaintenanceKrw: number | null; // 연간유지비(₩/기·년)
  etcCostKrw: number | null; // 원본 12열(헤더 없음, 스택교체비 추정 — 확인 필요)
  usefulLifeYears: number; // 기본 15 (모델 미명시 표준 가정)
  needsReview?: string[]; // 검증 필요 필드 표시
}

/** 에너지 단가 (§4.2). */
export interface Tariffs {
  elecSavingKrwPerKwh: number;
  /** 건물 전기비용 단가 — 에너지사용량(kWh)을 전기비용(₩)으로 환산. */
  elecCostKrwPerKwh: number;
  gasCostKrwPerKwh: number;
  heatSavingKrwPerKwh: number;
  note?: string;
}

/** 용도별 단위면적당 에너지사용량 한 행. */
export interface BuildingUsageType {
  name: string; // 용도 (예: 업무, 의료, 판매)
  energyPerAreaKwh: number; // 단위면적당 에너지사용량 (kWh/㎡·년)
}

/** 용도 테이블. 코드와 분리된 데이터로 관리. */
export interface BuildingUsageTable {
  unit?: string;
  note?: string;
  types: BuildingUsageType[];
}

/**
 * 프로젝트 용도 세그먼트 — 용도 + 면적 + 평가 포함 여부.
 * 사용자가 여러 용도를 자유롭게 추가/삭제하고, 체크박스로 베이스라인 포함 여부를 정한다.
 */
export interface UsageSegment {
  id: string;
  label: string; // 사용자 라벨 (예: 오피스, 상가동)
  usageType: string; // 용도 (building-usage 테이블 참조)
  areaM2: number; // 면적(㎡)
  included: boolean; // 평가(베이스라인) 포함 여부
}

/**
 * 프로젝트 가정 — 용도 세그먼트 목록 기반 (사용자 요구 반영).
 * 포함(included) 세그먼트들의 총 에너지사용량·전기비용이 베이스라인이 된다.
 */
export interface ProjectProfile {
  name: string;
  segments: UsageSegment[];
}

/** 태양광 가정 (§4.3). */
export interface PvProfile {
  elecSavingKrwPerKwYear: number;
  fixedMaintenanceKrwPerYear: number;
  generationKwhPerKwYear: number;
  capexKrwPerKw: number;
  usefulLifeYears: number;
}

/** 프로젝트 가정 (§4.4). */
export interface Project {
  name: string;
  officeElecCostKrwPerYear: number;
  officetelElecCostKrwPerYear: number;
  officeUsageKwhPerYear: number;
  officetelUsageKwhPerYear: number;
}

/** 시나리오 입력 (§6). */
export interface ScenarioInput {
  fcUnits: number; // 기수
  pvCapacityKw: number; // 태양광 용량(kW)
  heatUseRatio: number; // 열사용비율 0~1
  includeOfficetel: boolean;
  includeHeatSaving: boolean; // 열절감 토글
  /** 연료전지 이용률 (기본 1.0, §10-4 파라미터화). */
  utilization?: number;
  /**
   * 골든 테스트/케이스용 capex 오버라이드(₩/기). 미지정 시 제품 마스터 장비비 사용.
   * §9: 골든 테스트는 워크북 값(5e9)을, 실서비스는 제품 마스터 장비비를 사용.
   */
  capexOverridePerUnit?: number;
}

/** 전 계산에 필요한 가정값 묶음. */
export interface EngineContext {
  tariffs: Tariffs;
  pv: PvProfile;
  project: Project;
  /** 연간 가동시간 H (기본 8760, §5). */
  hoursPerYear?: number;
}

/** 제품 1기당 파생 경제성 (§5). */
export interface DerivedPerUnit {
  generationPerUnit: number; // kWh/기·년
  elecSavingPerUnit: number; // ₩
  heatSavingAt100: number; // ₩ (열사용비율 100% 기준)
  gasCostPerUnit: number; // ₩
  maintenancePerUnit: number | null; // ₩ (null 가드 필요)
  capexPerUnit: number | null; // ₩ (null 가드 필요)
}

/** 시나리오 계산 결과 (§6). */
export interface ScenarioResult {
  annualNetProfit: number; // 표1·표2
  annualDep: number; // 감가상각
  netProfitAfterDep: number; // 표3
  totalCapex: number;
  payback: number | null; // 표4 (null → 회수불가)
  totalGeneration: number; // 표5·6
  baselineUsageKwh: number;
  netUsage: number; // 순사용량 (표7)
  selfSufficient: boolean; // 자급 판정
  baseline: number; // 전기비용 기준(baseline)
  fcNetPerUnit: number; // 1기당 운영 순익
}
