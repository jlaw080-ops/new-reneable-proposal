"use client";

import { useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { deriveUsage, type ProjectProfile, type PvProfile, type Tariffs } from "@/lib/engine";
import { formatKrw, formatNumber } from "@/lib/format";

function UsageBlock({
  title,
  usageType,
  areaM2,
  usageTable,
  derived,
  onUsageType,
  onArea,
}: {
  title: string;
  usageType: string;
  areaM2: number;
  usageTable: import("@/lib/engine").BuildingUsageTable;
  derived: ReturnType<typeof deriveUsage>;
  onUsageType: (v: string) => void;
  onArea: (v: number) => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <h3 className="mb-3 text-sm font-semibold text-gray-800">{title}</h3>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col text-xs text-gray-600">
          용도
          <select
            className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
            value={usageType}
            onChange={(e) => onUsageType(e.target.value)}
          >
            {usageTable.types.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name} ({formatNumber(t.energyPerAreaKwh, 4)})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-xs text-gray-600">
          면적(㎡)
          <input
            type="number"
            min={0}
            className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm tabular-nums"
            value={areaM2}
            onChange={(e) => onArea(Number(e.target.value))}
          />
        </label>
      </div>
      <dl className="mt-3 space-y-1 border-t border-gray-200 pt-3 text-xs">
        <div className="flex justify-between">
          <dt className="text-gray-500">단위면적당 에너지사용량</dt>
          <dd className="tabular-nums">{formatNumber(derived.energyPerAreaKwh, 4)} kWh/㎡·년</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">총 에너지사용량</dt>
          <dd className="font-medium tabular-nums">{formatNumber(derived.totalEnergyKwhPerYear)} kWh/년</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500">전기비용</dt>
          <dd className="font-medium tabular-nums text-gray-900">{formatKrw(derived.elecCostKrwPerYear)} ₩/년</dd>
        </div>
      </dl>
    </div>
  );
}

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

  const officeDerived = deriveUsage(project.officeAreaM2, project.officeUsageType, usageTable, tariffs.elecCostKrwPerKwh);
  const officetelDerived = deriveUsage(project.officetelAreaM2, project.officetelUsageType, usageTable, tariffs.elecCostKrwPerKwh);

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
        <h2 className="mb-1 font-semibold">프로젝트 가정 — 용도 · 면적 기반</h2>
        <p className="mb-3 text-xs text-gray-500">
          용도를 선택하고 면적을 입력하면 총 에너지사용량(= 면적 × 단위면적당 에너지사용량)과
          전기비용(= 총 에너지사용량 × 전기비용 단가)이 자동 산출됩니다.
        </p>

        <label className="flex max-w-xs flex-col text-xs text-gray-600">
          프로젝트명
          <input
            className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
            value={project.name}
            onChange={(e) => upPr({ name: e.target.value })}
          />
        </label>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <UsageBlock
            title="오피스"
            usageType={project.officeUsageType}
            areaM2={project.officeAreaM2}
            usageTable={usageTable}
            derived={officeDerived}
            onUsageType={(v) => upPr({ officeUsageType: v })}
            onArea={(v) => upPr({ officeAreaM2: v })}
          />
          <UsageBlock
            title="오피스텔 (오피스텔 포함 토글 시 합산)"
            usageType={project.officetelUsageType}
            areaM2={project.officetelAreaM2}
            usageTable={usageTable}
            derived={officetelDerived}
            onUsageType={(v) => upPr({ officetelUsageType: v })}
            onArea={(v) => upPr({ officetelAreaM2: v })}
          />
        </div>
      </section>

      <p className="text-xs text-gray-500">변경값은 localStorage에 자동 저장되며 모든 화면에 즉시 반영됩니다.</p>
    </div>
  );
}
