"use client";

import { useAppStore } from "@/lib/store";
import { useScenarioStore } from "@/lib/scenarioStore";
import { formatPercent } from "@/lib/format";

/** 제품 선택 + 열사용비율/오피스텔/열절감/이용률 토글 (매트릭스·민감도 공용). */
export function ScenarioControls({ showBaseCase = false }: { showBaseCase?: boolean }) {
  const products = useAppStore((s) => s.products);
  const selectedProductId = useAppStore((s) => s.selectedProductId);
  const setSelectedProductId = useAppStore((s) => s.setSelectedProductId);

  const s = useScenarioStore();

  return (
    <div className="no-print flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 bg-white p-4">
      <label className="flex flex-col text-xs text-gray-600">
        제품
        <select
          className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.type}, {p.capacityKw}kW)
            </option>
          ))}
        </select>
      </label>

      <label className="flex w-56 flex-col text-xs text-gray-600">
        열사용비율 {formatPercent(s.heatUseRatio)}
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={s.heatUseRatio}
          onChange={(e) => s.setHeatUseRatio(Number(e.target.value))}
          className="mt-2"
          disabled={!s.includeHeatSaving}
        />
      </label>

      <label className="flex w-40 flex-col text-xs text-gray-600">
        이용률 {formatPercent(s.utilization)}
        <input
          type="range"
          min={0.1}
          max={1}
          step={0.05}
          value={s.utilization}
          onChange={(e) => s.setUtilization(Number(e.target.value))}
          className="mt-2"
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={s.includeHeatSaving}
          onChange={(e) => s.setIncludeHeatSaving(e.target.checked)}
        />
        열절감 포함
      </label>

      {showBaseCase && (
        <div className="flex items-end gap-2">
          <label className="flex flex-col text-xs text-gray-600">
            기준 기수
            <input
              type="number"
              min={0}
              value={s.baseFcUnits}
              onChange={(e) => s.setBaseCase(Number(e.target.value), s.basePvCapacityKw)}
              className="mt-1 w-20 rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="flex flex-col text-xs text-gray-600">
            기준 태양광(kW)
            <input
              type="number"
              min={0}
              step={100}
              value={s.basePvCapacityKw}
              onChange={(e) => s.setBaseCase(s.baseFcUnits, Number(e.target.value))}
              className="mt-1 w-24 rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </label>
        </div>
      )}
    </div>
  );
}
