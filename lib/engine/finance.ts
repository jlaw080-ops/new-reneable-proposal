// 재무 함수 (§6.5): NPV·IRR·할인회수기간 자체 구현
// IRR은 Newton-Raphson + 이분법 폴백.

/**
 * 현금흐름 배열 [CF0, CF1, ...] 에 대한 순현재가치.
 * NPV(r) = Σ CF_t / (1+r)^t   (t = 0..n)
 */
export function npv(rate: number, cashFlows: number[]): number {
  let acc = 0;
  for (let t = 0; t < cashFlows.length; t++) {
    acc += cashFlows[t] / Math.pow(1 + rate, t);
  }
  return acc;
}

/** NPV의 할인율에 대한 도함수 (Newton-Raphson 용). */
function npvDerivative(rate: number, cashFlows: number[]): number {
  let acc = 0;
  for (let t = 1; t < cashFlows.length; t++) {
    acc += (-t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
  }
  return acc;
}

/**
 * 내부수익률(IRR). NPV(r)=0 의 해.
 * 1차로 Newton-Raphson, 실패 시 이분법으로 폴백.
 * 해가 없으면 null.
 */
export function irr(
  cashFlows: number[],
  guess = 0.1,
  tol = 1e-7,
  maxIter = 100,
): number | null {
  if (cashFlows.length < 2) return null;

  // Newton-Raphson
  let rate = guess;
  for (let i = 0; i < maxIter; i++) {
    const f = npv(rate, cashFlows);
    if (Math.abs(f) < tol) return rate;
    const df = npvDerivative(rate, cashFlows);
    if (df === 0 || !Number.isFinite(df)) break;
    const next = rate - f / df;
    if (!Number.isFinite(next) || next <= -1) break;
    if (Math.abs(next - rate) < tol) return next;
    rate = next;
  }

  // 이분법 폴백: 부호가 바뀌는 구간 탐색
  return bisectionIrr(cashFlows, tol, maxIter);
}

function bisectionIrr(
  cashFlows: number[],
  tol: number,
  maxIter: number,
): number | null {
  let lo = -0.9999;
  let hi = 10;
  let fLo = npv(lo, cashFlows);
  let fHi = npv(hi, cashFlows);

  // 구간 내 부호 변화가 없으면 더 넓게 탐색
  if (fLo * fHi > 0) {
    let found = false;
    let prevR = lo;
    let prevF = fLo;
    for (let r = -0.99; r <= 100; r += 0.01) {
      const f = npv(r, cashFlows);
      if (prevF * f <= 0) {
        lo = prevR;
        hi = r;
        fLo = prevF;
        fHi = f;
        found = true;
        break;
      }
      prevR = r;
      prevF = f;
    }
    if (!found) return null;
  }

  for (let i = 0; i < maxIter; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid, cashFlows);
    if (Math.abs(fMid) < tol) return mid;
    if (fLo * fMid < 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}

/**
 * 균등 연간 현금흐름으로 N년 현금흐름 배열을 만든다 (§6.5).
 * cashFlow = [−totalCapex, annual × N]
 */
export function buildCashFlows(
  totalCapex: number,
  annual: number,
  years: number,
): number[] {
  const flows = [-totalCapex];
  for (let y = 0; y < years; y++) flows.push(annual);
  return flows;
}

/**
 * 단순 회수기간(년). annual ≤ 0 이면 null(회수불가).
 */
export function simplePayback(
  totalCapex: number,
  annual: number,
): number | null {
  return annual > 0 ? totalCapex / annual : null;
}

/**
 * 할인 회수기간(년). 누적 할인현금흐름 ≥ 0 이 되는 최초 연차를
 * 선형보간하여 반환. 미도달 시 null("미회수", §6.5).
 */
export function discountedPayback(
  cashFlows: number[],
  rate: number,
): number | null {
  let cumulative = cashFlows[0]; // t=0 (보통 음수)
  for (let t = 1; t < cashFlows.length; t++) {
    const disc = cashFlows[t] / Math.pow(1 + rate, t);
    const prev = cumulative;
    cumulative += disc;
    if (cumulative >= 0) {
      // 직전 연차 말 누적(prev, 음수) → 이번 연차 말 누적(cumulative, 양수)
      const fraction = disc === 0 ? 0 : -prev / disc;
      return t - 1 + fraction;
    }
  }
  return null;
}

/** 케이스 평가 묶음 결과 (§6.5, F5). */
export interface FinanceEvaluation {
  totalCapex: number;
  annual: number;
  npvByYears: Record<number, number>; // {5,10,15,20} → NPV
  irr: number | null;
  simplePaybackYears: number | null;
  discountedPaybackYears: number | null;
  cumulativeCashFlow: number[]; // 누적 명목 현금흐름 (차트용)
}

/**
 * 케이스 재무 평가 (§6.5, F5).
 * @param years   NPV 산출 연차 목록 (기본 5/10/15/20)
 * @param horizon IRR·할인회수 산출용 운영 연차 (기본 20)
 */
export function evaluateFinance(
  totalCapex: number,
  annual: number,
  rate: number,
  years: number[] = [5, 10, 15, 20],
  horizon = 20,
): FinanceEvaluation {
  const npvByYears: Record<number, number> = {};
  for (const y of years) {
    npvByYears[y] = npv(rate, buildCashFlows(totalCapex, annual, y));
  }
  const horizonFlows = buildCashFlows(totalCapex, annual, horizon);

  const cumulativeCashFlow: number[] = [];
  let running = 0;
  for (const cf of horizonFlows) {
    running += cf;
    cumulativeCashFlow.push(running);
  }

  return {
    totalCapex,
    annual,
    npvByYears,
    irr: irr(horizonFlows),
    simplePaybackYears: simplePayback(totalCapex, annual),
    discountedPaybackYears: discountedPayback(horizonFlows, rate),
    cumulativeCashFlow,
  };
}
