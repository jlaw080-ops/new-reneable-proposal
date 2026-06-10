// 프로젝트 가정 파생 테스트 — 용도+면적 → 에너지사용량 → 전기비용
import { describe, expect, it } from "vitest";
import { deriveUsage, energyPerArea, resolveProject } from "@/lib/engine";
import type { BuildingUsageTable, ProjectProfile, Tariffs } from "@/lib/engine";
import usage from "@/data/building-usage.json";
import tariffs from "@/data/tariffs.json";
import profile from "@/data/projects/goyang-profile.json";

const table = usage as BuildingUsageTable;
const t = tariffs as Tariffs;

describe("energyPerArea", () => {
  it("용도별 단위면적당 에너지사용량 조회", () => {
    expect(energyPerArea(table, "업무")).toBeCloseTo(114.4392, 6);
    expect(energyPerArea(table, "방송통신")).toBeCloseTo(387.6279, 6);
    expect(energyPerArea(table, "없는용도")).toBeNull();
  });
});

describe("deriveUsage", () => {
  it("총 에너지사용량 = 면적 × 단위면적당, 전기비용 = 사용량 × 단가", () => {
    const d = deriveUsage(1000, "업무", table, t.elecCostKrwPerKwh);
    expect(d.totalEnergyKwhPerYear).toBeCloseTo(114439.2, 4);
    expect(d.elecCostKrwPerYear).toBeCloseTo(114439.2 * t.elecCostKrwPerKwh, 2);
  });
});

describe("resolveProject — goyang 기본 프로필이 원본 베이스라인을 재현", () => {
  it("officeUsage/officeCost/officetelUsage/officetelCost", () => {
    const resolved = resolveProject(profile as ProjectProfile, table, t);
    // 원본 §4.4 값 (상대오차)
    expect(resolved.officeUsageKwhPerYear).toBeCloseTo(2340155.64, 2);
    expect(resolved.officeElecCostKrwPerYear / 333082152.76).toBeCloseTo(1, 6);
    expect(resolved.officetelUsageKwhPerYear).toBeCloseTo(778192, 0);
    expect(resolved.officetelElecCostKrwPerYear / 110762661.33).toBeCloseTo(1, 5);
  });
});
