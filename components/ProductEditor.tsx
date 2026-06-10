"use client";

import { useState } from "react";
import type { FuelCellProduct } from "@/lib/engine";

const NUM_FIELDS: { key: keyof FuelCellProduct; label: string; nullable?: boolean }[] = [
  { key: "capacityKw", label: "발전용량(kW)" },
  { key: "heatOutputKw", label: "열생산량(kW)" },
  { key: "fuelConsumptionKw", label: "연료소비량(kW)" },
  { key: "elecEfficiencyPct", label: "발전효율(%)" },
  { key: "heatEfficiencyPct", label: "열효율(%)" },
  { key: "equipmentCostKrw", label: "장비비(₩/기)", nullable: true },
  { key: "annualMaintenanceKrw", label: "연간유지비(₩/기·년)", nullable: true },
  { key: "etcCostKrw", label: "기타비(스택교체 추정)", nullable: true },
  { key: "usefulLifeYears", label: "내용연수(년)" },
];

export function ProductEditor({
  initial,
  existingIds,
  onSave,
  onCancel,
}: {
  initial: FuelCellProduct;
  existingIds: string[];
  onSave: (p: FuelCellProduct) => void;
  onCancel: () => void;
}) {
  const isNew = !existingIds.includes(initial.id);
  const [draft, setDraft] = useState<FuelCellProduct>({ ...initial });
  const [error, setError] = useState<string | null>(null);

  function setField(key: keyof FuelCellProduct, value: string, nullable = false) {
    if (nullable && value.trim() === "") {
      setDraft((d) => ({ ...d, [key]: null }));
      return;
    }
    setDraft((d) => ({ ...d, [key]: Number(value) }));
  }

  function save() {
    if (!draft.id.trim()) return setError("id는 필수입니다.");
    if (isNew && existingIds.includes(draft.id)) return setError("이미 존재하는 id입니다.");
    if (!draft.name.trim()) return setError("제품명은 필수입니다.");
    onSave(draft);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold">{isNew ? "제품 추가" : `제품 수정 — ${draft.name}`}</h3>
        {error && <p className="mt-2 text-sm text-loss">{error}</p>}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="flex flex-col text-xs text-gray-600">
            id
            <input
              className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm disabled:bg-gray-100"
              value={draft.id}
              disabled={!isNew}
              onChange={(e) => setDraft((d) => ({ ...d, id: e.target.value }))}
            />
          </label>
          <label className="flex flex-col text-xs text-gray-600">
            형식(type)
            <input
              className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
              value={draft.type}
              onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
            />
          </label>
          <label className="flex flex-col text-xs text-gray-600">
            메이커
            <input
              className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
              value={draft.maker}
              onChange={(e) => setDraft((d) => ({ ...d, maker: e.target.value }))}
            />
          </label>
          <label className="flex flex-col text-xs text-gray-600">
            제품명
            <input
              className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            />
          </label>
          {NUM_FIELDS.map((f) => {
            const v = draft[f.key] as number | null;
            return (
              <label key={String(f.key)} className="flex flex-col text-xs text-gray-600">
                {f.label} {f.nullable && <span className="text-gray-400">(빈칸=null)</span>}
                <input
                  type="number"
                  className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
                  value={v == null ? "" : v}
                  onChange={(e) => setField(f.key, e.target.value, f.nullable)}
                />
              </label>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded border border-gray-300 px-4 py-1.5 text-sm">
            취소
          </button>
          <button onClick={save} className="rounded bg-gray-900 px-4 py-1.5 text-sm text-white">
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
