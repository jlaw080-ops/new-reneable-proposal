// 프로젝트 가정 파생: 용도 + 면적 → 총 에너지사용량 → 전기비용
import type {
  BuildingUsageTable,
  Project,
  ProjectProfile,
  Tariffs,
} from "./types";

/** 용도명으로 단위면적당 에너지사용량(kWh/㎡·년) 조회. 미발견 시 null. */
export function energyPerArea(
  table: BuildingUsageTable,
  usageType: string,
): number | null {
  const row = table.types.find((t) => t.name === usageType);
  return row ? row.energyPerAreaKwh : null;
}

/** 한 구획의 파생값: 총 에너지사용량(kWh/년)과 전기비용(₩/년). */
export interface UsageDerived {
  energyPerAreaKwh: number;
  totalEnergyKwhPerYear: number; // = 면적 × 단위면적당 에너지사용량
  elecCostKrwPerYear: number; // = 총 에너지사용량 × 전기비용 단가
}

/**
 * 면적·용도로 총 에너지사용량과 전기비용을 산출한다 (사용자 요구).
 * totalEnergy = areaM2 × energyPerArea(usageType)
 * elecCost    = totalEnergy × tariffs.elecCostKrwPerKwh
 */
export function deriveUsage(
  areaM2: number,
  usageType: string,
  table: BuildingUsageTable,
  elecCostKrwPerKwh: number,
): UsageDerived {
  const perArea = energyPerArea(table, usageType) ?? 0;
  const totalEnergyKwhPerYear = areaM2 * perArea;
  return {
    energyPerAreaKwh: perArea,
    totalEnergyKwhPerYear,
    elecCostKrwPerYear: totalEnergyKwhPerYear * elecCostKrwPerKwh,
  };
}

/**
 * 용도+면적 기반 ProjectProfile 을 엔진이 사용하는 Project(베이스라인 4값)로 변환.
 * 오피스/오피스텔 각각 총 에너지사용량과 전기비용을 산출한다.
 */
export function resolveProject(
  profile: ProjectProfile,
  table: BuildingUsageTable,
  tariffs: Tariffs,
): Project {
  const office = deriveUsage(
    profile.officeAreaM2,
    profile.officeUsageType,
    table,
    tariffs.elecCostKrwPerKwh,
  );
  const officetel = deriveUsage(
    profile.officetelAreaM2,
    profile.officetelUsageType,
    table,
    tariffs.elecCostKrwPerKwh,
  );
  return {
    name: profile.name,
    officeElecCostKrwPerYear: office.elecCostKrwPerYear,
    officetelElecCostKrwPerYear: officetel.elecCostKrwPerYear,
    officeUsageKwhPerYear: office.totalEnergyKwhPerYear,
    officetelUsageKwhPerYear: officetel.totalEnergyKwhPerYear,
  };
}
