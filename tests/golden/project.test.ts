// 프로젝트 가정 파생 테스트 — 용도+면적 → 에너지사용량 → 전기비용
import { describe, expect, it } from "vitest";
import { deriveUsage, energyPerArea, resolveProject } from "@/lib/engine";
import { buildUnitAxis } from "@/lib/scenario";
import type { BuildingUsageTable, ProjectProfile, Tariffs } from "@/lib/engine";
import usage from "@/data/building-usage.json";
import tariffs from "@/data/tariffs.json";
import profile from "@/data/projects/goyang-profile.json";

const table = usage as BuildingUsageTable;
const t = tariffs as Tariffs;

describe("buildUnitAxis — 기수 축 생성 (최대 대수 / 표시 간격)", () => {
  it("0부터 max까지 step 간격, 양끝 포함", () => {
    expect(buildUnitAxis(100, 5)).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100]);
    expect(buildUnitAxis(20, 10)).toEqual([0, 10, 20]);
  });
  it("max가 step 배수가 아니면 마지막에 max 포함", () => {
    expect(buildUnitAxis(23, 10)).toEqual([0, 10, 20, 23]);
  });
  it("step은 1 이상 정수로 강제", () => {
    expect(buildUnitAxis(3, 0)).toEqual([0, 1, 2, 3]);
    expect(buildUnitAxis(3, 1)).toEqual([0, 1, 2, 3]);
  });
  it("행 폭주 방지 상한(200행) 적용", () => {
    expect(buildUnitAxis(100000, 1).length).toBeLessThanOrEqual(200);
  });
});

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

describe("resolveProject — 용도 세그먼트 합산", () => {
  it("기본 프로필(오피스만 포함)이 원본 오피스 베이스라인 재현", () => {
    const resolved = resolveProject(profile as ProjectProfile, table, t);
    // 기본: 오피스 included, 오피스텔 미포함 → 오피스 단독 베이스라인
    expect(resolved.officeUsageKwhPerYear).toBeCloseTo(2340155.64, 2);
    expect(resolved.officeElecCostKrwPerYear / 333082152.76).toBeCloseTo(1, 6);
    // 오피스/오피스텔 구분 폐지 — 합계는 office 필드로, officetel은 0
    expect(resolved.officetelUsageKwhPerYear).toBe(0);
    expect(resolved.officetelElecCostKrwPerYear).toBe(0);
  });

  it("두 세그먼트 모두 포함 시 합산 (오피스+오피스텔)", () => {
    const p = profile as ProjectProfile;
    const bothIncluded: ProjectProfile = {
      ...p,
      segments: p.segments.map((s) => ({ ...s, included: true })),
    };
    const resolved = resolveProject(bothIncluded, table, t);
    expect(resolved.officeUsageKwhPerYear).toBeCloseTo(2340155.64 + 778192, 0);
    expect(resolved.officeElecCostKrwPerYear / (333082152.76 + 110762661.33)).toBeCloseTo(1, 5);
  });

  it("included=false 세그먼트는 합산에서 제외", () => {
    const p = profile as ProjectProfile;
    const noneIncluded: ProjectProfile = {
      ...p,
      segments: p.segments.map((s) => ({ ...s, included: false })),
    };
    const resolved = resolveProject(noneIncluded, table, t);
    expect(resolved.officeUsageKwhPerYear).toBe(0);
    expect(resolved.officeElecCostKrwPerYear).toBe(0);
  });
});
