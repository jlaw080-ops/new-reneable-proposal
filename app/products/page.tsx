"use client";

import { useRef, useState } from "react";
import { selectContext, useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { derivePerUnit, missingCostFields, type FuelCellProduct } from "@/lib/engine";
import { formatKrw, formatNumber } from "@/lib/format";
import { ProductEditor } from "@/components/ProductEditor";

function blankProduct(): FuelCellProduct {
  return {
    id: "",
    type: "PEMFC",
    maker: "",
    name: "",
    capacityKw: 0,
    heatOutputKw: 0,
    fuelConsumptionKw: 0,
    elecEfficiencyPct: 0,
    heatEfficiencyPct: 0,
    equipmentCostKrw: null,
    annualMaintenanceKrw: null,
    etcCostKrw: null,
    usefulLifeYears: 15,
  };
}

export default function ProductsPage() {
  const hydrated = useHydrated();
  const products = useAppStore((s) => s.products);
  const ctx = useAppStore(selectContext);
  const upsertProduct = useAppStore((s) => s.upsertProduct);
  const deleteProduct = useAppStore((s) => s.deleteProduct);
  const duplicateProduct = useAppStore((s) => s.duplicateProduct);
  const replaceProducts = useAppStore((s) => s.replaceProducts);

  const [editing, setEditing] = useState<FuelCellProduct | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function exportJson() {
    const blob = new Blob([JSON.stringify(products, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fuel-cell-products.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(file: File) {
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed)) throw new Error("배열이 아닙니다");
      replaceProducts(parsed as FuelCellProduct[]);
      alert(`${parsed.length}개 제품을 가져왔습니다.`);
    } catch (e) {
      alert("가져오기 실패: " + (e as Error).message);
    }
  }

  if (!hydrated) return <div className="text-gray-500">불러오는 중…</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">제품 관리 ({products.length})</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(blankProduct())}
            className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white"
          >
            + 제품 추가
          </button>
          <button onClick={exportJson} className="rounded border border-gray-300 px-3 py-1.5 text-sm">
            JSON 내보내기
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          >
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

      <div className="overflow-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-xs text-gray-700">
            <tr>
              {["형식", "메이커", "제품명", "용량kW", "장비비", "유지비", "발전/년", "전기절감/년", "열@100%", "가스/년", ""].map(
                (h) => (
                  <th key={h} className="px-2 py-2 text-left font-semibold">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const d = derivePerUnit(p, ctx);
              const missing = missingCostFields(p);
              return (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-2 py-1">{p.type}</td>
                  <td className="px-2 py-1">{p.maker}</td>
                  <td className="px-2 py-1">
                    {p.name}
                    {missing.length > 0 && (
                      <span
                        className="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-700"
                        title={`누락: ${missing.join(", ")}`}
                      >
                        ⚠ {missing.length}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums">{p.capacityKw}</td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {p.equipmentCostKrw == null ? <span className="text-amber-600">—</span> : formatKrw(p.equipmentCostKrw)}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums">
                    {p.annualMaintenanceKrw == null ? <span className="text-amber-600">—</span> : formatKrw(p.annualMaintenanceKrw)}
                  </td>
                  <td className="px-2 py-1 text-right tabular-nums text-gray-600">{formatNumber(d.generationPerUnit)}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-gray-600">{formatKrw(d.elecSavingPerUnit)}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-gray-600">{formatKrw(d.heatSavingAt100)}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-gray-600">{formatKrw(d.gasCostPerUnit)}</td>
                  <td className="px-2 py-1 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setEditing(p)} className="rounded px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50">
                        수정
                      </button>
                      <button onClick={() => duplicateProduct(p.id)} className="rounded px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100">
                        복제
                      </button>
                      <button
                        onClick={() => confirm(`${p.name} 삭제?`) && deleteProduct(p.id)}
                        className="rounded px-2 py-0.5 text-xs text-loss hover:bg-red-50"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">
        파생값(발전/전기절감/열@100%/가스)은 §5 공식으로 현재 가정값 기준 미리보기입니다. ⚠ 배지는 비용 필드 누락을 표시합니다.
      </p>

      {editing && (
        <ProductEditor
          initial={editing}
          existingIds={products.map((p) => p.id)}
          onSave={(p) => {
            upsertProduct(p);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}
