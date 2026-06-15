// 재무 함수 단위 테스트 (§6.5)
import { describe, expect, it } from "vitest";
import {
  buildCashFlows,
  discountedPayback,
  evaluateFinance,
  irr,
  npv,
  simplePayback,
} from "@/lib/engine";

describe("npv", () => {
  it("할인율 0이면 단순 합", () => {
    expect(npv(0, [-100, 50, 50, 50])).toBeCloseTo(50, 6);
  });

  it("표준 NPV 계산", () => {
    // -1000 + 500/1.1 + 500/1.21 + 500/1.331
    const v = npv(0.1, [-1000, 500, 500, 500]);
    expect(v).toBeCloseTo(243.426, 2);
  });
});

describe("irr", () => {
  it("알려진 IRR 복원", () => {
    // CF: -1000, 600, 600 → IRR ≈ 0.1306623
    const r = irr([-1000, 600, 600]);
    expect(r).not.toBeNull();
    expect(r!).toBeCloseTo(0.1306623, 5);
  });

  it("IRR에서 NPV가 0이 됨", () => {
    const flows = buildCashFlows(2000, 350, 20);
    const r = irr(flows)!;
    expect(npv(r, flows)).toBeCloseTo(0, 4);
  });

  it("전부 음수면 해 없음(null 또는 음수)", () => {
    const r = irr([-100, -50, -50]);
    // NPV가 0이 되는 양의 해 없음
    expect(r === null || r < 0).toBe(true);
  });
});

describe("simplePayback", () => {
  it("양의 연수익", () => {
    expect(simplePayback(1000, 250)).toBeCloseTo(4, 6);
  });
  it("연수익 0 이하면 null", () => {
    expect(simplePayback(1000, 0)).toBeNull();
    expect(simplePayback(1000, -10)).toBeNull();
  });
});

describe("discountedPayback", () => {
  it("할인율 0이면 단순회수와 동일", () => {
    const flows = buildCashFlows(1000, 250, 10);
    expect(discountedPayback(flows, 0)).toBeCloseTo(4, 6);
  });
  it("미도달이면 null", () => {
    const flows = buildCashFlows(1000, 10, 3);
    expect(discountedPayback(flows, 0.1)).toBeNull();
  });
});

describe("evaluateFinance", () => {
  it("NPV by years 및 회수기간 산출", () => {
    const ev = evaluateFinance(2000, 350, 0.05);
    expect(Object.keys(ev.npvByYears).map(Number)).toEqual([5, 10, 15, 20]);
    expect(ev.simplePaybackYears).toBeCloseTo(2000 / 350, 6);
    expect(ev.cumulativeCashFlow.length).toBe(21); // t=0..20
    expect(ev.cumulativeCashFlow[0]).toBe(-2000);
  });
});
