"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { selectContext, useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { computeScenario, evaluateFinance } from "@/lib/engine";
import { formatKrw, formatMillion, formatPayback, formatPercent } from "@/lib/format";

const COLORS = ["#2563eb", "#16a34a", "#f97316", "#9333ea"];

interface CaseDef {
  id: string;
  label: string;
  productId: string;
  fcUnits: number;
  pvCapacityKw: number;
  heatUseRatio: number;
  includeOfficetel: boolean;
  discountRate: number;
}

let seq = 0;
function newCase(productId: string, label: string): CaseDef {
  return {
    id: `case-${seq++}`,
    label,
    productId,
    fcUnits: 15,
    pvCapacityKw: 2000,
    heatUseRatio: 0.45,
    includeOfficetel: false,
    discountRate: 0.045,
  };
}

const NPV_YEARS = [5, 10, 15, 20];

export default function CasesPage() {
  const hydrated = useHydrated();
  const products = useAppStore((s) => s.products);
  const ctx = useAppStore(selectContext);
  const [cases, setCases] = useState<CaseDef[]>([]);

  // 초기 1케이스 (하이드레이션 후 1회)
  if (hydrated && cases.length === 0 && products.length > 0) {
    setCases([newCase(products[0].id, "케이스 A")]);
  }

  const evals = useMemo(() => {
    return cases.map((c) => {
      const product = products.find((p) => p.id === c.productId);
      if (!product) return null;
      const r = computeScenario(
        product,
        {
          fcUnits: c.fcUnits,
          pvCapacityKw: c.pvCapacityKw,
          heatUseRatio: c.heatUseRatio,
          includeOfficetel: c.includeOfficetel,
          includeHeatSaving: true,
        },
        ctx,
      );
      const fin = evaluateFinance(r.totalCapex, r.annualNetProfit, c.discountRate, NPV_YEARS, 20);
      return { case: c, product, result: r, fin };
    });
  }, [cases, products, ctx]);

  const chartData = useMemo(() => {
    const rows: Record<string, number>[] = [];
    for (let t = 0; t <= 20; t++) {
      const row: Record<string, number> = { year: t };
      evals.forEach((e, i) => {
        if (e) row[`c${i}`] = e.fin.cumulativeCashFlow[t] / 1_000_000;
      });
      rows.push(row);
    }
    return rows;
  }, [evals]);

  function update(id: string, patch: Partial<CaseDef>) {
    setCases((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  if (!hydrated) return <div className="text-gray-500">불러오는 중…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">케이스 비교 ({cases.length}/4)</h1>
        <button
          disabled={cases.length >= 4}
          onClick={() => setCases((cs) => [...cs, newCase(products[0].id, `케이스 ${String.fromCharCode(65 + cs.length)}`)])}
          className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white disabled:opacity-40"
        >
          + 케이스 추가
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-4">
        {cases.map((c, i) => (
          <div key={c.id} className="rounded-lg border-t-4 bg-white p-4 shadow-sm" style={{ borderTopColor: COLORS[i] }}>
            <div className="mb-2 flex items-center justify-between">
              <input
                className="w-28 rounded border border-gray-200 px-2 py-0.5 text-sm font-semibold"
                value={c.label}
                onChange={(e) => update(c.id, { label: e.target.value })}
              />
              <button onClick={() => setCases((cs) => cs.filter((x) => x.id !== c.id))} className="text-xs text-loss">
                삭제
              </button>
            </div>
            <div className="space-y-2">
              <label className="flex flex-col text-xs text-gray-600">
                제품
                <select className="mt-1 rounded border border-gray-300 px-1 py-1 text-xs" value={c.productId} onChange={(e) => update(c.id, { productId: e.target.value })}>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col text-xs text-gray-600">
                  기수
                  <input type="number" min={0} value={c.fcUnits} onChange={(e) => update(c.id, { fcUnits: Number(e.target.value) })} className="mt-1 rounded border border-gray-300 px-1 py-1 text-xs" />
                </label>
                <label className="flex flex-col text-xs text-gray-600">
                  태양광kW
                  <input type="number" min={0} step={100} value={c.pvCapacityKw} onChange={(e) => update(c.id, { pvCapacityKw: Number(e.target.value) })} className="mt-1 rounded border border-gray-300 px-1 py-1 text-xs" />
                </label>
                <label className="flex flex-col text-xs text-gray-600">
                  열사용 {formatPercent(c.heatUseRatio, 0)}
                  <input type="range" min={0} max={1} step={0.05} value={c.heatUseRatio} onChange={(e) => update(c.id, { heatUseRatio: Number(e.target.value) })} className="mt-1" />
                </label>
                <label className="flex flex-col text-xs text-gray-600">
                  할인율 {formatPercent(c.discountRate, 1)}
                  <input type="range" min={0} max={0.15} step={0.005} value={c.discountRate} onChange={(e) => update(c.id, { discountRate: Number(e.target.value) })} className="mt-1" />
                </label>
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input type="checkbox" checked={c.includeOfficetel} onChange={(e) => update(c.id, { includeOfficetel: e.target.checked })} />
                오피스텔 포함
              </label>
            </div>
          </div>
        ))}
      </div>

      <section className="overflow-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-xs text-gray-700">
            <tr>
              <th className="px-3 py-2 text-left">지표</th>
              {evals.map((e, i) => (
                <th key={i} className="px-3 py-2 text-right" style={{ color: COLORS[i] }}>{e?.case.label ?? "-"}</th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            <Row label="총 투자비(₩)" cells={evals.map((e) => (e ? formatKrw(e.fin.totalCapex) : "-"))} />
            <Row label="연간 순익(₩)" cells={evals.map((e) => (e ? formatKrw(e.result.annualNetProfit) : "-"))} sign={evals.map((e) => e?.result.annualNetProfit ?? 0)} />
            {NPV_YEARS.map((y) => (
              <Row key={y} label={`NPV ${y}년(₩)`} cells={evals.map((e) => (e ? formatKrw(e.fin.npvByYears[y]) : "-"))} sign={evals.map((e) => e?.fin.npvByYears[y] ?? 0)} />
            ))}
            <Row label="IRR" cells={evals.map((e) => (e?.fin.irr != null ? formatPercent(e.fin.irr, 2) : "—"))} />
            <Row label="단순 회수기간" cells={evals.map((e) => (e ? formatPayback(e.fin.simplePaybackYears) : "-"))} />
            <Row label="할인 회수기간" cells={evals.map((e) => (e ? (e.fin.discountedPaybackYears == null ? "미회수" : formatPayback(e.fin.discountedPaybackYears)) : "-"))} />
          </tbody>
        </table>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-2 font-semibold">누적 현금흐름 (20년, 명목)</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" fontSize={11} label={{ value: "년차", position: "insideBottom", offset: -2, fontSize: 11 }} />
              <YAxis tickFormatter={(v) => formatMillion(v * 1_000_000, 0)} fontSize={11} width={55} />
              <Tooltip formatter={(v: number) => `${v.toFixed(0)} 백만원`} />
              <Legend />
              <ReferenceLine y={0} stroke="#888" />
              {evals.map((e, i) => e && <Line key={i} type="monotone" dataKey={`c${i}`} name={e.case.label} stroke={COLORS[i]} strokeWidth={2} dot={false} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-1 text-center text-xs text-gray-500">단위: 백만원 · 0선 교차 = 단순 회수 시점</p>
      </section>
    </div>
  );
}

function Row({ label, cells, sign }: { label: string; cells: string[]; sign?: number[] }) {
  return (
    <tr className="border-t border-gray-100">
      <td className="px-3 py-1.5 text-gray-700">{label}</td>
      {cells.map((c, i) => (
        <td key={i} className={`px-3 py-1.5 text-right ${sign ? (sign[i] < 0 ? "text-loss" : sign[i] > 0 ? "text-profit" : "") : ""}`}>
          {c}
        </td>
      ))}
    </tr>
  );
}
