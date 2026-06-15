"use client";

import { useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import {
  segmentDerived,
  sumIncludedSegments,
  type ElectricityTariff,
  type GasTariff,
  type HeatTariff,
  type ProjectProfile,
  type PvProfile,
  type Season,
  type SeasonalLoadRate,
  type Tariffs,
  type UsageSegment,
} from "@/lib/engine";
import { formatKrw, formatNumber } from "@/lib/format";

const SEASON_LABEL: Record<Season, string> = {
  summer: "여름(6~8월)",
  spring_fall: "봄·가을(3~5·9·10월)",
  winter: "겨울(11·12·1·2월)",
};

function NumberField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <label className="flex flex-col text-xs text-gray-600">
      {label}
      <input
        type="number"
        className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm tabular-nums"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <span className="mt-0.5 text-[10px] text-gray-400">{hint}</span>}
    </label>
  );
}

export default function AssumptionsPage() {
  const hydrated = useHydrated();
  const tariffs = useAppStore((s) => s.tariffs);
  const pv = useAppStore((s) => s.pv);
  const project = useAppStore((s) => s.project);
  const usageTable = useAppStore((s) => s.usageTable);
  const setTariffs = useAppStore((s) => s.setTariffs);
  const setPv = useAppStore((s) => s.setPv);
  const setProject = useAppStore((s) => s.setProject);
  const resetAll = useAppStore((s) => s.resetAll);

  if (!hydrated) return <div className="text-gray-500">불러오는 중…</div>;

  const upT = (patch: Partial<Tariffs>) => setTariffs({ ...tariffs, ...patch });
  const upP = (patch: Partial<PvProfile>) => setPv({ ...pv, ...patch });
  const upPr = (patch: Partial<ProjectProfile>) => setProject({ ...project, ...patch });

  const segments = project.segments;
  const updateSegment = (id: string, patch: Partial<UsageSegment>) =>
    upPr({ segments: segments.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const addSegment = () =>
    upPr({
      segments: [
        ...segments,
        {
          id: `seg-${Date.now()}`,
          label: `용도 ${segments.length + 1}`,
          usageType: usageTable.types[0]?.name ?? "",
          areaM2: 0,
          included: true,
        },
      ],
    });
  const removeSegment = (id: string) =>
    upPr({ segments: segments.filter((s) => s.id !== id) });

  const totals = sumIncludedSegments(segments, usageTable, tariffs.elecCostKrwPerKwh);

  // 전기/가스/열 단가 매트릭스 편집 헬퍼 (§2)
  const el = tariffs.electricity;
  const gas = tariffs.gas;
  const heat = tariffs.heat;
  const upElec = (patch: Partial<ElectricityTariff>) => upT({ electricity: { ...el, ...patch } });
  const upGas = (patch: Partial<GasTariff>) => upT({ gas: { ...gas, ...patch } });
  const upHeat = (patch: Partial<HeatTariff>) => upT({ heat: { ...heat, ...patch } });
  const upSeason = (s: Season, patch: Partial<SeasonalLoadRate>) =>
    upElec({
      seasonalLoadRateKrwPerKwh: {
        ...el.seasonalLoadRateKrwPerKwh,
        [s]: { ...el.seasonalLoadRateKrwPerKwh[s], ...patch },
      },
    });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">가정값</h1>
        <button
          onClick={() => confirm("모든 가정값/제품을 초기 시드로 되돌립니다. 진행할까요?") && resetAll()}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700"
        >
          초기값 복원
        </button>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-3 font-semibold">에너지 단가 (§2 — 계절·부하별 월간 누적)</h2>

        <h3 className="mb-2 text-sm font-semibold text-gray-700">전기 (요금조건 시트)</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField label="기본료(₩/kW·월)" value={el.basicChargeKrwPerKw} onChange={(v) => upElec({ basicChargeKrwPerKw: v })} />
          <NumberField label="부가세·기금 계수" value={el.vatFundFactor} onChange={(v) => upElec({ vatFundFactor: v })} hint="부가세10%×전력기금≈3.2%" />
          <NumberField label="건물 전기비용 단가(₩/kWh)" value={tariffs.elecCostKrwPerKwh} onChange={(v) => upT({ elecCostKrwPerKwh: v })} hint="에너지사용량→전기비용(베이스라인)" />
        </div>
        <div className="mt-3 overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-xs text-gray-700">
              <tr>
                <th className="px-3 py-1.5 text-left">계절</th>
                <th className="px-3 py-1.5 text-right">중간부하(mid, ₩/kWh)</th>
                <th className="px-3 py-1.5 text-right">최대부하(peak, ₩/kWh)</th>
              </tr>
            </thead>
            <tbody>
              {(["summer", "spring_fall", "winter"] as const).map((s) => (
                <tr key={s} className="border-t border-gray-100">
                  <td className="px-3 py-1.5">{SEASON_LABEL[s]}</td>
                  <td className="px-3 py-1.5 text-right">
                    <input
                      type="number"
                      step="any"
                      className="w-28 rounded border border-gray-300 px-2 py-1 text-right text-sm tabular-nums"
                      value={el.seasonalLoadRateKrwPerKwh[s].mid}
                      onChange={(e) => upSeason(s, { mid: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <input
                      type="number"
                      step="any"
                      className="w-28 rounded border border-gray-300 px-2 py-1 text-right text-sm tabular-nums"
                      value={el.seasonalLoadRateKrwPerKwh[s].peak}
                      onChange={(e) => upSeason(s, { peak: Number(e.target.value) })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mb-2 mt-5 text-sm font-semibold text-gray-700">가스 (요금조건 시트)</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <NumberField label="도매단가(₩/Nm³)" value={gas.wholesaleKrwPerNm3} onChange={(v) => upGas({ wholesaleKrwPerNm3: v })} />
          <NumberField label="kW→Nm³ 환산" value={gas.kwToNm3Factor} onChange={(v) => upGas({ kwToNm3Factor: v })} />
          <NumberField label="부가세 계수" value={gas.vatFactor} onChange={(v) => upGas({ vatFactor: v })} />
        </div>

        <h3 className="mb-2 mt-5 text-sm font-semibold text-gray-700">열 (요금조건 시트)</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <NumberField label="소매단가(₩/Nm³)" value={heat.retailKrwPerNm3} onChange={(v) => upHeat({ retailKrwPerNm3: v })} />
          <NumberField label="최대열량" value={heat.maxCalorificValue} onChange={(v) => upHeat({ maxCalorificValue: v })} />
          <NumberField label="도소매 비율" value={heat.wholesaleRetailRatio} onChange={(v) => upHeat({ wholesaleRetailRatio: v })} />
          <NumberField label="Mcal 환산(0.86)" value={heat.mcalFactor} onChange={(v) => upHeat({ mcalFactor: v })} />
          <NumberField label="부가세 계수" value={heat.vatFactor} onChange={(v) => upHeat({ vatFactor: v })} />
        </div>

        <p className="mt-3 text-[10px] text-amber-600">
          ※ 원본 「요금조건」 시트 셀 값(부가세 계수 1.137은 리터럴 상수로 분해 금지). 경부하(low) 단가는 연료전지 운전에 미사용.
        </p>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="mb-3 font-semibold">태양광 가정 (§4.3)</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <NumberField label="전기절감(₩/kW·년)" value={pv.elecSavingKrwPerKwYear} onChange={(v) => upP({ elecSavingKrwPerKwYear: v })} />
          <NumberField label="고정유지비(₩/년)" value={pv.fixedMaintenanceKrwPerYear} onChange={(v) => upP({ fixedMaintenanceKrwPerYear: v })} />
          <NumberField label="발전량(kWh/kW·년)" value={pv.generationKwhPerKwYear} onChange={(v) => upP({ generationKwhPerKwYear: v })} />
          <NumberField label="설치비(₩/kW)" value={pv.capexKrwPerKw} onChange={(v) => upP({ capexKrwPerKw: v })} />
          <NumberField label="내용연수(년)" value={pv.usefulLifeYears} onChange={(v) => upP({ usefulLifeYears: v })} />
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-semibold">프로젝트 가정 — 용도 · 면적 기반</h2>
          <button onClick={addSegment} className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white">
            + 용도 추가
          </button>
        </div>
        <p className="mb-3 text-xs text-gray-500">
          용도를 추가하고 면적을 입력하면 총 에너지사용량(= 면적 × 단위면적당 에너지사용량)과
          전기비용(= 총 에너지사용량 × 전기비용 단가)이 자동 산출됩니다. 체크된 용도만 평가
          베이스라인에 합산됩니다. 용도별 단위면적당 에너지사용량 값은{" "}
          <a href="/usage" className="text-blue-600 underline">
            용도 관리
          </a>{" "}
          화면에서 편집합니다.
        </p>

        <label className="flex max-w-xs flex-col text-xs text-gray-600">
          프로젝트명
          <input
            className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
            value={project.name}
            onChange={(e) => upPr({ name: e.target.value })}
          />
        </label>

        <div className="mt-4 overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-xs text-gray-700">
              <tr>
                <th className="px-2 py-2 text-center">평가 포함</th>
                <th className="px-2 py-2 text-left">라벨</th>
                <th className="px-2 py-2 text-left">용도</th>
                <th className="px-2 py-2 text-right">면적(㎡)</th>
                <th className="px-2 py-2 text-right">단위면적당</th>
                <th className="px-2 py-2 text-right">총 에너지사용량</th>
                <th className="px-2 py-2 text-right">전기비용(₩/년)</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {segments.map((seg) => {
                const d = segmentDerived(seg, usageTable, tariffs.elecCostKrwPerKwh);
                return (
                  <tr key={seg.id} className={`border-t border-gray-100 ${seg.included ? "" : "opacity-50"}`}>
                    <td className="px-2 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={seg.included}
                        onChange={(e) => updateSegment(seg.id, { included: e.target.checked })}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <input
                        className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
                        value={seg.label}
                        onChange={(e) => updateSegment(seg.id, { label: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-1">
                      <select
                        className="rounded border border-gray-300 px-2 py-1 text-sm"
                        value={seg.usageType}
                        onChange={(e) => updateSegment(seg.id, { usageType: e.target.value })}
                      >
                        {usageTable.types.map((t) => (
                          <option key={t.name} value={t.name}>
                            {t.name} ({formatNumber(t.energyPerAreaKwh, 4)})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1 text-right">
                      <input
                        type="number"
                        min={0}
                        className="w-28 rounded border border-gray-300 px-2 py-1 text-right text-sm tabular-nums"
                        value={seg.areaM2}
                        onChange={(e) => updateSegment(seg.id, { areaM2: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums text-gray-500">{formatNumber(d.energyPerAreaKwh, 4)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{formatNumber(d.totalEnergyKwhPerYear)}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{formatKrw(d.elecCostKrwPerYear)}</td>
                    <td className="px-2 py-1 text-right">
                      <button
                        onClick={() => removeSegment(seg.id)}
                        className="rounded px-2 py-0.5 text-xs text-loss hover:bg-red-50"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                );
              })}
              {segments.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-2 py-3 text-center text-gray-400">
                    용도가 없습니다. “+ 용도 추가”로 추가하세요.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 font-semibold">
                <td className="px-2 py-2" colSpan={5}>
                  합계 (평가 포함 용도)
                </td>
                <td className="px-2 py-2 text-right tabular-nums">{formatNumber(totals.totalEnergyKwhPerYear)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatKrw(totals.elecCostKrwPerYear)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <p className="text-xs text-gray-500">변경값은 localStorage에 자동 저장되며 모든 화면에 즉시 반영됩니다.</p>
    </div>
  );
}
