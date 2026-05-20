import { useEffect, useRef, useCallback } from 'react';
import { useAlignmentStore } from '../store/alignmentStore';
import { lowPassFilter, circularLowPassFilter, isStable, getStabilityProgress } from '../utils/filters';
import { SENSOR_INTERVAL_MS } from '../utils/constants';

interface FilteredAngles {
  pitch: number;
  roll: number;
  yaw: number;
  camber: number;
  gravityX: number;
  gravityY: number;
  gravityZ: number;
}

let globalPermissionGranted = false;
const CAMBER_FILTER_ALPHA = 0.08;
const CAMBER_MOVING_AVERAGE_WINDOW = 12;

/**
 * Hook to access phone's built-in accelerometer/gyroscope via DeviceOrientation API
 * Applies low-pass filter and stability detection
 * On iOS 13+, requires calling requestIOSPermission() from a user gesture first
 */
export function useInternalSensor(): { requestIOSPermission: () => Promise<boolean>; isIOSDevice: boolean } {
  const { setSensorConnected, setSensorError, updateSensorData, stabilizationResetCounter } = useAlignmentStore();

  const filteredAngles = useRef<FilteredAngles>({
    pitch: 0,
    roll: 0,
    yaw: 0,
    camber: 0,
    gravityX: 0,
    gravityY: 0,
    gravityZ: 0,
  });
  const angleHistory = useRef<number[]>([]);
  const camberSmoothingHistory = useRef<number[]>([]);
  const isActiveRef = useRef(true);
  const listenerAttachedRef = useRef(false);
  const hasFirstReadingRef = useRef(false);
  const freshSampleRef = useRef(false);

  // Detect iOS 13+ which requires requestPermission()
  // Check in a safe way to avoid ReferenceError on non-mobile/non-supporting browsers
  const isIOSDevice = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window && typeof (window as any).DeviceOrientationEvent?.requestPermission === 'function';

  // Event handler: only updates filtered angles at full sensor rate.
  // History accumulation and store updates are handled by the fixed-rate ticker
  // below, so stability progress fills even when the device is perfectly still.
  const handleDeviceOrientation = useCallback((event: DeviceOrientationEvent) => {
      if (!isActiveRef.current) return;
      if (!globalPermissionGranted) return;

      const rawPitch = event.gamma ?? 0;
      const rawRoll = (event.beta ?? 90) - 90;
      
      let rawYaw = event.alpha ?? 0;
      
      // webkitCompassHeading is clockwise, W3C alpha is counter-clockwise.
      if (isIOSDevice && (event as any).webkitCompassHeading !== undefined) {
          rawYaw = 360 - (event as any).webkitCompassHeading;
      }

      const gy = filteredAngles.current.gravityY;
      const gz = filteredAngles.current.gravityZ;
      const isHorizontal = Math.abs(rawRoll + 90) <= 30 && Math.abs(rawPitch) <= 30;
      const isVertical = Math.abs(gy) >= 7.0 && Math.abs(gz) <= 3.0;
      const inValidPose = isHorizontal || isVertical;

      if (!inValidPose) {
        filteredAngles.current = {
          ...filteredAngles.current,
          pitch: rawPitch,
          roll: rawRoll,
          yaw: rawYaw,
        };
        angleHistory.current = [];
      } else {
        filteredAngles.current = {
          ...filteredAngles.current,
          pitch: lowPassFilter(rawPitch, filteredAngles.current.pitch),
          roll: lowPassFilter(rawRoll, filteredAngles.current.roll),
          yaw: circularLowPassFilter(rawYaw, filteredAngles.current.yaw),
        };
      }
      hasFirstReadingRef.current = true;
      freshSampleRef.current = true;  // signal ticker that a valid sample arrived
  }, []);

  // Motion handler: compute edge-mounted camber from gravity vector.
  // Phone mounting for camber: edge against wheel, charging port down,
  // screen toward rear of car. In this pose, camber is represented by
  // gravity projection in phone X/Y plane (rotation around phone Z).
  const handleDeviceMotion = useCallback((event: DeviceMotionEvent) => {
    if (!isActiveRef.current) return;
    if (!globalPermissionGranted) return;

    const accel = event.accelerationIncludingGravity;
    if (!accel) return;

    const gx = accel.x ?? filteredAngles.current.gravityX;
    const gy = accel.y ?? filteredAngles.current.gravityY;
    const gz = accel.z ?? filteredAngles.current.gravityZ;

    const rawCamber = (Math.atan2(gx, gy) * 180) / Math.PI;

    const currentPitch = filteredAngles.current.pitch;
    const currentRoll = filteredAngles.current.roll;
    const isHorizontal = Math.abs(currentRoll + 90) <= 30 && Math.abs(currentPitch) <= 30;
    const isVertical = Math.abs(gy) >= 7.0 && Math.abs(gz) <= 3.0;
    const inValidPose = isHorizontal || isVertical;

    if (!inValidPose) {
      filteredAngles.current = {
        ...filteredAngles.current,
        camber: rawCamber,
        gravityX: gx,
        gravityY: gy,
        gravityZ: gz,
      };
      camberSmoothingHistory.current = [];
      angleHistory.current = [];
    } else {
      const lowPassedCamber =
        (1 - CAMBER_FILTER_ALPHA) * filteredAngles.current.camber + CAMBER_FILTER_ALPHA * rawCamber;

      camberSmoothingHistory.current.push(lowPassedCamber);
      if (camberSmoothingHistory.current.length > CAMBER_MOVING_AVERAGE_WINDOW) {
        camberSmoothingHistory.current.shift();
      }

      const movingAverageCamber =
        camberSmoothingHistory.current.reduce((sum, value) => sum + value, 0) /
        camberSmoothingHistory.current.length;

      filteredAngles.current = {
        ...filteredAngles.current,
        camber: movingAverageCamber,
        gravityX: lowPassFilter(gx, filteredAngles.current.gravityX),
        gravityY: lowPassFilter(gy, filteredAngles.current.gravityY),
        gravityZ: lowPassFilter(gz, filteredAngles.current.gravityZ),
      };
    }

    hasFirstReadingRef.current = true;
    freshSampleRef.current = true;
  }, []);

  // Fixed-rate ticker: fills history and drives store updates at 20 Hz.
  // Runs independently of sensor events, so a still phone still accumulates
  // stable samples and the stabilization bar fills naturally.
  useEffect(() => {
    const ticker = setInterval(() => {
      if (!isActiveRef.current || !hasFirstReadingRef.current) return;

      // Only accumulate history when a fresh valid sample arrived since last tick.
      // This prevents stale values from filling the buffer during bad orientation
      // (which would cause false-stable readings and slow recovery).
      if (!freshSampleRef.current) return;
      freshSampleRef.current = false;

      const { pitch, roll, yaw, camber, gravityX, gravityY, gravityZ } = filteredAngles.current;

      // Posture-aware stabilization source:
      // - Horizontal phone (toe capture): use roll (flatness) to avoid noisy camber projection
      // - Vertical phone (camber/caster): use gravity-derived camber
      const isHorizontalPose = Math.abs(roll + 90) <= 2 && Math.abs(pitch) <= 2;
      const stabilitySample = isHorizontalPose ? roll : camber;

      angleHistory.current.push(stabilitySample);
      if (angleHistory.current.length > 100) angleHistory.current.shift();

      const stable = isStable(angleHistory.current);
      const stabilityProgress = stable ? 100 : getStabilityProgress(angleHistory.current);

      updateSensorData({
        pitch: parseFloat(pitch.toFixed(2)),
        roll: parseFloat(roll.toFixed(2)),
        yaw: parseFloat(yaw.toFixed(2)),
        camber: parseFloat(camber.toFixed(2)),
        gravityX: parseFloat(gravityX.toFixed(3)),
        gravityY: parseFloat(gravityY.toFixed(3)),
        gravityZ: parseFloat(gravityZ.toFixed(3)),
        timestamp: Date.now(),
        isStable: stable,
        stabilityProgress,
      });
    }, SENSOR_INTERVAL_MS);

    return () => clearInterval(ticker);
  }, [updateSensorData]);

  const attachListener = useCallback(() => {
    if (!listenerAttachedRef.current && globalPermissionGranted) {
      window.addEventListener('deviceorientation', handleDeviceOrientation);
      window.addEventListener('devicemotion', handleDeviceMotion);
      listenerAttachedRef.current = true;
      setSensorConnected(true);
      setSensorError(null);
    }
  }, [handleDeviceOrientation, handleDeviceMotion, setSensorConnected, setSensorError]);

  const requestIOSPermission = useCallback(async (): Promise<boolean> => {
    if (!isIOSDevice) {
      // Non-iOS: attach immediately
      globalPermissionGranted = true;
      attachListener();
      return true;
    }

    try {
      const permission = await (window as any).DeviceOrientationEvent?.requestPermission?.();
      if (permission === 'granted') {
        globalPermissionGranted = true;
        attachListener();
        setSensorError(null);
        return true;
      } else {
        setSensorError('Permission denied for device orientation');
        return false;
      }
    } catch (error) {
      setSensorError(`Failed to request permission: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }, [isIOSDevice, attachListener, setSensorError]);

  useEffect(() => {
    isActiveRef.current = true;

    // For non-iOS devices, auto-grant permission and attach listener
    if (!isIOSDevice) {
      globalPermissionGranted = true;
      
      if (!listenerAttachedRef.current) {
        window.addEventListener('deviceorientation', handleDeviceOrientation);
        window.addEventListener('devicemotion', handleDeviceMotion);
        listenerAttachedRef.current = true;
        setSensorConnected(true);
        setSensorError(null);
      }
    }

    return () => {
      isActiveRef.current = false;
      if (listenerAttachedRef.current) {
        window.removeEventListener('deviceorientation', handleDeviceOrientation);
        window.removeEventListener('devicemotion', handleDeviceMotion);
        listenerAttachedRef.current = false;
        setSensorConnected(false);
        hasFirstReadingRef.current = false;
      }
    };
  }, [isIOSDevice, handleDeviceOrientation, handleDeviceMotion, setSensorConnected, setSensorError]);

  // Reset angle history when instructed by store signal
  useEffect(() => {
    angleHistory.current = [];
    camberSmoothingHistory.current = [];
  }, [stabilizationResetCounter]);

  return { requestIOSPermission, isIOSDevice };
}
