/**
 * Application constants
 */

// Sensor sampling frequency (Hz)
export const SENSOR_FREQUENCY_HZ = 20;
export const SENSOR_INTERVAL_MS = 1000 / SENSOR_FREQUENCY_HZ; // 50ms

// Filter constants
export const FILTER_ALPHA = 0.2;
export const STABILITY_WINDOW_SIZE = 40; // 2 seconds at 20 Hz
export const STABILITY_VARIANCE_THRESHOLD = 0.25;
export const STABILITY_DURATION_MS = 2000;

// Caster sweep angle
export const CASTER_SWEEP_ANGLE = 20; // degrees

// Device orientation event availability check
export const DEVICE_ORIENTATION_AVAILABLE = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
export const DEVICE_MOTION_AVAILABLE = typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
export const WEB_BLUETOOTH_AVAILABLE = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
export const WEB_SERIAL_AVAILABLE = typeof navigator !== 'undefined' && 'serial' in navigator;

// Factory spec defaults (example for generic car)
export const DEFAULT_FACTORY_SPEC = {
  camberFront: { min: -2.5, max: -1.5 },
  camberRear: { min: -1.8, max: -0.8 },
  toeFront: { min: 0.0, max: 0.5 },
  toeRear: { min: -0.2, max: 0.2 },
  casterFront: { min: 3.0, max: 6.0 },
};

// Toast notification duration
export const TOAST_DURATION_MS = 3000;

// Wheel positions
export const WHEEL_POSITIONS = ['FL', 'FR', 'RL', 'RR'] as const;
export const WHEEL_LABELS: Record<string, string> = {
  FL: 'Front Left',
  FR: 'Front Right',
  RL: 'Rear Left',
  RR: 'Rear Right',
};
