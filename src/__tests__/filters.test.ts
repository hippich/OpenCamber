import { describe, it, expect } from 'vitest';
import { lowPassFilter, calculateVariance, isStable, getStabilityProgress } from '../utils/filters';

// Constants duplicated here to keep tests self-contained
const STABILITY_WINDOW_SIZE = 40;
const STABILITY_VARIANCE_THRESHOLD = 0.25;

// ─── lowPassFilter ────────────────────────────────────────────────────────────

describe('lowPassFilter', () => {
  it('returns raw value when previous equals raw (no change)', () => {
    expect(lowPassFilter(10, 10)).toBeCloseTo(10, 10);
  });

  it('blends toward raw value: y = 0.8*prev + 0.2*raw', () => {
    // alpha = 0.2, so: 0.8 * 0 + 0.2 * 10 = 2
    expect(lowPassFilter(10, 0)).toBeCloseTo(2, 10);
  });

  it('gives more weight to previous than raw', () => {
    const result = lowPassFilter(100, 0);
    expect(result).toBe(20); // 0.2 * 100 = 20
    expect(result).toBeLessThan(100);
  });

  it('converges toward raw over successive calls', () => {
    let filtered = 0;
    for (let i = 0; i < 50; i++) filtered = lowPassFilter(10, filtered);
    expect(filtered).toBeCloseTo(10, 1);
  });

  it('handles negative values', () => {
    // 0.8 * 0 + 0.2 * (-5) = -1
    expect(lowPassFilter(-5, 0)).toBeCloseTo(-1, 10);
  });
});

// ─── calculateVariance ────────────────────────────────────────────────────────

describe('calculateVariance', () => {
  it('returns 0 for empty array', () => {
    expect(calculateVariance([])).toBe(0);
  });

  it('returns 0 when all values are the same', () => {
    expect(calculateVariance([5, 5, 5, 5, 5])).toBe(0);
  });

  it('returns correct variance for known values', () => {
    // values: [2, 4, 4, 4, 5, 5, 7, 9]
    // mean = 5, variance = (9+1+1+1+0+0+4+16)/8 = 32/8 = 4
    expect(calculateVariance([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(4, 10);
  });

  it('returns 0.25 for simple two-value case', () => {
    // [0, 1]: mean=0.5, variance = ((0-0.5)^2 + (1-0.5)^2) / 2 = (0.25+0.25)/2 = 0.25
    expect(calculateVariance([0, 1])).toBeCloseTo(0.25, 10);
  });

  it('handles single element', () => {
    expect(calculateVariance([3])).toBe(0);
  });

  it('handles negative values', () => {
    // [-1, 1]: mean=0, variance = (1+1)/2 = 1
    expect(calculateVariance([-1, 1])).toBeCloseTo(1, 10);
  });
});

// ─── isStable ────────────────────────────────────────────────────────────────

describe('isStable', () => {
  it('returns false for empty history', () => {
    expect(isStable([])).toBe(false);
  });

  it('returns false when fewer than window-size samples', () => {
    const shortHistory = Array(STABILITY_WINDOW_SIZE - 1).fill(0);
    expect(isStable(shortHistory)).toBe(false);
  });

  it('returns true when enough samples and all values identical (variance=0)', () => {
    const stableHistory = Array(STABILITY_WINDOW_SIZE).fill(2.5);
    expect(isStable(stableHistory)).toBe(true);
  });

  it('returns true when variance is just below threshold', () => {
    // target variance ≈ 0.2 (below 0.25 threshold)
    // distribute values around mean=0: half at +sqrt(0.2), half at -sqrt(0.2)
    const delta = Math.sqrt(0.2 * 2); // such that variance ≈ 0.2 for two-point distribution
    const history: number[] = [];
    for (let i = 0; i < STABILITY_WINDOW_SIZE; i++) {
      history.push(i % 2 === 0 ? delta / 2 : -delta / 2);
    }
    const v = calculateVariance(history);
    expect(v).toBeLessThan(STABILITY_VARIANCE_THRESHOLD);
    expect(isStable(history)).toBe(true);
  });

  it('returns false when variance is above threshold', () => {
    // Alternate between -1° and +1°: variance = 1
    const unstable = Array(STABILITY_WINDOW_SIZE)
      .fill(0)
      .map((_, i) => (i % 2 === 0 ? 1 : -1));
    expect(isStable(unstable)).toBe(false);
  });

  it('uses only the most recent WINDOW_SIZE samples', () => {
    // History with lots of old noisy samples but recent stable samples
    const noisyOld = Array(100).fill(0).map(() => Math.random() * 10 - 5);
    const stableRecent = Array(STABILITY_WINDOW_SIZE).fill(0);
    const history = [...noisyOld, ...stableRecent];
    expect(isStable(history)).toBe(true);
  });
});

// ─── getStabilityProgress ────────────────────────────────────────────────────

describe('getStabilityProgress', () => {
  it('returns 0 for empty history', () => {
    expect(getStabilityProgress([])).toBe(0);
  });

  it('returns 0 for single sample', () => {
    expect(getStabilityProgress([1])).toBe(0);
  });

  it('returns 100 for a perfectly stable full buffer', () => {
    const stable = Array(STABILITY_WINDOW_SIZE).fill(1.5);
    expect(getStabilityProgress(stable)).toBe(100);
  });

  it('grows as the history buffer fills with stable values', () => {
    const stable = Array(STABILITY_WINDOW_SIZE).fill(0);
    const half = getStabilityProgress(stable.slice(0, STABILITY_WINDOW_SIZE / 2));
    const full = getStabilityProgress(stable);
    expect(full).toBeGreaterThan(half);
  });

  it('returns a lower value for noisy history than stable history', () => {
    const noisy = Array(STABILITY_WINDOW_SIZE).fill(0).map((_, i) => (i % 2 === 0 ? 2 : -2));
    const stable = Array(STABILITY_WINDOW_SIZE).fill(0);
    expect(getStabilityProgress(stable)).toBeGreaterThan(getStabilityProgress(noisy));
  });

  it('returns value in 0-100 range', () => {
    const random = Array(STABILITY_WINDOW_SIZE).fill(0).map(() => Math.random() * 10);
    const result = getStabilityProgress(random);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(100);
  });
});
