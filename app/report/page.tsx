"use client";

import { useMemo } from "react";
import { selectContext, selectProduct, useAppStore } from "@/lib/store";
import { useScenarioStore } from "@/lib/scenarioStore";
import { useHydrated } from "@/lib/useHydrated";
import { computeScenario, evaluateFinance, type ScenarioInput } from "@/lib/engine";
import { formatKrw, formatNumber, formatPayback, formatPercent } from "@/lib/format";

export default function ReportPage() {
  const hydrated = useHydrated();
  const product = useAppStore(selectProduct);
  const ctx = useAppStore(selectContext);
  const tariffs = useAppStore((s) => s.tariffs);
  const pv = useAppStore((s) => s.pv);
  const project = useAppStore((s) => s.project);
  const scenario = useScenarioStore();

  const baseInput: ScenarioInput | null = useMemo(
    () =>
      product
        ? {
            fcUnits: scenario.baseFcUnits,
            pvCapacityKw: scenario.basePvCapacityKw,
            heatUseRatio: scenario.heatUseRatio,
            includeOfficetel: scenario.includeOfficetel,
            includeHeatSaving: scenario.includeHeatSaving,
            utilization: scenario.utilization,
          }
        : null,
    [product, scenario],
  );

  const result = useMemo(
    () => (product && baseInput ? computeScenario(product, baseInput, ctx) : null),
    [product, baseInput, ctx],
  );
  const fin = useMemo(
    () => (result ? evaluateFinance(result.totalCapex, result.annualNetProfit, 0.045) : null),
    [result],
  );

  if (!hydrated) return <div className="text-gray-500">불러오는 중…</div>;
  if (!product || !result || !baseInput || !fin) return <div className="text-loss">선택된 제품이 없습니다.</div>;

  const profitable = result.annualNetProfit > 0;
  const conclusion =
    `${project.name} 프로젝트에서 ${product.name} ${baseInput.fcUnits}기와 태양광 ${formatNumber(baseInput.pvCapacityKw)}kW를 ` +
    `열사용비율 ${formatPercent(baseInput.heatUseRatio)} 기준으로 적용할 경우, 연간 순익은 ${formatKrw(result.annualNetProfit)}원으로 ` +
    `${profitable ? "흑자" : "적자"}이며, 감가상각 반영 순익은 ${formatKrw(result.netProfitAfterDep)}원입니다. ` +
    `단순 투자회수기간은 ${formatPayback(result.payback)}이고, ` +
    `총 발전량은 ${formatNumber(result.totalGeneration)}kWh로 기준 사용량 ${formatNumber(result.baselineUsageKwh)}kWh 대비 ` +
    `${result.selfSufficient ? "전력 자급이 가능" : `순사용량 ${formatNumber(result.netUsage)}kWh가 부족`}합니다.`;

  return (
    <div className="space-y-6">
      <div className="no-print flex items-center justify-between">
        <h1 className="text-xl font-bold">리포트</h1>
        <button onClick={() => window.print()} className="rounded bg-gray-900 px-4 py-1.5 text-sm text-white">
          A4 인쇄 / PDF 저장
        </button>
      </div>

      <article className="print-page mx-auto max-w-3xl space-y-5 rounded-lg border border-gray-200 bg-white p-8">
        <header className="border-b border-gray-300 pb-3">
          <h2 className="text-2xl font-bold">신재생에너지 경제성 검토 리포트</h2>
          <p className="text-sm text-gray-500">{project.name} · 작성일 {new Date().toLocaleDateString("ko-KR")}</p>
        </header>

        <section>
          <h3 className="mb-2 font-semibold">1. 검토 대상</h3>
          <table className="w-full text-sm">
            <tbody>
              <RowKV k="연료전지 제품" v={`${product.name} (${product.type}, ${product.maker})`} />
              <RowKV k="연료전지 기수" v={`${baseInput.fcUnits} 기`} />
              <RowKV k="태양광 용량" v={`${formatNumber(baseInput.pvCapacityKw)} kW (설치면적 ${formatNumber(baseInput.pvCapacityKw * 5)}㎡)`} />
              <RowKV k="열사용비율 / 이용률" v={`${formatPercent(baseInput.heatUseRatio)} / ${formatPercent(baseInput.utilization ?? 1)}`} />
              <RowKV
                k="대상 건물 용도 / 면적"
                v={`오피스 ${project.officeUsageType} ${formatNumber(project.officeAreaM2)}㎡${
                  baseInput.includeOfficetel ? ` + 오피스텔 ${project.officetelUsageType} ${formatNumber(project.officetelAreaM2)}㎡` : ""
                }`}
              />
              <RowKV k="오피스텔 포함 여부" v={baseInput.includeOfficetel ? "포함" : "미포함"} />
            </tbody>
          </table>
        </section>

        <section>
          <h3 className="mb-2 font-semibold">2. 가정값</h3>
          <table className="w-full text-sm">
            <tbody>
              <RowKV k="전기절감 단가" v={`${formatNumber(tariffs.elecSavingKrwPerKwh, 4)} ₩/kWh`} />
              <RowKV k="가스비용 단가" v={`${formatNumber(tariffs.gasCostKrwPerKwh, 4)} ₩/kWh`} />
              <RowKV k="열절감 단가" v={`${formatNumber(tariffs.heatSavingKrwPerKwh, 2)} ₩/kWh`} />
              <RowKV k="전기비용 단가" v={`${formatNumber(tariffs.elecCostKrwPerKwh, 4)} ₩/kWh`} />
              <RowKV k="대상 전기비용 기준" v={`${formatKrw(result.baseline)} ₩/년 (사용량 ${formatNumber(result.baselineUsageKwh)} kWh)`} />
              <RowKV k="태양광 전기절감" v={`${formatKrw(pv.elecSavingKrwPerKwYear)} ₩/kW·년`} />
              <RowKV k="태양광 발전량" v={`${formatNumber(pv.generationKwhPerKwYear, 1)} kWh/kW·년`} />
            </tbody>
          </table>
        </section>

        <section>
          <h3 className="mb-2 font-semibold">3. 경제성 결과</h3>
          <table className="w-full text-sm">
            <tbody>
              <RowKV k="연간 순익" v={`${formatKrw(result.annualNetProfit)} 원`} good={result.annualNetProfit > 0} />
              <RowKV k="감가상각 반영 순익" v={`${formatKrw(result.netProfitAfterDep)} 원`} good={result.netProfitAfterDep > 0} />
              <RowKV k="총 투자비" v={`${formatKrw(result.totalCapex)} 원`} />
              <RowKV k="단순 투자회수기간" v={formatPayback(result.payback)} />
              <RowKV k="NPV (20년, 4.5%)" v={`${formatKrw(fin.npvByYears[20])} 원`} good={fin.npvByYears[20] > 0} />
              <RowKV k="IRR" v={fin.irr != null ? formatPercent(fin.irr, 2) : "—"} />
              <RowKV k="할인 회수기간" v={fin.discountedPaybackYears == null ? "미회수" : formatPayback(fin.discountedPaybackYears)} />
              <RowKV k="총 발전량" v={`${formatNumber(result.totalGeneration)} kWh`} />
              <RowKV k="순사용량" v={`${formatNumber(result.netUsage)} kWh ${result.selfSufficient ? "(자급)" : "(부족)"}`} good={result.selfSufficient} />
            </tbody>
          </table>
        </section>

        <section>
          <h3 className="mb-2 font-semibold">4. 결론</h3>
          <p className="text-sm leading-relaxed text-gray-800">{conclusion}</p>
        </section>

        <footer className="border-t border-gray-200 pt-2 text-xs text-gray-400">
          본 리포트의 단가는 역산 검증값 기준이며, 원본 「요금조건」 시트 확정 후 갱신될 수 있습니다.
        </footer>
      </article>
    </div>
  );
}

function RowKV({ k, v, good }: { k: string; v: string; good?: boolean }) {
  return (
    <tr className="border-b border-gray-100">
      <td className="w-1/3 py-1.5 text-gray-600">{k}</td>
      <td className={`py-1.5 font-medium ${good === undefined ? "" : good ? "text-profit" : "text-loss"}`}>{v}</td>
    </tr>
  );
}
