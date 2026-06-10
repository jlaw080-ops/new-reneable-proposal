"use client";

// 앱 상태 (Zustand) — localStorage 1단계 저장 (§2)
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  BuildingUsageTable,
  EngineContext,
  FuelCellProduct,
  ProjectProfile,
  PvProfile,
  Tariffs,
} from "./engine";
import { resolveProject } from "./engine";
import seedProducts from "@/data/fuel-cell-products.json";
import seedTariffs from "@/data/tariffs.json";
import seedPv from "@/data/pv-profile.json";
import seedProfile from "@/data/projects/goyang-profile.json";
import seedUsage from "@/data/building-usage.json";

export interface AppState {
  products: FuelCellProduct[];
  tariffs: Tariffs;
  pv: PvProfile;
  /** 용도+면적 기반 프로젝트 가정. */
  project: ProjectProfile;
  /** 용도별 단위면적당 에너지사용량 테이블. */
  usageTable: BuildingUsageTable;
  /** 매트릭스/계산 기준 선택 제품 id. */
  selectedProductId: string;

  // 제품 마스터 CRUD (F1)
  upsertProduct: (p: FuelCellProduct) => void;
  deleteProduct: (id: string) => void;
  duplicateProduct: (id: string) => void;
  replaceProducts: (ps: FuelCellProduct[]) => void;

  // 가정값 편집 (F2)
  setTariffs: (t: Tariffs) => void;
  setPv: (pv: PvProfile) => void;
  setProject: (p: ProjectProfile) => void;
  setUsageTable: (t: BuildingUsageTable) => void;

  setSelectedProductId: (id: string) => void;
  resetAll: () => void;
}

const defaults = {
  products: seedProducts as FuelCellProduct[],
  tariffs: seedTariffs as Tariffs,
  pv: seedPv as PvProfile,
  project: seedProfile as ProjectProfile,
  usageTable: seedUsage as BuildingUsageTable,
  selectedProductId: "bumhan-10kw",
};

function uniqueId(base: string, existing: FuelCellProduct[]): string {
  let id = base;
  let n = 1;
  while (existing.some((p) => p.id === id)) {
    id = `${base}-copy${n > 1 ? n : ""}`;
    n++;
  }
  return id;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...defaults,

      upsertProduct: (p) =>
        set((s) => {
          const idx = s.products.findIndex((x) => x.id === p.id);
          if (idx === -1) return { products: [...s.products, p] };
          const next = s.products.slice();
          next[idx] = p;
          return { products: next };
        }),

      deleteProduct: (id) =>
        set((s) => {
          const products = s.products.filter((p) => p.id !== id);
          const selectedProductId =
            s.selectedProductId === id
              ? products[0]?.id ?? ""
              : s.selectedProductId;
          return { products, selectedProductId };
        }),

      duplicateProduct: (id) =>
        set((s) => {
          const src = s.products.find((p) => p.id === id);
          if (!src) return s;
          const copy: FuelCellProduct = {
            ...src,
            id: uniqueId(`${src.id}-copy`, s.products),
            name: `${src.name} (복제)`,
          };
          return { products: [...s.products, copy] };
        }),

      replaceProducts: (ps) =>
        set((s) => ({
          products: ps,
          selectedProductId: ps.some((p) => p.id === s.selectedProductId)
            ? s.selectedProductId
            : ps[0]?.id ?? "",
        })),

      setTariffs: (tariffs) => set({ tariffs }),
      setPv: (pv) => set({ pv }),
      setProject: (project) => set({ project }),
      setUsageTable: (usageTable) => set({ usageTable }),
      setSelectedProductId: (selectedProductId) => set({ selectedProductId }),

      resetAll: () => set({ ...defaults }),
    }),
    {
      // 단가(tariffs)가 계절·부하별 매트릭스로 바뀌어 저장 스키마 버전 갱신(v4).
      name: "renewable-economics-store-v4",
    },
  ),
);

/** 스토어에서 엔진 컨텍스트를 조립. 용도+면적 프로젝트를 베이스라인으로 파생. */
export function selectContext(s: AppState): EngineContext {
  return {
    tariffs: s.tariffs,
    pv: s.pv,
    project: resolveProject(s.project, s.usageTable, s.tariffs),
  };
}

export function selectProduct(s: AppState): FuelCellProduct | undefined {
  return s.products.find((p) => p.id === s.selectedProductId);
}
