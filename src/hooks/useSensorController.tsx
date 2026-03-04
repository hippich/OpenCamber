import { createContext, useContext } from 'react';
import { useInternalSensor } from './useInternalSensor';

interface SensorControllerContextType {
  requestIOSPermission: () => Promise<boolean>;
  isIOSDevice: boolean;
}

const SensorControllerContext = createContext<SensorControllerContextType | undefined>(undefined);

export function SensorControllerProvider({ children }: { children: React.ReactNode }) {
  const sensorController = useInternalSensor();

  return <SensorControllerContext.Provider value={sensorController}>{children}</SensorControllerContext.Provider>;
}

export function useSensorController() {
  const context = useContext(SensorControllerContext);
  if (!context) {
    throw new Error('useSensorController must be used within SensorControllerProvider');
  }
  return context;
}