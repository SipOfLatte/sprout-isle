// Small, dependency-free statistics for the wellbeing analysis.

export function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

export function sampleVariance(xs: number[]): number | null {
  const m = mean(xs);
  if (m === null || xs.length < 2) return null;
  return xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
}

const T975 = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.16, 2.145, 2.131, 2.12, 2.11, 2.101, 2.093, 2.086, 2.08, 2.074, 2.069, 2.064, 2.06, 2.056, 2.052, 2.048, 2.045, 2.042];

/** Two-sided 95% critical value of Student's t. Table values to 30 df, interpolated
 *  in 1/df for fractional Welch df, then a Cornish-Fisher expansion beyond. */
export function tCritical95(df: number): number {
  if (df < 1) return Infinity;
  if (df > 30) {
    const z = 1.959964;
    return z + (z ** 3 + z) / (4 * df) + (5 * z ** 5 + 16 * z ** 3 + 3 * z) / (96 * df ** 2);
  }
  const lo = Math.floor(df);
  const hi = Math.min(30, lo + 1);
  if (lo === hi || lo === df) return T975[lo - 1];
  const w = (1 / lo - 1 / df) / (1 / lo - 1 / hi);
  return T975[lo - 1] + w * (T975[hi - 1] - T975[lo - 1]);
}

export interface MeanDifference {
  diff: number;
  lo: number;
  hi: number;
  df: number;
  meanA: number;
  meanB: number;
  nA: number;
  nB: number;
}

/** Difference in means (a − b) with a Welch 95% confidence interval,
 *  which doesn't assume the two groups have equal variance. */
export function welchInterval(a: number[], b: number[]): MeanDifference | null {
  const va = sampleVariance(a);
  const vb = sampleVariance(b);
  const ma = mean(a);
  const mb = mean(b);
  if (va === null || vb === null || ma === null || mb === null) return null;
  const qa = va / a.length;
  const qb = vb / b.length;
  const se = Math.sqrt(qa + qb);
  const diff = ma - mb;
  if (se === 0) return { diff, lo: diff, hi: diff, df: a.length + b.length - 2, meanA: ma, meanB: mb, nA: a.length, nB: b.length };
  const df = (qa + qb) ** 2 / (qa ** 2 / (a.length - 1) + qb ** 2 / (b.length - 1));
  const margin = tCritical95(df) * se;
  return { diff, lo: diff - margin, hi: diff + margin, df, meanA: ma, meanB: mb, nA: a.length, nB: b.length };
}

export interface LinearFit {
  slope: number;
  intercept: number;
  r: number;
  n: number;
}

/** Ordinary least squares y = intercept + slope·x, with Pearson's r. */
export function linearFit(xs: number[], ys: number[]): LinearFit | null {
  const n = xs.length;
  if (n < 3 || n !== ys.length) return null;
  const mx = mean(xs)!;
  const my = mean(ys)!;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  if (sxx === 0 || syy === 0) return null;
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx, r: sxy / Math.sqrt(sxx * syy), n };
}
