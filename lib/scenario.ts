// 시나리오 축 기본값 및 매트릭스 헬퍼 (§6 마지막)
import type {
  EngineContext,
  FuelCellProduct,
  ScenarioInput,
  ScenarioResult,
} from "./engine";
import { computeScenario } from "./engine";

/** 기수 축 기본값 [0,1,5,10,…,100]. */
export const DEFAULT_UNIT_AXIS = [0, 1, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100];

/** 태양광 용량 축 600~3,200kW (400 간격 8단계). */
export const DEFAULT_PV_AXIS = [600, 1000, 1400, 1800, 2200, 2600, 3000, 3200];

/** 설치면적 = 5㎡/kW (§6). */
export const AREA_PER_KW = 5;

export function areaForPv(pvKw: number): number {
  return pvKw * AREA_PER_KW;
}

/** 열사용비율 축 0~100% step 5%. */
export const DEFAULT_HEAT_RATIO_AXIS = Array.from({ length: 21 }, (_, i) => i * 0.05);

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
