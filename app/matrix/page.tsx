"use client";

import { useMemo, useState } from "react";
import { useAppStore, selectContext, selectProduct } from "@/lib/store";
import { useScenarioStore } from "@/lib/scenarioStore";
import { useHydrated } from "@/lib/useHydrated";
import type { ScenarioInput } from "@/lib/engine";
import {
  DEFAULT_PV_AXIS,
  DEFAULT_UNIT_AXIS,
  METRIC_LABELS,
  areaForPv,
  computeMatrix,
  metricIsGood,
  type MatrixCell,
  type MatrixMetric,
} from "@/lib/scenario";
import { formatMillion, formatNumber, formatPayback } from "@/lib/format";
import { ScenarioControls } from "@/components/ScenarioControls";
import { CellBreakdown } from "@/components/CellBreakdown";
import { missingCostFields } from "@/lib/engine";

const METRICS: MatrixMetric[] = [
  "annualNetProfit",
  "netProfitAfterDep",
  "payback",
  "totalGeneration",
  "netUsage",
];

function cellText(metric: MatrixMetric, c: MatrixCell): string {
  const r = c.result;
  switch (metric) {
    case "annualNetProfit":
      return formatMillion(r.annualNetProfit);
    case "netProfitAfterDep":
      return formatMillion(r.netProfitAfterDep);
    case "payback":
      return formatPayback(r.payback);
    case "totalGeneration":
      return formatNumber(r.totalGeneration);
    case "netUsage":
      return formatNumber(r.netUsage);
  }
}

function cellColor(metric: MatrixMetric, c: MatrixCell): string {
  const good = metricIsGood(metric, c.result);
  if (good === null) return "bg-white";
  return good ? "bg-green-100 text-green-900" : "bg-red-100 text-red-900";
}

export default function MatrixPage() {
  const hydrated = useHydrated();
  const product = useAppStore(selectProduct);
  const ctx = useAppStore(selectContext);
  const scenario = useScenarioStore();
  const [metric, setMetric] = useState<MatrixMetric>("annualNetProfit");
  const [selected, setSelected] = useState<{ fc: number; pv: number } | null>(null);

  const baseInput: ScenarioInput = useMemo(
    () => ({
      fcUnits: 0,
      pvCapacityKw: 0,
      heatUseRatio: scenario.heatUseRatio,
      includeOfficetel: scenario.includeOfficetel,
      includeHeatSaving: scenario.includeHeatSaving,
      utilization: scenario.utilization,
    }),
    [scenario.heatUseRatio, scenario.includeOfficetel, scenario.includeHeatSaving, scenario.utilization],
  );

  const matrix = useMemo(
    () => (product ? computeMatrix(product, baseInput, ctx, DEFAULT_UNIT_AXIS, DEFAULT_PV_AXIS) : []),
    [product, baseInput, ctx],
  );

  if (!hydrated) return <div className="text-gray-500">불러오는 중…</div>;
  if (!product) return <div className="text-loss">선택된 제품이 없습니다. 제품 관리에서 추가하세요.</div>;

  const missing = missingCostFields(product);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">시나리오 매트릭스</h1>
      </div>

      <ScenarioControls showBaseCase />

      {missing.length > 0 && (
        <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          ⚠ 선택 제품의 비용 필드 누락: {missing.join(", ")} — 감가상각·회수기간 계산이 0으로 처리됩니다.
          가정값/제품 관리에서 입력하세요.
        </div>
      )}

      <div className="no-print flex flex-wrap gap-2">
        {METRICS.map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`rounded px-3 py-1.5 text-sm ${
              metric === m ? "bg-gray-900 text-white" : "bg-white text-gray-700 border border-gray-300"
            }`}
          >
            {METRIC_LABELS[m]}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        {metric === "annualNetProfit" || metric === "netProfitAfterDep"
          ? "단위: 백만원 · 흑자=녹색, 적자=적색"
          : metric === "payback"
            ? "회수기간(년) · 회수가능=녹색"
            : "단위: kWh · 자급=녹색"}
        · 기준 Case(주황 테두리): FC {scenario.baseFcUnits}기 / 태양광 {scenario.basePvCapacityKw}kW · 셀 클릭 시 분해
      </p>

      <div className="overflow-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-gray-100 px-2 py-2 text-xs font-semibold text-gray-700">
                기수 \ 태양광(kW)
              </th>
              {DEFAULT_PV_AXIS.map((pv) => (
                <th key={pv} className="bg-gray-100 px-2 py-2 text-xs font-semibold text-gray-700">
                  {formatNumber(pv)}
                  <div className="font-normal text-gray-400">{formatNumber(areaForPv(pv))}㎡</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, ri) => (
              <tr key={DEFAULT_UNIT_AXIS[ri]}>
                <th className="sticky left-0 z-10 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-700">
                  {DEFAULT_UNIT_AXIS[ri]}
                </th>
                {row.map((c) => {
                  const isBase =
                    c.fcUnits === scenario.baseFcUnits && c.pvCapacityKw === scenario.basePvCapacityKw;
                  return (
                    <td
                      key={c.pvCapacityKw}
                      className={`matrix-cell cursor-pointer hover:opacity-80 ${cellColor(metric, c)} ${
                        isBase ? "outline outline-2 -outline-offset-2 outline-orange-500" : ""
                      }`}
                      onClick={() => setSelected({ fc: c.fcUnits, pv: c.pvCapacityKw })}
                    >
                      {cellText(metric, c)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <CellBreakdown
          product={product}
          ctx={ctx}
          input={{ ...baseInput, fcUnits: selected.fc, pvCapacityKw: selected.pv }}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
