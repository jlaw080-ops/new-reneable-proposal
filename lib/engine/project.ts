// 프로젝트 가정 파생: 용도 + 면적 → 총 에너지사용량 → 전기비용
import type {
  BuildingUsageTable,
  Project,
  ProjectProfile,
  Tariffs,
  UsageSegment,
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

/** 한 세그먼트의 파생값 (UI 표시용). */
export function segmentDerived(
  seg: UsageSegment,
  table: BuildingUsageTable,
  elecCostKrwPerKwh: number,
): UsageDerived {
  return deriveUsage(seg.areaM2, seg.usageType, table, elecCostKrwPerKwh);
}

/** 포함(included) 세그먼트의 총 에너지사용량·전기비용 합계. */
export function sumIncludedSegments(
  segments: UsageSegment[],
  table: BuildingUsageTable,
  elecCostKrwPerKwh: number,
): { totalEnergyKwhPerYear: number; elecCostKrwPerYear: number } {
  return segments.reduce(
    (acc, seg) => {
      if (!seg.included) return acc;
      const d = deriveUsage(seg.areaM2, seg.usageType, table, elecCostKrwPerKwh);
      acc.totalEnergyKwhPerYear += d.totalEnergyKwhPerYear;
      acc.elecCostKrwPerYear += d.elecCostKrwPerYear;
      return acc;
    },
    { totalEnergyKwhPerYear: 0, elecCostKrwPerYear: 0 },
  );
}

/**
 * 용도 세그먼트 기반 ProjectProfile 을 엔진이 사용하는 Project(베이스라인)로 변환.
 * 포함 세그먼트의 합계를 베이스라인으로 두고, 오피스텔 구분은 사용하지 않는다(0).
 * (엔진 Project 인터페이스는 골든 픽스처 호환을 위해 그대로 유지)
 */
export function resolveProject(
  profile: ProjectProfile,
  table: BuildingUsageTable,
  tariffs: Tariffs,
): Project {
  const total = sumIncludedSegments(
    profile.segments,
    table,
    tariffs.elecCostKrwPerKwh,
  );
  return {
    name: profile.name,
    officeElecCostKrwPerYear: total.elecCostKrwPerYear,
    officetelElecCostKrwPerYear: 0,
    officeUsageKwhPerYear: total.totalEnergyKwhPerYear,
    officetelUsageKwhPerYear: 0,
  };
}
