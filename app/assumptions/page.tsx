"use client";

import { useAppStore } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import type { PvProfile, Project, Tariffs } from "@/lib/engine";

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
  const setTariffs = useAppStore((s) => s.setTariffs);
  const setPv = useAppStore((s) => s.setPv);
  const setProject = useAppStore((s) => s.setProject);
  const resetAll = useAppStore((s) => s.resetAll);

  if (!hydrated) return <div className="text-gray-500">불러오는 중…</div>;

  const upT = (patch: Partial<Tariffs>) => setTariffs({ ...tariffs, ...patch });
  const upP = (patch: Partial<PvProfile>) => setPv({ ...pv, ...patch });
  const upPr = (patch: Partial<Project>) => setProject({ ...project, ...patch });

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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <NumberField label="전기절감 단가(₩/kWh)" value={tariffs.elecSavingKrwPerKwh} onChange={(v) => upT({ elecSavingKrwPerKwh: v })} />
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
        <h2 className="mb-3 font-semibold">프로젝트 가정 — {project.name} (§4.4)</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col text-xs text-gray-600">
            프로젝트명
            <input
              className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
              value={project.name}
              onChange={(e) => upPr({ name: e.target.value })}
            />
          </label>
          <div />
          <NumberField label="오피스 전기비용(₩/년)" value={project.officeElecCostKrwPerYear} onChange={(v) => upPr({ officeElecCostKrwPerYear: v })} />
          <NumberField label="오피스텔 전기비용(₩/년)" value={project.officetelElecCostKrwPerYear} onChange={(v) => upPr({ officetelElecCostKrwPerYear: v })} />
          <NumberField label="오피스 사용량(kWh/년)" value={project.officeUsageKwhPerYear} onChange={(v) => upPr({ officeUsageKwhPerYear: v })} />
          <NumberField label="오피스텔 사용량(kWh/년)" value={project.officetelUsageKwhPerYear} onChange={(v) => upPr({ officetelUsageKwhPerYear: v })} />
        </div>
      </section>

      <p className="text-xs text-gray-500">변경값은 localStorage에 자동 저장되며 모든 화면에 즉시 반영됩니다.</p>
    </div>
  );
}
