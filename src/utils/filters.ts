/**
 * Sensor filtering and stability detection utilities
 */

const FILTER_ALPHA = 0.2; // Low-pass filter coefficient
const STABILITY_WINDOW_SIZE = 40; // 2 seconds at 20 Hz
const STABILITY_VARIANCE_THRESHOLD = 0.25; // degrees squared

/**
 * Apply first-order low-pass filter to a single angle value
 */
export function lowPassFilter(rawValue: number, previousFiltered: number): number {
  return (1 - FILTER_ALPHA) * previousFiltered + FILTER_ALPHA * rawValue;
}

/**
 * Apply low-pass filter to a circular angle (0-360 degrees)
 * Prevents artificial jumps when crossing the 0/360 boundary.
 */
export function circularLowPassFilter(rawValue: number, previousFiltered: number): number {
  let diff = rawValue - previousFiltered;
  
  // Normalize difference to be within -180 and 180
  diff = ((diff + 180) % 360) - 180;
  if (diff < -180) {
    diff += 360;
  }
  
  let filtered = previousFiltered + FILTER_ALPHA * diff;
  
  // Normalize result to be within 0 and 360
  filtered = filtered % 360;
  if (filtered < 0) {
    filtered += 360;
  }
  
  return filtered;
}

/**
 * Calculate variance of angles in a rolling window
 */
export function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;

  return variance;
}

/**
 * Check if angle values are stable (low variance for consecutive samples)
 */
export function isStable(history: number[]): boolean {
  if (history.length < STABILITY_WINDOW_SIZE) {
    return false;
  }

  // Get last STABILITY_WINDOW_SIZE samples
  const recentSamples = history.slice(-STABILITY_WINDOW_SIZE);

  // Calculate variance
  const variance = calculateVariance(recentSamples);

  // Check if variance is below threshold
  return variance < STABILITY_VARIANCE_THRESHOLD;
}

/**
 * Calculate stability progress (0-100) for UI feedback.
 * Combines buffer fill progress with variance reduction progress.
 */
export function getStabilityProgress(history: number[]): number {
  const bufferFill = Math.min(history.length, STABILITY_WINDOW_SIZE) / STABILITY_WINDOW_SIZE;

  if (history.length < 2) return 0;

  const variance = calculateVariance(history.slice(-STABILITY_WINDOW_SIZE));
  // variance at threshold = 0 progress, variance at 0 = 100% progress
  const varianceProgress = Math.max(0, 1 - variance / STABILITY_VARIANCE_THRESHOLD);

  // Both conditions must be met: enough samples AND low variance
  return Math.round(bufferFill * varianceProgress * 100);
}
