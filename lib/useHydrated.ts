"use client";

import { useEffect, useState } from "react";

/**
 * zustand persist 는 클라이언트에서 localStorage 를 읽으므로 SSR 결과와
 * 초기 클라이언트 렌더가 다를 수 있다. 하이드레이션 완료 여부를 반환해
 * 깜빡임/불일치를 막는다.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
