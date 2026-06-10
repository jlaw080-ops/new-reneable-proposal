// 파생 계산 (§4) — 월별 계산 엔진 (원본 수식 1:1)
// 기존 단일 평균단가(185/68.6/86) 곱셈을 계절·부하별 월간 누적으로 대체.
// 공개 함수 시그니처(derivePerUnit: product → per-unit 절감액 객체)는 유지해
// §6 시나리오 엔진이 그대로 호출한다. 내부 구현만 월별로 바뀐다.
import { DAYS_IN_MONTH, DAYS_IN_YEAR, seasonOf } from "./calendar";
import {
  DEFAULT_OPERATING_HOURS,
  type DerivedPerUnit,
  type EngineContext,
  type FuelCellProduct,
  type MonthlyDerived,
  type OperatingHours,
} from "./types";

/** 기존 export 유지(연 가동시간 = 24h × 365). 일부 외부 참조 호환용. */
export const DEFAULT_HOURS_PER_YEAR = 8760;

/**
 * 제품 1기당 월별 파생 내역 (§4.2, 원본 셀 1:1).
 *
 * 전기 절감 (연료전지에너지요금절감액 D/F/H/J열):
 *   basicCharge = capacityKw × basicChargeKrwPerKw
 *   midGen      = capacityKw × midLoadHours  × days
 *   peakGen     = capacityKw × peakLoadHours × days
 *   elecSaving  = (basicCharge + midGen×rate.mid + peakGen×rate.peak) × vatFundFactor
 *
 * 열 절감 (L/N열, 열사용율 1.0 기준 — §6 에서 ×heatUseRatio):
 *   heatMcal      = days × heatOutputKw × (mid+peak) × mcalFactor × 1.0
 *   heatSaving100 = heatMcal × 1000 / wholesaleRetailRatio / maxCalorificValue
 *                   × retailKrwPerNm3 × vatFactor
 *
 * 가스 비용 (연료전지비용조건 F/N열):
 *   gasNm3  = fuelConsumptionKw × (mid+peak) × kwToNm3Factor × days
 *   gasCost = gasNm3 × wholesaleKrwPerNm3 × vatFactor
 *
 * @param utilization 연료전지 이용률(기본 1.0). 생산량 의존 항목(생산/열/가스)에 선형 적용,
 *                    월 기본료(basicCharge)는 고정(회피 계약기본료 성격).
 */
export function deriveMonthly(
  product: FuelCellProduct,
  ctx: EngineContext,
  utilization = 1,
  operating: OperatingHours = ctx.operatingHours ?? DEFAULT_OPERATING_HOURS,
): MonthlyDerived[] {
  const { electricity, gas, heat } = ctx.tariffs;
  const cap = product.capacityKw;
  const mid = operating.midLoadHours;
  const peak = operating.peakLoadHours;
  const u = utilization;

  const rows: MonthlyDerived[] = [];
  for (let m = 1; m <= 12; m++) {
    const days = DAYS_IN_MONTH[m - 1];
    const season = seasonOf(m);
    const rate = electricity.seasonalLoadRateKrwPerKwh[season];

    const basicCharge = cap * electricity.basicChargeKrwPerKw; // 고정(이용률 미적용)
    const midGen = cap * mid * days * u;
    const peakGen = cap * peak * days * u;
    const elecSaving =
      (basicCharge + midGen * rate.mid + peakGen * rate.peak) *
      electricity.vatFundFactor;

    const heatMcal = days * product.heatOutputKw * (mid + peak) * heat.mcalFactor * u;
    const heatSaving100 =
      (((heatMcal * 1000) / heat.wholesaleRetailRatio / heat.maxCalorificValue) *
        heat.retailKrwPerNm3) *
      heat.vatFactor;

    const gasNm3 = product.fuelConsumptionKw * (mid + peak) * gas.kwToNm3Factor * days * u;
    const gasCost = gasNm3 * gas.wholesaleKrwPerNm3 * gas.vatFactor;

    rows.push({
      month: m,
      days,
      season,
      basicCharge,
      midGen,
      peakGen,
      elecSaving,
      heatMcal,
      heatSaving100,
      gasNm3,
      gasCost,
    });
  }
  return rows;
}

/**
 * 제품 1기당 파생 경제성 (§4.3 — 월별 집계 → 기존 인터페이스로 반환).
 * 공개 시그니처 유지: §6 시나리오 엔진은 변경 없이 호출한다.
 */
export function derivePerUnit(
  product: FuelCellProduct,
  ctx: EngineContext,
  utilization = 1,
): DerivedPerUnit {
  const operating = ctx.operatingHours ?? DEFAULT_OPERATING_HOURS;
  const months = deriveMonthly(product, ctx, utilization, operating);

  let elecSavingPerUnit = 0;
  let heatSavingAt100 = 0;
  let gasCostPerUnit = 0;
  for (const r of months) {
    elecSavingPerUnit += r.elecSaving;
    heatSavingAt100 += r.heatSaving100;
    gasCostPerUnit += r.gasCost;
  }

  const generationPerUnit =
    product.capacityKw *
    (operating.midLoadHours + operating.peakLoadHours) *
    DAYS_IN_YEAR *
    utilization;

  return {
    generationPerUnit,
    elecSavingPerUnit,
    heatSavingAt100,
    gasCostPerUnit,
    maintenancePerUnit: product.annualMaintenanceKrw,
    capexPerUnit: product.equipmentCostKrw,
  };
}

/**
 * 시나리오 계산 전 null 필드 가드 (§5).
 * 장비비/유지비가 null인 제품은 선택 시 입력을 요구한다.
 */
export function missingCostFields(product: FuelCellProduct): string[] {
  const missing: string[] = [];
  if (product.equipmentCostKrw == null) missing.push("equipmentCostKrw");
  if (product.annualMaintenanceKrw == null) missing.push("annualMaintenanceKrw");
  return missing;
}
