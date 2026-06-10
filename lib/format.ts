// 숫자 표기 유틸 (§7): 천단위 콤마, 음수 괄호 (123) 적색, 비율 0.0%, 회수기간 0.0년

/** 천단위 콤마, 음수는 괄호 표기. 소수 자리수 지정 가능. */
export function formatNumber(value: number, fractionDigits = 0): string {
  if (!Number.isFinite(value)) return "-";
  const abs = Math.abs(value).toLocaleString("ko-KR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return value < 0 ? `(${abs})` : abs;
}

/** 통화(원) 표기 — 정수 반올림. */
export function formatKrw(value: number): string {
  return formatNumber(Math.round(value), 0);
}

/** 백만원 단위 표기 (대형 매트릭스 가독성). */
export function formatMillion(value: number, fractionDigits = 1): string {
  return formatNumber(value / 1_000_000, fractionDigits);
}

/** 비율 0.0% (입력은 0~1). */
export function formatPercent(ratio: number, fractionDigits = 1): string {
  if (!Number.isFinite(ratio)) return "-";
  return `${(ratio * 100).toFixed(fractionDigits)}%`;
}

/** 회수기간 0.0년. null → "회수불가". */
export function formatPayback(years: number | null): string {
  if (years == null) return "회수불가";
  return `${years.toFixed(1)}년`;
}

/** 값 부호에 따른 색상 클래스 (양수 녹색/음수 적색). */
export function signClass(value: number): string {
  if (value > 0) return "text-profit";
  if (value < 0) return "text-loss";
  return "text-gray-600";
}
