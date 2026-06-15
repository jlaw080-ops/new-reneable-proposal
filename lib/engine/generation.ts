// 전력 생산·자급 계산 (§6.4, 표5·6·7)
import type { DerivedPerUnit, EngineContext, ScenarioInput } from "./types";

/** 시나리오의 기준 사용량(kWh/년). 오피스텔 토글 반영. */
export function baselineUsageKwh(
  input: ScenarioInput,
  ctx: EngineContext,
): number {
  const p = ctx.project;
  return (
    p.officeUsageKwhPerYear +
    (input.includeOfficetel ? p.officetelUsageKwhPerYear : 0)
  );
}

/** 총 발전량(kWh/년) = 태양광 + 연료전지 (§6.4). */
export function totalGeneration(
  input: ScenarioInput,
  derived: DerivedPerUnit,
  ctx: EngineContext,
): number {
  return (
    input.pvCapacityKw * ctx.pv.generationKwhPerKwYear +
    input.fcUnits * derived.generationPerUnit
  );
}

/** 순사용량 = 기준사용량 − 총발전량 (§6.4). */
export function netUsage(
  input: ScenarioInput,
  derived: DerivedPerUnit,
  ctx: EngineContext,
): number {
  return baselineUsageKwh(input, ctx) - totalGeneration(input, derived, ctx);
}
