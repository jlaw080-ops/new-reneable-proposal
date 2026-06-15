// 연간 운영 순익·감가상각·Payback 계산 (§6.1~6.4)
import { derivePerUnit } from "./derive";
import { baselineUsageKwh, netUsage, totalGeneration } from "./generation";
import type {
  DerivedPerUnit,
  EngineContext,
  FuelCellProduct,
  ScenarioInput,
  ScenarioResult,
} from "./types";

/**
 * 1기당 연간 운영 순익 (§6.1).
 * fcNetPerUnit = elecSaving + (includeHeatSaving ? heatUseRatio × heatSavingAt100 : 0)
 *              − gasCost − maintenance
 */
export function fcNetPerUnit(
  derived: DerivedPerUnit,
  input: ScenarioInput,
): number {
  const heat = input.includeHeatSaving
    ? input.heatUseRatio * derived.heatSavingAt100
    : 0;
  // null 유지비는 0으로 취급 (UI 가드가 사전에 입력을 요구, §5)
  const maintenance = derived.maintenancePerUnit ?? 0;
  return derived.elecSavingPerUnit + heat - derived.gasCostPerUnit - maintenance;
}

/** 전기비용 기준(baseline) (§6.1). */
export function baseline(input: ScenarioInput, ctx: EngineContext): number {
  const p = ctx.project;
  return (
    p.officeElecCostKrwPerYear +
    (input.includeOfficetel ? p.officetelElecCostKrwPerYear : 0)
  );
}

/** capex(₩/기) 해석: 오버라이드 > 제품 장비비 > 0 (§9). */
function resolveCapexPerUnit(
  derived: DerivedPerUnit,
  input: ScenarioInput,
): number {
  if (input.capexOverridePerUnit != null) return input.capexOverridePerUnit;
  return derived.capexPerUnit ?? 0;
}

/**
 * 시나리오 전체 계산 (§6.1~6.4).
 * 골든 테스트(§9)의 모든 지표를 한 번에 산출한다.
 */
export function computeScenario(
  product: FuelCellProduct,
  input: ScenarioInput,
  ctx: EngineContext,
): ScenarioResult {
  const derived = derivePerUnit(product, ctx, input.utilization ?? 1);
  const perUnit = fcNetPerUnit(derived, input);
  const base = baseline(input, ctx);

  // 6.1 연간 운영 순익
  const annualNetProfit =
    input.pvCapacityKw * ctx.pv.elecSavingKrwPerKwYear +
    input.fcUnits * perUnit -
    base -
    ctx.pv.fixedMaintenanceKrwPerYear;

  // 6.2 감가상각 반영 순익
  const capexPerUnit = resolveCapexPerUnit(derived, input);
  const annualDep =
    (input.pvCapacityKw * ctx.pv.capexKrwPerKw) / ctx.pv.usefulLifeYears +
    (input.fcUnits * capexPerUnit) / product.usefulLifeYears;
  const netProfitAfterDep = annualNetProfit - annualDep;

  // 6.3 투자회수기간
  const totalCapex =
    input.pvCapacityKw * ctx.pv.capexKrwPerKw + input.fcUnits * capexPerUnit;
  const payback = annualNetProfit > 0 ? totalCapex / annualNetProfit : null;

  // 6.4 전력 생산·자급
  const totalGen = totalGeneration(input, derived, ctx);
  const baseUsage = baselineUsageKwh(input, ctx);
  const net = netUsage(input, derived, ctx);
  const selfSufficient = net <= 0;

  return {
    annualNetProfit,
    annualDep,
    netProfitAfterDep,
    totalCapex,
    payback,
    totalGeneration: totalGen,
    baselineUsageKwh: baseUsage,
    netUsage: net,
    selfSufficient,
    baseline: base,
    fcNetPerUnit: perUnit,
  };
}
