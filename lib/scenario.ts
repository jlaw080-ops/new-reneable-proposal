// 시나리오 축 기본값 및 매트릭스 헬퍼 (§6 마지막)
import type {
  EngineContext,
  FuelCellProduct,
  ScenarioInput,
  ScenarioResult,
} from "./engine";
import { computeScenario } from "./engine";

/** 기수 축 기본값 [0,1,5,10,…,100]. (참고용 — 실제 축은 buildUnitAxis 로 생성) */
export const DEFAULT_UNIT_AXIS = [0, 1, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100];

/** 기수 축 기본 최대 대수 / 표시 간격. */
export const DEFAULT_MAX_FC_UNITS = 100;
export const DEFAULT_FC_UNIT_STEP = 5;

/** 매트릭스 행 폭주 방지용 상한. */
export const MAX_UNIT_AXIS_ROWS = 200;

/**
 * 연료전지 기수 축 생성: 0부터 maxUnits 까지 step 간격 (양끝 포함).
 * step 은 1 이상 정수, maxUnits 가 step 의 배수가 아니어도 마지막에 maxUnits 를 포함한다.
 */
export function buildUnitAxis(maxUnits: number, step: number): number[] {
  const m = Math.max(0, Math.floor(maxUnits));
  const s = Math.max(1, Math.floor(step));
  const axis: number[] = [];
  for (let u = 0; u <= m && axis.length < MAX_UNIT_AXIS_ROWS; u += s) axis.push(u);
  if (axis.length > 0 && axis[axis.length - 1] !== m && axis.length < MAX_UNIT_AXIS_ROWS) {
    axis.push(m);
  }
  return axis.length > 0 ? axis : [0];
}

/** 태양광 용량 축 600~3,200kW (400 간격 8단계). (참고용 — 실제 축은 buildPvAxis 로 생성) */
export const DEFAULT_PV_AXIS = [600, 1000, 1400, 1800, 2200, 2600, 3000, 3200];

/** 태양광 용량 축 기본 최소/최대/간격. */
export const DEFAULT_MIN_PV_CAPACITY = 600;
export const DEFAULT_MAX_PV_CAPACITY = 3200;
export const DEFAULT_PV_CAPACITY_STEP = 400;

/** 태양광 설치 용량 단위 — 최소 50kW, 50 단위 증가. */
export const PV_CAPACITY_UNIT = 50;

/** 매트릭스 열 폭주 방지용 상한. */
export const MAX_PV_AXIS_COLS = 40;

/** 50kW 단위로 스냅(최소 50). 태양광 용량/간격 입력 정규화. */
export function snapPvCapacity(value: number): number {
  const snapped = Math.round(value / PV_CAPACITY_UNIT) * PV_CAPACITY_UNIT;
  return Math.max(PV_CAPACITY_UNIT, snapped);
}

/**
 * 태양광 용량 축 생성: minKw 부터 maxKw 까지 step 간격 (양끝 포함).
 * step 은 50kW 단위(최소 50)로 스냅된다. 열 폭주 방지 상한 적용.
 */
export function buildPvAxis(minKw: number, maxKw: number, step: number): number[] {
  const s = snapPvCapacity(step);
  const lo = Math.max(0, Math.floor(minKw));
  const hi = Math.max(lo, Math.floor(maxKw));
  const axis: number[] = [];
  for (let v = lo; v <= hi && axis.length < MAX_PV_AXIS_COLS; v += s) axis.push(v);
  if (axis.length > 0 && axis[axis.length - 1] !== hi && axis.length < MAX_PV_AXIS_COLS) {
    axis.push(hi);
  }
  return axis.length > 0 ? axis : [lo];
}

/** 설치면적 = 5㎡/kW (§6). */
export const AREA_PER_KW = 5;

export function areaForPv(pvKw: number): number {
  return pvKw * AREA_PER_KW;
}

/** 열사용비율 축 0~100% step 5%. (참고용 — 실제 축은 buildHeatRatioAxis 로 생성) */
export const DEFAULT_HEAT_RATIO_AXIS = Array.from({ length: 21 }, (_, i) => i * 0.05);

