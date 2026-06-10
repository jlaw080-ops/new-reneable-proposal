"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EngineContext, FuelCellProduct, ScenarioInput } from "@/lib/engine";
import { computeScenario, derivePerUnit } from "@/lib/engine";
import { formatKrw, formatPayback, formatNumber } from "@/lib/format";

/** 셀 클릭 시 절감/비용 분해 워터폴 (§F3). */
export function CellBreakdown({
  product,
  input,
  ctx,
  onClose,
}: {
  product: FuelCellProduct;
  input: ScenarioInput;
  ctx: EngineContext;
  onClose: () => void;
}) {
  const d = derivePerUnit(product, ctx, input.utilization ?? 1);
  const r = computeScenario(product, input, ctx);

  const heat = input.includeHeatSaving ? input.heatUseRatio * d.heatSavingAt100 : 0;
  const maintenance = d.maintenancePerUnit ?? 0;

  // 연간 순익 구성 요소 (양수=수익, 음수=비용)
  const rows: { label: string; value: number }[] = [
    { label: "태양광 전기절감", value: input.pvCapacityKw * ctx.pv.elecSavingKrwPerKwYear },
    { label: "FC 전기절감", value: input.fcUnits * d.elecSavingPerUnit },
    { label: "FC 열절감", value: input.fcUnits * heat },
    { label: "FC 가스비용", value: -input.fcUnits * d.gasCostPerUnit },
    { label: "FC 유지비", value: -input.fcUnits * maintenance },
    { label: "태양광 고정유지비", value: -ctx.pv.fixedMaintenanceKrwPerYear },
    { label: "전기비용 기준(baseline)", value: -r.baseline },
  ];

  // 워터폴 누적
  let cum = 0;
  const waterfall = rows.map((row) => {
    const start = cum;
    cum += row.value;
    return { ...row, start, end: cum, base: Math.min(start, cum), span: Math.abs(row.value) };
  });
  waterfall.push({
    label: "연간 순익",
    value: cum,
    start: 0,
    end: cum,
    base: 0,
    span: Math.abs(cum),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            셀 분해 — {product.name} · FC {input.fcUnits}기 · 태양광 {input.pvCapacityKw}kW
          </h3>
          <button onClick={onClose} className="rounded px-2 py-1 text-gray-500 hover:bg-gray-100">
            닫기 ✕
          </button>
        </div>

        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={waterfall} margin={{ top: 10, right: 10, bottom: 60, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" angle={-30} textAnchor="end" interval={0} fontSize={10} height={70} />
              <YAxis tickFormatter={(v) => formatNumber(v / 1_000_000, 0)} fontSize={10} width={50} />
              <Tooltip formatter={(_v, _n, p) => formatKrw((p.payload as { value: number }).value)} />
              {/* 투명 받침 + 실제 막대 (워터폴) */}
              <Bar dataKey="base" stackId="a" fill="transparent" />
              <Bar dataKey="span" stackId="a">
                {waterfall.map((row, i) => (
                  <Cell key={i} fill={row.value >= 0 ? "#16a34a" : "#dc2626"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-center text-xs text-gray-500">단위: 백만원</p>

        <table className="mt-4 w-full text-sm">
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-gray-100">
                <td className="py-1 text-gray-700">{row.label}</td>
                <td className={`py-1 text-right tabular-nums ${row.value < 0 ? "text-loss" : "text-profit"}`}>
                  {formatKrw(row.value)}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-300 font-semibold">
              <td className="py-1">연간 순익</td>
              <td className={`py-1 text-right tabular-nums ${r.annualNetProfit < 0 ? "text-loss" : "text-profit"}`}>
                {formatKrw(r.annualNetProfit)}
              </td>
            </tr>
            <tr>
              <td className="py-1 text-gray-700">감가상각 반영 순익</td>
              <td className={`py-1 text-right tabular-nums ${r.netProfitAfterDep < 0 ? "text-loss" : "text-profit"}`}>
                {formatKrw(r.netProfitAfterDep)}
              </td>
            </tr>
            <tr>
              <td className="py-1 text-gray-700">투자회수기간</td>
              <td className="py-1 text-right tabular-nums">{formatPayback(r.payback)}</td>
            </tr>
            <tr>
              <td className="py-1 text-gray-700">총 발전량 / 순사용량 (kWh)</td>
              <td className="py-1 text-right tabular-nums">
                {formatNumber(r.totalGeneration)} / {formatNumber(r.netUsage)}{" "}
                {r.selfSufficient && <span className="text-profit">(자급)</span>}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
