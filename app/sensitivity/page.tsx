"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { selectContext, selectProduct, useAppStore } from "@/lib/store";
import { useScenarioStore } from "@/lib/scenarioStore";
import { useHydrated } from "@/lib/useHydrated";
import { computeScenario, type ScenarioInput } from "@/lib/engine";
import {
  DEFAULT_HEAT_RATIO_AXIS,
  buildPvAxis,
  buildUnitAxis,
} from "@/lib/scenario";
import { formatMillion, formatPercent } from "@/lib/format";
import { ScenarioControls } from "@/components/ScenarioControls";

export default function SensitivityPage() {
  const hydrated = useHydrated();
  const product = useAppStore(selectProduct);
  const ctx = useAppStore(selectContext);
  const scenario = useScenarioStore();
  const [fc, setFc] = useState(15);
  const [pv, setPv] = useState(2000);
  const [axis2d, setAxis2d] = useState<"units" | "pv">("units");

  const base: ScenarioInput = useMemo(
    () => ({
      fcUnits: fc,
      pvCapacityKw: pv,
      heatUseRatio: scenario.heatUseRatio,
      includeOfficetel: false, // 오피스/오피스텔 구분 폐지
      includeHeatSaving: true,
      utilization: scenario.utilization,
    }),
    [fc, pv, scenario.heatUseRatio, scenario.utilization],
  );

  const lineData = useMemo(() => {
    if (!product) return [];
    return DEFAULT_HEAT_RATIO_AXIS.map((r) => ({
      ratio: r,
      ratioLabel: formatPercent(r, 0),
      profit:
        computeScenario(product, { ...base, heatUseRatio: r }, ctx).annualNetProfit / 1_000_000,
    }));
  }, [product, base, ctx]);

  const grid2d = useMemo(() => {
    if (!product) return { cols: [] as number[], rows: [] as { ratio: number; cells: number[] }[] };
    const cols =
      axis2d === "units"
        ? buildUnitAxis(scenario.maxFcUnits, scenario.fcUnitStep)
        : buildPvAxis(scenario.minPvCapacityKw, scenario.maxPvCapacityKw, scenario.pvCapacityStep);
    const rows = DEFAULT_HEAT_RATIO_AXIS.map((ratio) => ({
      ratio,
      cells: cols.map((c) => {
        const inp = axis2d === "units" ? { ...base, fcUnits: c, heatUseRatio: ratio } : { ...base, pvCapacityKw: c, heatUseRatio: ratio };
        return computeScenario(product, inp, ctx).annualNetProfit;
      }),
    }));
    return { cols, rows };
  }, [
    product,
    base,
    ctx,
    axis2d,
    scenario.maxFcUnits,
    scenario.fcUnitStep,
    scenario.minPvCapacityKw,
    scenario.maxPvCapacityKw,
    scenario.pvCapacityStep,
  ]);

  if (!hydrated) return <div className="text-gray-500">불러오는 중…</div>;
  if (!product) return <div className="text-loss">선택된 제품이 없습니다.</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">민감도 — 열사용비율</h1>
      <ScenarioControls />

      <div className="no-print flex flex-wrap gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <label className="flex flex-col text-xs text-gray-600">
          기수
          <input type="number" min={0} value={fc} onChange={(e) => setFc(Number(e.target.value))} className="mt-1 w-24 rounded border border-gray-300 px-2 py-1 text-sm" />
        </label>
        <label className="flex flex-col text-xs text-gray-600">
          태양광(kW)
          <input type="number" min={0} step={100} value={pv} onChange={(e) => setPv(Number(e.target.value))} className="mt-1 w-28 rounded border border-gray-300 px-2 py-1 text-sm" />
        </label>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-2 font-semibold">열사용비율 → 연간 순익 (FC {fc}기 / 태양광 {pv}kW)</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ratioLabel" fontSize={11} />
              <YAxis tickFormatter={(v) => formatMillion(v * 1_000_000, 0)} fontSize={11} width={50} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)} 백만원`} labelFormatter={(l) => `열사용비율 ${l}`} />
              <ReferenceLine y={0} stroke="#dc2626" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="profit" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-center text-xs text-gray-500">단위: 백만원 · 적색 점선 = 손익분기</p>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">2D 민감도 (열사용비율 × {axis2d === "units" ? "기수" : "태양광 용량"})</h2>
          <div className="flex gap-2">
            <button onClick={() => setAxis2d("units")} className={`rounded px-3 py-1 text-sm ${axis2d === "units" ? "bg-gray-900 text-white" : "border border-gray-300"}`}>
              × 기수
            </button>
            <button onClick={() => setAxis2d("pv")} className={`rounded px-3 py-1 text-sm ${axis2d === "pv" ? "bg-gray-900 text-white" : "border border-gray-300"}`}>
              × 태양광
            </button>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className="bg-gray-100 px-2 py-1 text-xs">비율\{axis2d === "units" ? "기수" : "kW"}</th>
                {grid2d.cols.map((c) => (
                  <th key={c} className="bg-gray-100 px-2 py-1 text-xs">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grid2d.rows.map((row) => (
                <tr key={row.ratio}>
                  <th className="bg-gray-50 px-2 py-1 text-xs">{formatPercent(row.ratio, 0)}</th>
                  {row.cells.map((v, i) => (
                    <td key={i} className={`matrix-cell ${v > 0 ? "bg-green-100 text-green-900" : "bg-red-100 text-red-900"}`}>
                      {formatMillion(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-xs text-gray-500">단위: 백만원 · 고정: {axis2d === "units" ? `태양광 ${pv}kW` : `FC ${fc}기`}</p>
      </section>
    </div>
  );
}
