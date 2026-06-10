"use client";

// 시나리오 입력 상태 (매트릭스/민감도 공유). 제품 마스터/가정값과 분리.
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface ScenarioState {
  heatUseRatio: number; // 0~1
  includeOfficetel: boolean;
  includeHeatSaving: boolean;
  utilization: number; // 연료전지 이용률 (기본 1.0, §10-4)
  /** 기준 Case 강조용 (매트릭스 주황 테두리). */
  baseFcUnits: number;
  basePvCapacityKw: number;

  setHeatUseRatio: (v: number) => void;
  setIncludeOfficetel: (v: boolean) => void;
  setIncludeHeatSaving: (v: boolean) => void;
  setUtilization: (v: number) => void;
  setBaseCase: (fc: number, pv: number) => void;
}

export const useScenarioStore = create<ScenarioState>()(
  persist(
    (set) => ({
      heatUseRatio: 0.45,
      includeOfficetel: false,
      includeHeatSaving: true,
      utilization: 1,
      baseFcUnits: 1,
      basePvCapacityKw: 600,

      setHeatUseRatio: (heatUseRatio) => set({ heatUseRatio }),
      setIncludeOfficetel: (includeOfficetel) => set({ includeOfficetel }),
      setIncludeHeatSaving: (includeHeatSaving) => set({ includeHeatSaving }),
      setUtilization: (utilization) => set({ utilization }),
      setBaseCase: (baseFcUnits, basePvCapacityKw) =>
        set({ baseFcUnits, basePvCapacityKw }),
    }),
    { name: "renewable-scenario-store-v1" },
  ),
);
