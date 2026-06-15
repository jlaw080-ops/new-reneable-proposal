"use client";

import { useMemo, useState } from "react";
import { useAppStore, selectContext, selectProduct } from "@/lib/store";
import { useScenarioStore } from "@/lib/scenarioStore";
import { useHydrated } from "@/lib/useHydrated";
import type { ScenarioInput } from "@/lib/engine";
import {
  METRIC_LABELS,
  areaForPv,
  buildHeatRatioAxis,
  buildPvAxis,
  buildUnitAxis,
  computeHeatRatioMatrix,
  computeMatrix,
  metricIsGood,
  snapPvCapacity,
  type MatrixCell,
  type MatrixMetric,
} from "@/lib/scenario";
import { formatMillion, formatNumber, formatPayback, formatPercent } from "@/lib/format";
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
  const [view, setView] = useState<"pv" | "heat">("pv");
  const [selected, setSelected] = useState<{ fc: number; pv: number; ratio?: number } | null>(null);

  const baseInput: ScenarioInput = useMemo(
    () => ({
      fcUnits: 0,
      pvCapacityKw: 0,
      heatUseRatio: scenario.heatUseRatio,
      includeOfficetel: false, // 오피스/오피스텔 구분 폐지 — 베이스라인은 프로젝트 세그먼트로 결정
      includeHeatSaving: scenario.includeHeatSaving,
      utilization: scenario.utilization,
    }),
    [scenario.heatUseRatio, scenario.includeHeatSaving, scenario.utilization],
  );

  const unitAxis = useMemo(
    () => buildUnitAxis(scenario.maxFcUnits, scenario.fcUnitStep),
    [scenario.maxFcUnits, scenario.fcUnitStep],
  );
  const pvAxis = useMemo(
    () => buildPvAxis(scenario.minPvCapacityKw, scenario.maxPvCapacityKw, scenario.pvCapacityStep),
    [scenario.minPvCapacityKw, scenario.maxPvCapacityKw, scenario.pvCapacityStep],
  );

  const matrix = useMemo(
    () => (product ? computeMatrix(product, baseInput, ctx, unitAxis, pvAxis) : []),
    [product, baseInput, ctx, unitAxis, pvAxis],
  );

  const heatRatioAxis = useMemo(
    () => buildHeatRatioAxis(scenario.heatRatioStepPct),
    [scenario.heatRatioStepPct],
  );
  const heatMatrix = useMemo(
    () =>
      product
        ? computeHeatRatioMatrix(product, baseInput, ctx, unitAxis, heatRatioAxis, scenario.heatMatrixPvKw)
        : [],
    [product, baseInput, ctx, unitAxis, heatRatioAxis, scenario.heatMatrixPvKw],
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

      {/* 매트릭스 전환 탭 */}
      <div className="no-print flex gap-1 border-b border-gray-200">
        {([
          ["pv", "대수 × 태양광 용량"],
          ["heat", "대수 × 열사용비율"],
        ] as const).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              view === v
                ? "border-gray-900 text-gray-900"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "pv" && (
        <>
          <div className="no-print flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-wrap gap-2">
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
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-end gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
            <label className="flex flex-col text-xs text-gray-600">
              연료전지 최대 대수
              <input
                type="number"
                min={1}
                value={scenario.maxFcUnits}
                onChange={(e) => scenario.setMaxFcUnits(Math.max(1, Math.floor(Number(e.target.value))))}
                className="mt-1 w-24 rounded border border-gray-300 px-2 py-1 text-sm tabular-nums"
              />
            </label>
            <label className="flex flex-col text-xs text-gray-600">
              표시 간격(대)
              <input
                type="number"
                min={1}
                value={scenario.fcUnitStep}
                onChange={(e) => scenario.setFcUnitStep(Math.max(1, Math.floor(Number(e.target.value))))}
                className="mt-1 w-20 rounded border border-gray-300 px-2 py-1 text-sm tabular-nums"
              />
            </label>
            <span className="pb-1 text-xs text-gray-400">{unitAxis.length}행</span>
          </div>
          <div className="flex items-end gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
            <label className="flex flex-col text-xs text-gray-600">
              태양광 최소(kW)
              <input
                type="number"
                min={50}
                step={50}
                value={scenario.minPvCapacityKw}
                onChange={(e) => scenario.setMinPvCapacityKw(snapPvCapacity(Number(e.target.value)))}
                className="mt-1 w-24 rounded border border-gray-300 px-2 py-1 text-sm tabular-nums"
              />
            </label>
            <label className="flex flex-col text-xs text-gray-600">
              태양광 최대(kW)
              <input
                type="number"
                min={50}
                step={50}
                value={scenario.maxPvCapacityKw}
                onChange={(e) => scenario.setMaxPvCapacityKw(snapPvCapacity(Number(e.target.value)))}
                className="mt-1 w-24 rounded border border-gray-300 px-2 py-1 text-sm tabular-nums"
              />
            </label>
            <label className="flex flex-col text-xs text-gray-600">
              설치 단위(kW)
              <input
                type="number"
                min={50}
                step={50}
                value={scenario.pvCapacityStep}
                onChange={(e) => scenario.setPvCapacityStep(snapPvCapacity(Number(e.target.value)))}
                className="mt-1 w-24 rounded border border-gray-300 px-2 py-1 text-sm tabular-nums"
              />
            </label>
            <span className="pb-1 text-xs text-gray-400">{pvAxis.length}열</span>
          </div>
        </div>
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
              {pvAxis.map((pv) => (
                <th key={pv} className="bg-gray-100 px-2 py-2 text-xs font-semibold text-gray-700">
                  {formatNumber(pv)}
                  <div className="font-normal text-gray-400">{formatNumber(areaForPv(pv))}㎡</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row) => (
              <tr key={row[0]?.fcUnits}>
                <th className="sticky left-0 z-10 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-700">
                  {row[0]?.fcUnits}
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
        </>
      )}

      {/* ── 두 번째 매트릭스: 태양광 고정 × (연료전지 대수 × 열사용비율) 연간순익 ── */}
      {view === "heat" && (
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold">연료전지 대수 × 열사용비율 — 연간 순익</h2>
            <p className="text-xs text-gray-500">
              태양광 용량 고정 · 단위: 백만원 · 흑자=녹색, 적자=적색 · 셀 클릭 시 분해
            </p>
          </div>
          <div className="no-print flex items-end gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
            <label className="flex flex-col text-xs text-gray-600">
              고정 태양광(kW)
              <input
                type="number"
                min={0}
                step={50}
                value={scenario.heatMatrixPvKw}
                onChange={(e) => scenario.setHeatMatrixPvKw(Math.max(0, snapPvCapacity(Number(e.target.value))))}
                className="mt-1 w-24 rounded border border-gray-300 px-2 py-1 text-sm tabular-nums"
              />
            </label>
            <label className="flex flex-col text-xs text-gray-600">
              열사용비율 간격(%)
              <input
                type="number"
                min={1}
                max={100}
                value={scenario.heatRatioStepPct}
                onChange={(e) =>
                  scenario.setHeatRatioStepPct(Math.min(100, Math.max(1, Math.floor(Number(e.target.value)))))
                }
                className="mt-1 w-20 rounded border border-gray-300 px-2 py-1 text-sm tabular-nums"
              />
            </label>
            <span className="pb-1 text-xs text-gray-400">{heatRatioAxis.length}열</span>
          </div>
        </div>

        <div className="overflow-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-gray-100 px-2 py-2 text-xs font-semibold text-gray-700">
                  기수 \ 열사용비율
                </th>
                {heatRatioAxis.map((r) => (
                  <th key={r} className="bg-gray-100 px-2 py-2 text-xs font-semibold text-gray-700">
                    {formatPercent(r, 0)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatMatrix.map((row) => (
                <tr key={row[0]?.fcUnits}>
                  <th className="sticky left-0 z-10 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-700">
                    {row[0]?.fcUnits}
                  </th>
                  {row.map((c) => {
                    const isBase =
                      c.fcUnits === scenario.baseFcUnits && scenario.heatMatrixPvKw === scenario.basePvCapacityKw;
                    return (
                      <td
                        key={c.heatUseRatio}
                        className={`matrix-cell cursor-pointer hover:opacity-80 ${
                          c.result.annualNetProfit > 0 ? "bg-green-100 text-green-900" : "bg-red-100 text-red-900"
                        } ${isBase ? "outline outline-2 -outline-offset-2 outline-orange-500" : ""}`}
                        onClick={() => setSelected({ fc: c.fcUnits, pv: scenario.heatMatrixPvKw, ratio: c.heatUseRatio })}
                      >
                        {formatMillion(c.result.annualNetProfit)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {selected && (
        <CellBreakdown
          product={product}
          ctx={ctx}
          input={{
            ...baseInput,
            fcUnits: selected.fc,
            pvCapacityKw: selected.pv,
            ...(selected.ratio != null
              ? { heatUseRatio: selected.ratio, includeHeatSaving: true }
              : {}),
          }}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