/** 열사용비율 축 기본 표시 간격(%). */
export const DEFAULT_HEAT_RATIO_STEP_PCT = 5;

/** 열사용비율 축 열 폭주 방지 상한. */
export const MAX_HEAT_RATIO_COLS = 101;

/**
 * 열사용비율 축 생성: 0%~100% 를 stepPct(%) 간격으로 (양끝 포함, 비율 0~1 반환).
 * stepPct 는 1 이상 정수.
 */
export function buildHeatRatioAxis(stepPct: number): number[] {
  const s = Math.max(1, Math.floor(stepPct));
  const axis: number[] = [];
  for (let p = 0; p <= 100 && axis.length < MAX_HEAT_RATIO_COLS; p += s) axis.push(p / 100);
  if (axis.length > 0 && Math.abs(axis[axis.length - 1] - 1) > 1e-9 && axis.length < MAX_HEAT_RATIO_COLS) {
    axis.push(1);
  }
  return axis.length > 0 ? axis : [0];
}

export type MatrixMetric =
  | "annualNetProfit"
  | "netProfitAfterDep"
  | "payback"
  | "totalGeneration"
  | "netUsage";

export const METRIC_LABELS: Record<MatrixMetric, string> = {
  annualNetProfit: "연간 순익",
  netProfitAfterDep: "감가상각 반영 순익",
  payback: "투자회수기간",
  totalGeneration: "총 발전량",
  netUsage: "순사용량",
};

export interface MatrixCell {
  fcUnits: number;
  pvCapacityKw: number;
  result: ScenarioResult;
}

/** 기수×용량 매트릭스 계산 (§F3). */
export function computeMatrix(
  product: FuelCellProduct,
  baseInput: ScenarioInput,
  ctx: EngineContext,
  unitAxis: number[] = DEFAULT_UNIT_AXIS,
  pvAxis: number[] = DEFAULT_PV_AXIS,
): MatrixCell[][] {
  return unitAxis.map((fcUnits) =>
    pvAxis.map((pvCapacityKw) => ({
      fcUnits,
      pvCapacityKw,
      result: computeScenario(product, { ...baseInput, fcUnits, pvCapacityKw }, ctx),
    })),
  );
}

export interface HeatMatrixCell {
  fcUnits: number;
  heatUseRatio: number;
  result: ScenarioResult;
}

/**
 * 태양광 용량 고정 + (연료전지 대수 × 열사용비율) 연간순익 매트릭스.
 * 열사용비율을 변화시키므로 열절감은 항상 포함(includeHeatSaving=true)한다.
 */
export function computeHeatRatioMatrix(
  product: FuelCellProduct,
  baseInput: ScenarioInput,
  ctx: EngineContext,
  unitAxis: number[],
  ratioAxis: number[],
  fixedPvKw: number,
): HeatMatrixCell[][] {
  return unitAxis.map((fcUnits) =>
    ratioAxis.map((heatUseRatio) => ({
      fcUnits,
      heatUseRatio,
      result: computeScenario(
        product,
        { ...baseInput, fcUnits, pvCapacityKw: fixedPvKw, heatUseRatio, includeHeatSaving: true },
        ctx,
      ),
    })),
  );
}

/**
 * 매트릭스 셀의 양/음(또는 자급/부족) 판정 → 색상 결정용.
 * 순익·감가상각: 양수=흑자(녹색). 순사용량: ≤0=자급(녹색). 발전량: 큰 값일수록 좋음(중립).
 */
export function metricIsGood(metric: MatrixMetric, r: ScenarioResult): boolean | null {
  switch (metric) {
    case "annualNetProfit":
      return r.annualNetProfit > 0;
    case "netProfitAfterDep":
      return r.netProfitAfterDep > 0;
    case "payback":
      return r.payback != null;
    case "netUsage":
      return r.selfSufficient;
    case "totalGeneration":
      return null; // 중립 지표
  }
}
