"use client";

import { useRef, useState } from "react";
import { useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import type { BuildingUsageTable, BuildingUsageType } from "@/lib/engine";
import { formatNumber } from "@/lib/format";

export default function UsagePage() {
  const hydrated = useHydrated();
  const usageTable = useAppStore((s) => s.usageTable);
  const setUsageTable = useAppStore((s) => s.setUsageTable);
  const project = useAppStore((s) => s.project);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  if (!hydrated) return <div className="text-gray-500">불러오는 중…</div>;

  const types = usageTable.types;

  function commit(next: BuildingUsageType[], patch?: Partial<BuildingUsageTable>) {
    setUsageTable({ ...usageTable, ...patch, types: next });
  }

  function updateRow(idx: number, patch: Partial<BuildingUsageType>) {
    setError(null);
    const next = types.map((t, i) => (i === idx ? { ...t, ...patch } : t));
    commit(next);
  }

  function addRow() {
    setError(null);
    commit([...types, { name: `용도 ${types.length + 1}`, energyPerAreaKwh: 0 }]);
  }

  function deleteRow(idx: number) {
    setError(null);
    commit(types.filter((_, i) => i !== idx));
  }

  function duplicateRow(idx: number) {
    setError(null);
    const src = types[idx];
    let name = `${src.name} (복제)`;
    let n = 2;
    while (types.some((t) => t.name === name)) name = `${src.name} (복제${n++})`;
    const next = [...types];
    next.splice(idx + 1, 0, { ...src, name });
    commit(next);
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(usageTable, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "building-usage.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(file: File) {
    try {
      const parsed = JSON.parse(await file.text());
      const incoming: unknown = Array.isArray(parsed) ? { types: parsed } : parsed;
      const table = incoming as BuildingUsageTable;
      if (!table || !Array.isArray(table.types)) throw new Error("types 배열이 없습니다");
      for (const t of table.types) {
        if (typeof t.name !== "string" || typeof t.energyPerAreaKwh !== "number") {
          throw new Error("각 행은 name(문자열)과 energyPerAreaKwh(숫자)가 필요합니다");
        }
      }
      setUsageTable({ unit: usageTable.unit, note: usageTable.note, ...table });
      alert(`${table.types.length}개 용도를 가져왔습니다.`);
    } catch (e) {
      alert("가져오기 실패: " + (e as Error).message);
    }
  }

  // 중복 용도명 검출
  const nameCounts = types.reduce<Record<string, number>>((acc, t) => {
    acc[t.name] = (acc[t.name] ?? 0) + 1;
    return acc;
  }, {});
  // 프로젝트에서 사용 중인 용도명
  const usedNames = new Set(project.segments.map((s) => s.usageType));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">용도 관리 — 단위면적당 에너지사용량 ({types.length})</h1>
        <div className="flex gap-2">
          <button onClick={addRow} className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white">
            + 용도 추가
          </button>
          <button onClick={exportJson} className="rounded border border-gray-300 px-3 py-1.5 text-sm">
            JSON 내보내기
          </button>
          <button onClick={() => fileRef.current?.click()} className="rounded border border-gray-300 px-3 py-1.5 text-sm">
            JSON 가져오기
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importJson(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <label className="flex flex-col text-xs text-gray-600">
          단위 표기
          <input
            className="mt-1 w-40 rounded border border-gray-300 px-2 py-1 text-sm"
            value={usageTable.unit ?? ""}
            onChange={(e) => commit(types, { unit: e.target.value })}
          />
        </label>
        <label className="flex flex-1 flex-col text-xs text-gray-600">
          비고
          <input
            className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
            value={usageTable.note ?? ""}
            onChange={(e) => commit(types, { note: e.target.value })}
          />
        </label>
      </div>

      {error && <p className="text-sm text-loss">{error}</p>}

      <div className="overflow-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-xs text-gray-700">
            <tr>
              <th className="px-3 py-2 text-left">용도명</th>
              <th className="px-3 py-2 text-right">단위면적당 에너지사용량 ({usageTable.unit ?? "kWh/㎡·년"})</th>
              <th className="px-3 py-2 text-left">사용 현황</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {types.map((t, idx) => {
              const dup = nameCounts[t.name] > 1;
              const used = usedNames.has(t.name);
              return (
                <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-1">
                    <input
                      className={`w-48 rounded border px-2 py-1 text-sm ${dup ? "border-loss" : "border-gray-300"}`}
                      value={t.name}
                      onChange={(e) => updateRow(idx, { name: e.target.value })}
                    />
                    {dup && <span className="ml-2 text-xs text-loss">중복</span>}
                  </td>
                  <td className="px-3 py-1 text-right">
                    <input
                      type="number"
                      step="any"
                      min={0}
                      className="w-40 rounded border border-gray-300 px-2 py-1 text-right text-sm tabular-nums"
                      value={t.energyPerAreaKwh}
                      onChange={(e) => updateRow(idx, { energyPerAreaKwh: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-3 py-1 text-xs">
                    {used ? (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-green-700">프로젝트 사용 중</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-1 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => duplicateRow(idx)} className="rounded px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100">
                        복제
                      </button>
                      <button
                        onClick={() => {
                          if (used && !confirm(`'${t.name}'은(는) 프로젝트 용도로 사용 중입니다. 삭제하면 해당 세그먼트의 에너지사용량이 0으로 처리됩니다. 삭제할까요?`))
                            return;
                          deleteRow(idx);
                        }}
                        className="rounded px-2 py-0.5 text-xs text-loss hover:bg-red-50"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {types.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-3 text-center text-gray-400">
                  용도가 없습니다. “+ 용도 추가”로 추가하세요.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">
        이 테이블은 코드와 분리되어 별도 관리되며, 변경값은 localStorage에 저장되고 가정값·매트릭스 등 모든 화면에 즉시 반영됩니다.
        용도명을 바꾸면 같은 이름을 참조하던 프로젝트 세그먼트의 연결이 끊길 수 있으니 주의하세요.
      </p>
    </div>
  );
}
