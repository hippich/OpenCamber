/**
 * Core type definitions for the Wheel Alignment application
 */

export interface SensorData {
  pitch: number;
  roll: number;
  yaw: number;
  quaternions?: [number, number, number, number]; // [x, y, z, w]
  timestamp: number;
  isStable: boolean;
  stabilityProgress: number; // 0-100: how close to stabilized
}

export interface RLBaseline {
  roll: number | null;  // camber baseline – captured when RL is measured with phone VERTICAL
  yaw: number | null;   // toe baseline   – captured when RL is measured with phone HORIZONTAL
  capturedAt: number;
}

export interface WheelMeasurement {
  camber: number;
  toe: number;
  caster?: number;
}

export type WheelPosition = 'FL' | 'FR' | 'RL' | 'RR';
export type SensorMode = 'INTERNAL' | 'EXTERNAL_BLE' | 'EXTERNAL_USB';
/** 'left' = steering turned left ~20°, 'right' = steering turned right ~20° */
export type CasterPosition = 'left' | 'right';
export type MeasurementMode = 'FULL' | 'FRONT_TOE';

export interface Measurements {
  FL: WheelMeasurement | null;
  FR: WheelMeasurement | null;
  RL: WheelMeasurement | null;
  RR: WheelMeasurement | null;
}

export interface CasterReadings {
  FL: { left: number | null; right: number | null } | null;
  FR: { left: number | null; right: number | null } | null;
}

export interface AlignmentStore {
  // Configuration
  sensorMode: SensorMode;
  sensorConnected: boolean;
  sensorError: string | null;
  measurementMode: MeasurementMode;

  // Live data
  sensorData: SensorData | null;

  // Rear baseline (set on first rear-wheel measurement, becomes zero reference for all wheels)
  rlBaseline: RLBaseline | null;
  // Which rear wheel was measured first and acts as the reference (RL or RR)
  referenceWheel: 'RL' | 'RR' | null;

  // Measurements
  measurements: Measurements;
  casterReadings: CasterReadings;

  // Stabilization control
  stabilizationResetCounter: number;

  // Actions
  setSensorMode: (mode: SensorMode) => void;
  setSensorConnected: (connected: boolean) => void;
  setSensorError: (error: string | null) => void;
  updateSensorData: (data: SensorData) => void;
  /** Set camber baseline (captured when RL is measured in VERTICAL/portrait position) */
  setRLBaselineRoll: (roll: number) => void;
  /** Set toe baseline (captured when RL is measured in HORIZONTAL/flat position) */
  setRLBaselineYaw: (yaw: number) => void;
  setRLBaseline: (roll: number, yaw: number) => void;
  setMeasurementMode: (mode: MeasurementMode) => void;
  recordMeasurement: (wheel: WheelPosition, measurement: WheelMeasurement) => void;
  recordCasterReading: (wheel: 'FL' | 'FR', position: CasterPosition, camber: number) => void;
  resetAll: () => void;
  clearMeasurement: (wheel: WheelPosition) => void;
  resetStabilization: () => void;
  /** Set which rear wheel is the reference (whichever was measured first) */
  setReferenceWheel: (wheel: 'RL' | 'RR') => void;
}

export interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
  duration?: number;
}

export interface FactorySpec {
  camberFront: { min: number; max: number };
  camberRear: { min: number; max: number };
  toeFront: { min: number; max: number };
  toeRear: { min: number; max: number };
  casterFront?: { min: number; max: number };
}
