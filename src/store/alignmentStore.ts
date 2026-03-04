import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { AlignmentStore, SensorData, WheelMeasurement, WheelPosition, CasterPosition, MeasurementMode } from '../types';

const initialState = {
  sensorMode: 'INTERNAL' as const,
  sensorConnected: false,
  sensorError: null,
  sensorData: null,
  rlBaseline: null,
  referenceWheel: null as 'RL' | 'RR' | null,
  measurementMode: 'FULL' as MeasurementMode,
  measurements: {
    FL: null,
    FR: null,
    RL: null,
    RR: null,
  },
  casterReadings: {
    FL: null,
    FR: null,
  },
  stabilizationResetCounter: 0,
};

export const useAlignmentStore = create<AlignmentStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setSensorMode: (mode) =>
          set((state) => ({ ...state, sensorMode: mode }), undefined, 'setSensorMode'),

        setSensorConnected: (connected) =>
          set((state) => ({ ...state, sensorConnected: connected }), undefined, 'setSensorConnected'),

        setSensorError: (error) =>
          set((state) => ({ ...state, sensorError: error }), undefined, 'setSensorError'),

        updateSensorData: (data: SensorData) =>
          set((state) => ({ ...state, sensorData: data }), undefined, 'updateSensorData'),

        setRLBaseline: (roll: number, yaw: number) =>
          set(
            (state) => ({
              ...state,
              rlBaseline: { roll, yaw, capturedAt: Date.now() },
            }),
            undefined,
            'setRLBaseline'
          ),

        setRLBaselineRoll: (roll: number) =>
          set(
            (state) => ({
              ...state,
              rlBaseline: {
                roll,
                yaw: state.rlBaseline?.yaw ?? null,
                capturedAt: state.rlBaseline?.capturedAt ?? Date.now(),
              },
            }),
            undefined,
            'setRLBaselineRoll'
          ),

        setRLBaselineYaw: (yaw: number) =>
          set(
            (state) => ({
              ...state,
              rlBaseline: {
                roll: state.rlBaseline?.roll ?? null,
                yaw,
                capturedAt: state.rlBaseline?.capturedAt ?? Date.now(),
              },
            }),
            undefined,
            'setRLBaselineYaw'
          ),

        setMeasurementMode: (mode: MeasurementMode) =>
          set((state) => ({ ...state, measurementMode: mode }), undefined, 'setMeasurementMode'),

        recordMeasurement: (wheel: WheelPosition, measurement: WheelMeasurement) =>
          set(
            (state) => ({
              ...state,
              measurements: {
                ...state.measurements,
                [wheel]: measurement,
              },
            }),
            undefined,
            'recordMeasurement'
          ),

        recordCasterReading: (wheel: 'FL' | 'FR', position: CasterPosition, camber: number) =>
          set(
            (state) => ({
              ...state,
              casterReadings: {
                ...state.casterReadings,
                [wheel]:
                  state.casterReadings[wheel] === null
                    ? { left: position === 'left' ? camber : null, right: position === 'right' ? camber : null }
                    : {
                        ...state.casterReadings[wheel],
                        [position]: camber,
                      },
              },
            }),
            undefined,
            'recordCasterReading'
          ),

        clearMeasurement: (wheel: WheelPosition) =>
          set(
            (state) => ({
              ...state,
              measurements: {
                ...state.measurements,
                [wheel]: null,
              },
            }),
            undefined,
            'clearMeasurement'
          ),

        resetAll: () => set(initialState, undefined, 'resetAll'),

        resetStabilization: () =>
          set(
            (state) => ({ ...state, stabilizationResetCounter: state.stabilizationResetCounter + 1 }),
            undefined,
            'resetStabilization'
          ),

        setReferenceWheel: (wheel: 'RL' | 'RR') =>
          set((state) => ({ ...state, referenceWheel: wheel }), undefined, 'setReferenceWheel'),
      }),
      {
        name: 'wheelalign-store',
        partialize: (state) => ({
          rlBaseline: state.rlBaseline,
          referenceWheel: state.referenceWheel,
          measurementMode: state.measurementMode,
          measurements: state.measurements,
          casterReadings: state.casterReadings,
        }),
      }
    ),
    { trace: true }
  )
);
