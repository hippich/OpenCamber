import { describe, it, expect } from 'vitest';
import {
  calculateCamber,
  calculateToe,
  calculateCaster,
  normalizeAngle360,
  normalizeAngle180,
  degreesToRadians,
  radiansToDegrees,
} from '../utils/math';

// ─── calculateCamber ────────────────────────────────────────────────────────

describe('calculateCamber', () => {
  it('returns 0 when current roll equals baseline', () => {
    expect(calculateCamber(3.2, 3.2)).toBe(0);
  });

  it('positive value when wheel tilts outward', () => {
    expect(calculateCamber(2.5, 0)).toBe(2.5);
  });

  it('negative value when wheel tilts inward', () => {
    expect(calculateCamber(-1.5, 0)).toBe(-1.5);
  });

  it('subtracts non-zero baseline correctly', () => {
    expect(calculateCamber(1.0, 1.5)).toBe(-0.5);
  });

  it('handles negative baseline', () => {
    expect(calculateCamber(-0.5, -2.0)).toBe(1.5);
  });

  it('rounds to 2 decimal places', () => {
    // 1.005 - 0 = 1.005 → toFixed(2) rounding
    expect(calculateCamber(1.556, 0)).toBe(1.56);
  });
});

// Right-side wheel camber sign inversion (done in Measure.tsx via camberSign)
describe('calculateCamber – right-side sign convention', () => {
  it('right-wheel camber negated: same roll reads opposite sign', () => {
    const raw = calculateCamber(-2.0, 0); // raw sensor: -2.0
    expect(raw * -1).toBe(2.0);           // FR/RR: negate to get +2.0° (same physical camber)
  });

  it('left-wheel camber unchanged: positive raw stays positive', () => {
    const raw = calculateCamber(2.0, 0);
    expect(raw * 1).toBe(2.0);
  });
});

// Right-side wheel toe normalization (done in Measure.tsx)
// Physics: left-side wheel faces west (~270°), right-side faces east (~90°) — ~180° apart.
// Fix: normalizedYaw = (rawYaw + 180) % 360 for right wheels, then toe *= -1.
describe('calculateToe – right-side normalization convention', () => {
  // Simulates FULL mode: RL is reference (270°), RR is parallel but faces east (90°)
  it('parallel left and right wheels should both read zero toe', () => {
    const toeRef = 270; // RL yaw stored as reference
    // Right-side: normalize by +180
    const rrNormalized = (90 + 180) % 360; // = 270
    const rrToe = calculateToe(rrNormalized, toeRef) * -1; // right-side sign flip
    expect(rrToe).toBe(-0); // 0 or -0, both mean zero
  });

  it('symmetric toe-in: both sides should report same negative value', () => {
    const toeRef = 270; // RL_yaw reference
    // FL toe-in: CW from above → alpha decreases
    const flToe = calculateToe(269.5, toeRef) * 1; // left, no flip
    // FR toe-in: CCW from above → alpha increases; FR_raw = 90.5
    const frNormalized = (90.5 + 180) % 360; // = 270.5
    const frToe = calculateToe(frNormalized, toeRef) * -1; // right, flip
    expect(flToe).toBe(-0.5);
    expect(frToe).toBe(-0.5);
    expect(flToe).toBe(frToe); // symmetric alignment
  });

  it('toe-out on right side gives positive value', () => {
    const toeRef = 270;
    // FR toe-out: CW from above (front away from center) → alpha decreases; FR_raw = 89.5
    const frNormalized = (89.5 + 180) % 360; // = 269.5
    const frToe = calculateToe(frNormalized, toeRef) * -1;
    expect(frToe).toBe(0.5);
  });
});

// ─── calculateToe ────────────────────────────────────────────────────────────

describe('calculateToe', () => {
  it('returns 0 when same yaw', () => {
    expect(calculateToe(180, 180)).toBe(0);
  });

  it('small positive toe', () => {
    expect(calculateToe(1.5, 0)).toBe(1.5);
  });

  it('small negative toe', () => {
    expect(calculateToe(-0.5, 0)).toBe(-0.5);
  });

  it('normalises 359→1 wraparound: result is +2 not -358', () => {
    // front=1°, rear=359° → wheel turned slightly toe-in = +2°
    expect(calculateToe(1, 359)).toBe(2);
  });

  it('normalises 1→359 wraparound: result is -2 not +358', () => {
    expect(calculateToe(359, 1)).toBe(-2);
  });

  it('normalises large positive diff (350→0): result is -10', () => {
    // front=0, rear=350 → diff = -350 → +360 = +10... rear is 350, front is 0
    // wheel turned -350 → normalize → +10
    expect(calculateToe(0, 350)).toBe(10);
  });

  it('normalises large negative diff (0→350): result is +10... wait, front=350 rear=0', () => {
    // front=350, rear=0 → diff=350 → 350-360=-10
    expect(calculateToe(350, 0)).toBe(-10);
  });

  it('handles diff exactly at +180 boundary', () => {
    expect(calculateToe(270, 90)).toBe(180);
  });

  it('handles diff exactly at -180 boundary', () => {
    expect(calculateToe(90, 270)).toBe(-180);
  });

  it('rounds to 2 decimal places', () => {
    expect(calculateToe(1.556, 0)).toBe(1.56);
  });
});

