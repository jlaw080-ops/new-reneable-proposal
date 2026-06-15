// 달력·계절·부하 상수 (부분 개발요청서 §3)
// 원본 워크북 재현 목적: 2월=28일 고정(윤년 미반영).

export type Season = "summer" | "spring_fall" | "winter";

/** 월별 일수 — 비윤년 고정(원본과 동일). 인덱스 0=1월. */
export const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** 1년 총 일수(고정 365). */
export const DAYS_IN_YEAR = 365;

/**
 * 월(1~12) → 계절 (요금조건 F/J/N 컬럼 매핑).
 * 여름=6~8월(F열), 봄가을=3~5·9·10월(J열), 겨울=11·12·1·2월(N열).
 */
export function seasonOf(m: number): Season {
  if (m >= 6 && m <= 8) return "summer"; // 6~8월 (F열)
  if ((m >= 3 && m <= 5) || m === 9 || m === 10) return "spring_fall"; // 3~5,9,10월 (J열)
  return "winter"; // 11,12,1,2월 (N열)
}
