"use client";

import { useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import {
  segmentDerived,
  sumIncludedSegments,
  type ProjectProfile,
  type PvProfile,
  type Tariffs,
  type UsageSegment,
} from "@/lib/engine";
import { formatKrw, formatNumber } from "@/lib/format";

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
        <h2 className="mb-3 font-semibold">에너지 단가 (§4.2)</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField label="전기절감 단가(₩/kWh)" value={tariffs.elecSavingKrwPerKwh} onChange={(v) => upT({ elecSavingKrwPerKwh: v })} />
          <NumberField label="전기비용 단가(₩/kWh)" value={tariffs.elecCostKrwPerKwh} onChange={(v) => upT({ elecCostKrwPerKwh: v })} hint="에너지사용량→전기비용 환산" />
          <NumberField label="가스비용 단가(₩/kWh)" value={tariffs.gasCostKrwPerKwh} onChange={(v) => upT({ gasCostKrwPerKwh: v })} />
          <NumberField label="열절감 단가(₩/kWh)" value={tariffs.heatSavingKrwPerKwh} onChange={(v) => upT({ heatSavingKrwPerKwh: v })} />
        </div>
        <p className="mt-2 text-[10px] text-amber-600">
          {/* TODO(§10-1): 원본 '요금조건' 시트 셀 확인 후 정밀값으로 갱신 */}
          ※ 역산 검증값. 원본 「요금조건」 시트 확인 후 갱신 가능.
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
          베이스라인에 합산됩니다.
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
