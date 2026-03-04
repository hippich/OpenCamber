import { useEffect, useRef, useCallback } from 'react';
import { useAlignmentStore } from '../store/alignmentStore';
import { lowPassFilter, isStable, getStabilityProgress } from '../utils/filters';
import { SENSOR_INTERVAL_MS } from '../utils/constants';

interface FilteredAngles {
  pitch: number;
  roll: number;
  yaw: number;
}

function normalizeAngle360(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

function normalizeAngle180(angle: number): number {
  let normalized = angle % 360;
  if (normalized > 180) normalized -= 360;
  if (normalized < -180) normalized += 360;
  return normalized;
}

function lowPassCircular(rawYaw: number, previousYaw: number, alpha = 0.2): number {
  const delta = normalizeAngle180(rawYaw - previousYaw);
  return normalizeAngle360(previousYaw + alpha * delta);
}

let globalPermissionGranted = false;

/**
 * Hook to access phone's built-in accelerometer/gyroscope via DeviceOrientation API
 * Applies low-pass filter and stability detection
 * On iOS 13+, requires calling requestIOSPermission() from a user gesture first
 */
export function useInternalSensor(): { requestIOSPermission: () => Promise<boolean>; isIOSDevice: boolean } {
  const { setSensorConnected, setSensorError, updateSensorData, stabilizationResetCounter } = useAlignmentStore();

  const filteredAngles = useRef<FilteredAngles>({ pitch: 0, roll: 0, yaw: 0 });
  const angleHistory = useRef<number[]>([]);
  const isActiveRef = useRef(true);
  const listenerAttachedRef = useRef(false);
  const hasFirstReadingRef = useRef(false);
  const freshSampleRef = useRef(false);

  // Detect iOS 13+ which requires requestPermission()
  // Check user agent first (more reliable), then verify requestPermission exists
  const isIOSDevice = (() => {
    if (typeof window === 'undefined') return false;
    
    // Check user agent for iOS indicators
    const ua = navigator.userAgent.toLowerCase();
    const isIOSUA = /iphone|ipad|ipod/.test(ua);
    
    // Only trust requestPermission if user agent indicates iOS
    // This prevents false positives on desktop browsers
    return isIOSUA && 'DeviceOrientationEvent' in window && typeof (window as any).DeviceOrientationEvent?.requestPermission === 'function';
  })();

  // Event handler: only updates filtered angles at full sensor rate.
  // History accumulation and store updates are handled by the fixed-rate ticker
  // below, so stability progress fills even when the device is perfectly still.
  const handleDeviceOrientation = useCallback((event: DeviceOrientationEvent) => {
      if (!isActiveRef.current) return;
      if (!globalPermissionGranted) return;

      const rawPitch = event.gamma ?? 0;
      const rawRoll = (event.beta ?? 90) - 90;
      const anyEvent = event as DeviceOrientationEvent & { webkitCompassHeading?: number };
      const heading =
        typeof anyEvent.webkitCompassHeading === 'number'
          ? anyEvent.webkitCompassHeading
          : event.alpha ?? 0;
      const rawYaw = normalizeAngle360(heading);
      const absolute = event.absolute ?? false;

      console.log('Raw sensor data:', { rawPitch, rawRoll, rawYaw, absolute });

      if (!hasFirstReadingRef.current) {
        filteredAngles.current = {
          pitch: rawPitch,
          roll: rawRoll,
          yaw: rawYaw,
        };
        hasFirstReadingRef.current = true;
        freshSampleRef.current = true;
        return;
      }

      filteredAngles.current = {
        pitch: lowPassFilter(rawPitch, filteredAngles.current.pitch),
        roll: lowPassFilter(rawRoll, filteredAngles.current.roll),
        yaw: lowPassCircular(rawYaw, filteredAngles.current.yaw),
      };
      freshSampleRef.current = true;  // signal ticker that a valid sample arrived
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

      const { pitch, roll, yaw } = filteredAngles.current;

      angleHistory.current.push(roll);
      if (angleHistory.current.length > 100) angleHistory.current.shift();

      const stable = isStable(angleHistory.current);
      const stabilityProgress = stable ? 100 : getStabilityProgress(angleHistory.current);

      updateSensorData({
        pitch: parseFloat(pitch.toFixed(2)),
        roll: parseFloat(roll.toFixed(2)),
        yaw: parseFloat(yaw.toFixed(2)),
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
      listenerAttachedRef.current = true;
      setSensorConnected(true);
      setSensorError(null);
    }
  }, [handleDeviceOrientation, setSensorConnected, setSensorError]);

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
        listenerAttachedRef.current = true;
        setSensorConnected(true);
        setSensorError(null);
      }
    }

    return () => {
      isActiveRef.current = false;
      if (listenerAttachedRef.current) {
        window.removeEventListener('deviceorientation', handleDeviceOrientation);
        listenerAttachedRef.current = false;
        setSensorConnected(false);
        hasFirstReadingRef.current = false;
      }
    };
  }, [isIOSDevice, handleDeviceOrientation, setSensorConnected, setSensorError]);

  // Reset angle history when instructed by store signal
  useEffect(() => {
    angleHistory.current = [];
  }, [stabilizationResetCounter]);

  return { requestIOSPermission, isIOSDevice };
}
