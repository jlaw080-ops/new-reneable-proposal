"use client";

// 시나리오 입력 상태 (매트릭스/민감도 공유). 제품 마스터/가정값과 분리.
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ScenarioState {
  heatUseRatio: number; // 0~1
  includeHeatSaving: boolean;
  utilization: number; // 연료전지 이용률 (기본 1.0, §10-4)
  /** 기준 Case 강조용 (매트릭스 주황 테두리). */
  baseFcUnits: number;
  basePvCapacityKw: number;
  /** 기수 축 설정 — 최대 설치대수 / 표시 간격. */
  maxFcUnits: number;
  fcUnitStep: number;
  /** 태양광 용량 축 설정 — 최소/최대 용량(kW) / 설치 단위(50kW). */
  minPvCapacityKw: number;
  maxPvCapacityKw: number;
  pvCapacityStep: number;
  /** 열사용비율 매트릭스 설정 — 고정 태양광 용량(kW) / 열사용비율 표시 간격(%). */
  heatMatrixPvKw: number;
  heatRatioStepPct: number;

  setHeatUseRatio: (v: number) => void;
  setIncludeHeatSaving: (v: boolean) => void;
  setUtilization: (v: number) => void;
  setBaseCase: (fc: number, pv: number) => void;
  setMaxFcUnits: (v: number) => void;
  setFcUnitStep: (v: number) => void;
  setMinPvCapacityKw: (v: number) => void;
  setMaxPvCapacityKw: (v: number) => void;
  setPvCapacityStep: (v: number) => void;
  setHeatMatrixPvKw: (v: number) => void;
  setHeatRatioStepPct: (v: number) => void;
}

export const useScenarioStore = create<ScenarioState>()(
  persist(
    (set) => ({
      heatUseRatio: 0.45,
      includeHeatSaving: true,
      utilization: 1,
      baseFcUnits: 1,
      basePvCapacityKw: 600,
      maxFcUnits: 100,
      fcUnitStep: 5,
      minPvCapacityKw: 600,
      maxPvCapacityKw: 3200,
      pvCapacityStep: 400,
      heatMatrixPvKw: 700,
      heatRatioStepPct: 5,

      setHeatUseRatio: (heatUseRatio) => set({ heatUseRatio }),
      setIncludeHeatSaving: (includeHeatSaving) => set({ includeHeatSaving }),
      setUtilization: (utilization) => set({ utilization }),
      setBaseCase: (baseFcUnits, basePvCapacityKw) =>
        set({ baseFcUnits, basePvCapacityKw }),
      setMaxFcUnits: (maxFcUnits) => set({ maxFcUnits }),
      setFcUnitStep: (fcUnitStep) => set({ fcUnitStep }),
      setMinPvCapacityKw: (minPvCapacityKw) => set({ minPvCapacityKw }),
      setMaxPvCapacityKw: (maxPvCapacityKw) => set({ maxPvCapacityKw }),
      setPvCapacityStep: (pvCapacityStep) => set({ pvCapacityStep }),
      setHeatMatrixPvKw: (heatMatrixPvKw) => set({ heatMatrixPvKw }),
      setHeatRatioStepPct: (heatRatioStepPct) => set({ heatRatioStepPct }),
    }),
    { name: "renewable-scenario-store-v5" },
  ),
);
