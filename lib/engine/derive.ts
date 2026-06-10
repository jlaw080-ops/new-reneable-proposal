// 파생 계산 (§5): 제품 마스터 → 1기당 경제성
import type {
  DerivedPerUnit,
  EngineContext,
  FuelCellProduct,
} from "./types";

/** 기본 연간 가동시간 (이용률 100%, §5). */
export const DEFAULT_HOURS_PER_YEAR = 8760;

/**
 * 제품 1기당 파생 경제성을 계산한다 (§5).
 *
 * generationPerUnit   = capacityKw × H × utilization
 * elecSavingPerUnit   = generationPerUnit × tariffs.elecSavingKrwPerKwh
 * heatSavingAt100     = heatOutputKw × H × utilization × tariffs.heatSavingKrwPerKwh
 * gasCostPerUnit      = fuelConsumptionKw × H × utilization × tariffs.gasCostKrwPerKwh
 * maintenancePerUnit  = product.annualMaintenanceKrw
 * capexPerUnit        = product.equipmentCostKrw
 */
export function derivePerUnit(
  product: FuelCellProduct,
  ctx: EngineContext,
  utilization = 1,
): DerivedPerUnit {
  const H = ctx.hoursPerYear ?? DEFAULT_HOURS_PER_YEAR;
  const t = ctx.tariffs;

  const generationPerUnit = product.capacityKw * H * utilization;
  const elecSavingPerUnit = generationPerUnit * t.elecSavingKrwPerKwh;
  const heatSavingAt100 =
    product.heatOutputKw * H * utilization * t.heatSavingKrwPerKwh;
  const gasCostPerUnit =
    product.fuelConsumptionKw * H * utilization * t.gasCostKrwPerKwh;

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
 * 시나리오 계산 전 null 필드 가드 (§5 마지막 줄).
 * 장비비/유지비가 null인 제품은 선택 시 입력을 요구한다.
 */
export function missingCostFields(product: FuelCellProduct): string[] {
  const missing: string[] = [];
  if (product.equipmentCostKrw == null) missing.push("equipmentCostKrw");
  if (product.annualMaintenanceKrw == null) missing.push("annualMaintenanceKrw");
  return missing;
}