// ─── calculateCaster ─────────────────────────────────────────────────────────

describe('calculateCaster', () => {
  it('positive caster when camber_out > camber_in', () => {
    // out=2°, in=-2° → (2 - (-2)) * 1.5 = 6°
    expect(calculateCaster(2, -2)).toBe(6);
  });

  it('negative caster when camber_out < camber_in', () => {
    expect(calculateCaster(-2, 2)).toBe(-6);
  });

  it('zero caster when out equals in', () => {
    expect(calculateCaster(0, 0)).toBe(0);
  });

  it('uses 1.5x multiplier as per spec', () => {
    expect(calculateCaster(2, 0)).toBe(3);
    expect(calculateCaster(0, 2)).toBe(-3);
  });

  it('typical real-world values: 5° caster', () => {
    // If caster = 5°, then camber_out - camber_in = 5/1.5 ≈ 3.33°
    // camber_out ≈ 1.67°, camber_in ≈ -1.67°
    expect(calculateCaster(1.67, -1.67)).toBeCloseTo(5.0, 1);
  });

  it('rounds to 2 decimal places', () => {
    expect(calculateCaster(1.5, 0.5)).toBe(1.5);
  });
});

// ─── normalizeAngle360 ────────────────────────────────────────────────────────

describe('normalizeAngle360', () => {
  it('passes through values in 0-360', () => {
    expect(normalizeAngle360(0)).toBe(0);
    expect(normalizeAngle360(180)).toBe(180);
    expect(normalizeAngle360(359)).toBe(359);
  });

  it('wraps values above 360', () => {
    expect(normalizeAngle360(360)).toBe(0);
    expect(normalizeAngle360(370)).toBe(10);
    expect(normalizeAngle360(720)).toBe(0);
  });

  it('wraps negative values to positive', () => {
    expect(normalizeAngle360(-10)).toBe(350);
    expect(normalizeAngle360(-180)).toBe(180);
    expect(normalizeAngle360(-360)).toBe(0);  // must not return -0
    expect(Object.is(normalizeAngle360(-360), -0)).toBe(false);
  });
});

// ─── normalizeAngle180 ────────────────────────────────────────────────────────

describe('normalizeAngle180', () => {
  it('passes through values in -180..180', () => {
    expect(normalizeAngle180(0)).toBe(0);
    expect(normalizeAngle180(90)).toBe(90);
    expect(normalizeAngle180(-90)).toBe(-90);
  });

  it('wraps 270 to -90', () => {
    expect(normalizeAngle180(270)).toBe(-90);
  });

  it('wraps -270 to 90', () => {
    expect(normalizeAngle180(-270)).toBe(90);
  });

  it('wraps 540 to 180', () => {
    expect(normalizeAngle180(540)).toBe(180);
  });
});

// ─── degreesToRadians / radiansToDegrees ─────────────────────────────────────

describe('degreesToRadians', () => {
  it('0° = 0 rad', () => expect(degreesToRadians(0)).toBe(0));
  it('180° = π rad', () => expect(degreesToRadians(180)).toBeCloseTo(Math.PI, 10));
  it('360° = 2π rad', () => expect(degreesToRadians(360)).toBeCloseTo(2 * Math.PI, 10));
  it('-90° = -π/2 rad', () => expect(degreesToRadians(-90)).toBeCloseTo(-Math.PI / 2, 10));
});

describe('radiansToDegrees', () => {
  it('0 rad = 0°', () => expect(radiansToDegrees(0)).toBe(0));
  it('π rad = 180°', () => expect(radiansToDegrees(Math.PI)).toBeCloseTo(180, 10));
  it('2π rad = 360°', () => expect(radiansToDegrees(2 * Math.PI)).toBeCloseTo(360, 10));
  it('round-trip identity', () => {
    const angle = 37.5;
    expect(radiansToDegrees(degreesToRadians(angle))).toBeCloseTo(angle, 10);
  });
});
