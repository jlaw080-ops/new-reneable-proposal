// 골든 테스트 (§9) — 원본 엑셀 값, 허용오차 1e-4
import { describe, expect, it } from "vitest";
import {
  computeScenario,
  derivePerUnit,
  type EngineContext,
  type FuelCellProduct,
  type ScenarioInput,
} from "@/lib/engine";
import products from "@/data/fuel-cell-products.json";
import tariffs from "@/data/tariffs.json";
import pv from "@/data/pv-profile.json";
import goyang from "@/data/projects/goyang.json";

// §9 허용오차 1e-4 — 상대오차로 해석.
// (tariffs.json 의 단가는 원본 정밀값의 역산 반올림값이라 절대오차로는 센트 단위
//  차이가 남. 상대오차 1e-4 는 12자리 유효숫자 일치를 요구하므로 충분히 엄격하다.)
const REL_TOL = 1e-4;

function expectClose(actual: number, expected: number, tol = REL_TOL): void {
  const denom = Math.abs(expected) > 1 ? Math.abs(expected) : 1;
  const rel = Math.abs(actual - expected) / denom;
  expect(rel, `actual=${actual} expected=${expected} relErr=${rel}`).toBeLessThan(tol);
}

const all = products as FuelCellProduct[];
const bumhan10 = all.find((p) => p.id === "bumhan-10kw")!;
const s300 = all.find((p) => p.id === "doosan-sofc-s300")!;
const pafc440 = all.find((p) => p.id === "doosan-pafc-440kw")!;

const ctx: EngineContext = {
  tariffs,
  pv,
  project: goyang,
};

// §9: 골든 테스트의 capex 는 워크북 값(FC 5,000,000,000/기)을 사용해 재현.
const WORKBOOK_FC_CAPEX = 5_000_000_000;

function input(partial: Partial<ScenarioInput>): ScenarioInput {
  return {
    fcUnits: 0,
    pvCapacityKw: 0,
    heatUseRatio: 0.45,
    includeOfficetel: false,
    includeHeatSaving: true,
    capexOverridePerUnit: WORKBOOK_FC_CAPEX,
    ...partial,
  };
}

describe("§9 골든 테스트 — 연간 운영 순익(profit)", () => {
  it("profit(fc=0, pv=2000, r=0.45, 오피스텔=N)", () => {
    const r = computeScenario(bumhan10, input({ fcUnits: 0, pvCapacityKw: 2000 }), ctx);
    expectClose(r.annualNetProfit, 22049447.24);
  });

  it("profit(fc=1, pv=600, r=0.45, 오피스텔=N)", () => {
    const r = computeScenario(bumhan10, input({ fcUnits: 1, pvCapacityKw: 600 }), ctx);
    expectClose(r.annualNetProfit, -220974703.63928);
  });

  it("profit(fc=15, pv=2000, r=0.45, 오피스텔=N)", () => {
    const r = computeScenario(bumhan10, input({ fcUnits: 15, pvCapacityKw: 2000 }), ctx);
    expectClose(r.annualNetProfit, 125098984.050803);
  });

  it("profit(fc=1, pv=600, r=0.10, 오피스텔=Y)", () => {
    const r = computeScenario(
      bumhan10,
      input({ fcUnits: 1, pvCapacityKw: 600, heatUseRatio: 0.1, includeOfficetel: true }),
      ctx,
    );
    expectClose(r.annualNetProfit, -335222359.486329);
  });

  it("profit(fc=15, pv=2000, r=0.50, 오피스텔=N)", () => {
    const r = computeScenario(
      bumhan10,
      input({ fcUnits: 15, pvCapacityKw: 2000, heatUseRatio: 0.5 }),
      ctx,
    );
    expectClose(r.annualNetProfit, 132566829.437337);
  });
});

describe("§9 골든 테스트 — 감가상각 반영(afterDep)", () => {
  it("afterDep(fc=1, pv=600, r=0.45, capex=5e9)", () => {
    const r = computeScenario(bumhan10, input({ fcUnits: 1, pvCapacityKw: 600 }), ctx);
    expectClose(r.netProfitAfterDep, -584308036.972613);
  });
});

describe("§9 골든 테스트 — 투자회수기간(payback)", () => {
  it("payback(fc=0, pv=2000, r=0.45)", () => {
    const r = computeScenario(bumhan10, input({ fcUnits: 0, pvCapacityKw: 2000 }), ctx);
    expect(r.payback).not.toBeNull();
    expectClose(r.payback!, 90.7052216879065);
  });

  it("payback(fc=0, pv=1600) → null (회수불가)", () => {
    const r = computeScenario(bumhan10, input({ fcUnits: 0, pvCapacityKw: 1600 }), ctx);
    expect(r.payback).toBeNull();
  });
});

describe("§9 골든 테스트 — 발전·순사용량", () => {
  it("generation(fc=1, pv=600)", () => {
    const r = computeScenario(bumhan10, input({ fcUnits: 1, pvCapacityKw: 600 }), ctx);
    expectClose(r.totalGeneration, 854100);
  });

  it("netUsage(fc=0, pv=600, 오피스텔=N)", () => {
    const r = computeScenario(bumhan10, input({ fcUnits: 0, pvCapacityKw: 600 }), ctx);
    expectClose(r.netUsage, 1573655.64);
  });
});

describe("§9 골든 테스트 — 파생값(derive)", () => {
  it("S300 elecSaving", () => {
    const d = derivePerUnit(s300, ctx);
    expectClose(d.elecSavingPerUnit, 486242484.3);
  });

  it("PAFC440 heatSavingAt100", () => {
    const d = derivePerUnit(pafc440, ctx);
    expectClose(d.heatSavingAt100, 362313600);
  });
});

describe("§5 검증 — 범한 10kW 파생값 추가 확인", () => {
  it("발전/전기절감/열@100%/가스", () => {
    const d = derivePerUnit(bumhan10, ctx);
    expectClose(d.generationPerUnit, 87600);
    expectClose(d.elecSavingPerUnit, 16208082.81);
    expectClose(d.heatSavingAt100, 9957127.18);
    expectClose(d.gasCostPerUnit, 11418820.92);
  });

  it("PAFC440 발전/전기절감/가스", () => {
    const d = derivePerUnit(pafc440, ctx);
    expectClose(d.generationPerUnit, 3854400);
    expectClose(d.elecSavingPerUnit, 713155643.64);
    expectClose(d.gasCostPerUnit, 661089632.28);
  });

  it("S300 발전/열@100%/가스", () => {
    const d = derivePerUnit(s300, ctx);
    expectClose(d.generationPerUnit, 2628000);
    expectClose(d.heatSavingAt100, 150667479.84);
    expectClose(d.gasCostPerUnit, 316301339.52);
  });
});
