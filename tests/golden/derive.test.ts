// 골든 테스트 — 월별 계산 엔진 (부분 개발요청서 §5, 허용오차 1e-4 상대)
import { describe, expect, it } from "vitest";
import {
  derivePerUnit,
  deriveMonthly,
  seasonOf,
  type EngineContext,
  type FuelCellProduct,
} from "@/lib/engine";
import products from "@/data/fuel-cell-products.json";
import tariffs from "@/data/tariffs.json";
import pv from "@/data/pv-profile.json";
import goyang from "@/data/projects/goyang.json";

const REL_TOL = 1e-4;
function expectClose(actual: number, expected: number, tol = REL_TOL): void {
  const denom = Math.abs(expected) > 1 ? Math.abs(expected) : 1;
  const rel = Math.abs(actual - expected) / denom;
  expect(rel, `actual=${actual} expected=${expected} relErr=${rel}`).toBeLessThan(tol);
}

const all = products as FuelCellProduct[];
const bumhan10 = all.find((p) => p.id === "bumhan-10kw")!;

// 건물용: mid=18/peak=6 (기본 운전조건)
const ctx: EngineContext = { tariffs, pv, project: goyang };
const months = deriveMonthly(bumhan10, ctx); // 기본 18/6, 이용률 1.0
const jan = months[0]; // 1월
const mar = months[2]; // 3월
const jun = months[5]; // 6월

describe("§3 계절 매핑", () => {
  it("여름 6~8, 봄가을 3~5·9·10, 겨울 11·12·1·2", () => {
    expect([1, 2, 11, 12].map(seasonOf)).toEqual(["winter", "winter", "winter", "winter"]);
    expect([3, 4, 5, 9, 10].map(seasonOf)).toEqual(["spring_fall", "spring_fall", "spring_fall", "spring_fall", "spring_fall"]);
    expect([6, 7, 8].map(seasonOf)).toEqual(["summer", "summer", "summer"]);
  });
});

describe("§5 골든 — 가스 (연료전지비용조건)", () => {
  it("gasNm3 1월(31일) = 1,375.4328 (F15)", () => {
    expectClose(jan.gasNm3, 1375.4328);
  });
  it("gasCost 1월 = 969,817.66728 (N15)", () => {
    expectClose(jan.gasCost, 969817.66728);
  });
  it("gasCostPerUnit(연) = 11,418,820.9212 (N27)", () => {
    const d = derivePerUnit(bumhan10, ctx);
    expectClose(d.gasCostPerUnit, 11418820.9212);
  });
});

describe("§5 골든 — 전기 절감 (에너지요금절감액)", () => {
  it("midGen 1월 = 5,580 (F20)", () => {
    expectClose(jan.midGen, 5580);
  });
  it("peakGen 1월 = 1,860 (H20)", () => {
    expectClose(jan.peakGen, 1860);
  });
  it("basicCharge(월) = 72,200 (D20 = 10×7220)", () => {
    expectClose(jan.basicCharge, 72200);
  });
  it("elecSaving 1월(겨울) = 1,494,579.678 (J20)", () => {
    expectClose(jan.elecSaving, 1494579.678);
  });
  it("elecSaving 3월(봄가을) = 1,179,048.534 (J22)", () => {
    expectClose(mar.elecSaving, 1179048.534);
  });
  it("elecSaving 6월(여름) = 1,497,724.62 (J25)", () => {
    expectClose(jun.elecSaving, 1497724.62);
  });
});

describe("§5 골든 — 열 절감 (열사용율 1.0)", () => {
  it("heatMcal 1월 = 8,456.73815 (L20÷0.1×1.0)", () => {
    expectClose(jan.heatMcal, 8456.73815);
  });
  it("heatSaving100 1월 = 845,673.815 (N20÷0.1)", () => {
    expectClose(jan.heatSaving100, 845673.815);
  });
});

describe("§5 골든 — 연간 집계", () => {
  it("generationPerUnit = 87,600 (10×24×365)", () => {
    const d = derivePerUnit(bumhan10, ctx);
    expectClose(d.generationPerUnit, 87600);
  });
  it("elecSavingPerUnit(연) = 16,208,082.81 (Σ J열)", () => {
    const d = derivePerUnit(bumhan10, ctx);
    expectClose(d.elecSavingPerUnit, 16208082.81);
  });
  it("heatSavingAt100(연) = 9,957,127.18 (Σ N열)", () => {
    const d = derivePerUnit(bumhan10, ctx);
    expectClose(d.heatSavingAt100, 9957127.18);
  });
});

describe("운전조건 파라미터화 (§4.1, 기본 18/6)", () => {
  it("일 합계 24h → 연 생산 87,600", () => {
    expect(jan.days).toBe(31);
    expectClose(jan.midGen + jan.peakGen, 10 * 24 * 31);
  });
  it("운전시간 변경 시 생산량 선형 변화", () => {
    const half = deriveMonthly(bumhan10, ctx, 1, { midLoadHours: 9, peakLoadHours: 3 });
    expectClose(half[0].midGen, jan.midGen / 2);
    expectClose(half[0].peakGen, jan.peakGen / 2);
  });
});
