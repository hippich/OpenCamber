/**
 * Mathematical calculations for wheel alignment
 */

/**
 * Calculate camber angle: difference between current roll and baseline
 */
export function calculateCamber(currentRoll: number, baselineRoll: number): number {
  return parseFloat((currentRoll - baselineRoll).toFixed(2));
}

/**
 * Calculate toe angle: difference between front yaw and rear yaw baseline
 */
export function calculateToe(frontYaw: number, rearYaw: number): number {
  let diff = frontYaw - rearYaw;

  // Normalize yaw difference to -180 to 180
  while (diff > 180) {
    diff -= 360;
  }
  while (diff < -180) {
    diff += 360;
  }

  return parseFloat(diff.toFixed(2));
}

/**
 * Calculate caster angle: (camber_out - camber_in) * 1.5
 */
export function calculateCaster(camberOut: number, camberIn: number): number {
  return parseFloat(((camberOut - camberIn) * 1.5).toFixed(2));
}

/**
 * Normalize angle to 0-360 range
 */
export function normalizeAngle360(angle: number): number {
  // Double-modulo avoids -0 for multiples of 360
  return ((angle % 360) + 360) % 360;
}

/**
 * Normalize angle to -180 to 180 range
 */
export function normalizeAngle180(angle: number): number {
  let normalized = angle % 360;
  if (normalized > 180) {
    normalized -= 360;
  } else if (normalized < -180) {
    normalized += 360;
  }
  return normalized;
}

/**
 * Convert degrees to radians
 */
export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 */
export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}
