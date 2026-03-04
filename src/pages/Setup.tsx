import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAlignmentStore } from '../store/alignmentStore';
import { useSensorController } from '../hooks/useSensorController';
import { LiveAngleDisplay } from '../components/LiveAngleDisplay';

export function Setup() {
  const navigate = useNavigate();
  const { sensorMode, setSensorMode, sensorConnected, sensorData, sensorError } = useAlignmentStore();
  const { requestIOSPermission, isIOSDevice } = useSensorController();
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [sensorSectionOpen, setSensorSectionOpen] = useState(false);

  const handleRequestPermission = async () => {
    setPermissionLoading(true);
    try {
      await requestIOSPermission();
    } finally {
      setPermissionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/')} className="text-neutral-400 hover:text-neutral-200">
            ← Home
          </button>
          <h1 className="text-2xl font-bold">STEP 1: SENSOR SETUP</h1>
          <div className="w-12" /> {/* Spacer for alignment */}
        </div>

        {/* Sensor Selection */}
        <div className="card">
          {/* Collapsible header */}
          <button
            onClick={() => setSensorSectionOpen((o) => !o)}
            className="w-full flex items-center justify-between text-left gap-3"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h2 className="text-lg font-semibold shrink-0">Choose Sensor Source</h2>
              <span className="text-xs text-neutral-500 font-medium truncate">
                {sensorMode === 'INTERNAL' ? '· Phone sensor' : sensorMode === 'EXTERNAL_BLE' ? '· BLE ESP32' : '· USB ESP32'}
              </span>
            </div>
            <span className={`text-neutral-400 transition-transform duration-200 text-sm shrink-0 ${sensorSectionOpen ? 'rotate-180' : ''}`}>▾</span>
          </button>

          {/* Collapsible body */}
          {sensorSectionOpen && (
            <div className="mt-4 space-y-3">
              {/* Internal Sensor Option */}
              <label className="cursor-pointer">
                <div
                  className={`border-2 rounded-lg p-4 transition ${
                    sensorMode === 'INTERNAL'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-neutral-300 bg-white hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="sensorMode"
                      value="INTERNAL"
                      checked={sensorMode === 'INTERNAL'}
                      onChange={(e) => setSensorMode(e.target.value as any)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-neutral-900">Internal Phone Sensor</p>
                      <p className="text-sm text-neutral-600 mt-1">(Accelerometer + Gyroscope)</p>
                      <ul className="mt-2 space-y-1 text-xs text-neutral-600">
                        <li className="text-success">✓ No pairing required</li>
                        <li className="text-neutral-500">✗ May drift over time</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </label>

              {/* Bluetooth Option */}
              <label className="cursor-pointer opacity-50 pointer-events-none">
                <div className="border-2 border-neutral-300 rounded-lg p-4 bg-neutral-100">
                  <div className="flex items-start gap-3">
                    <input type="radio" name="sensorMode" value="EXTERNAL_BLE" disabled className="mt-1" />
                    <div className="flex-1">
                      <p className="font-semibold text-neutral-600">Bluetooth ESP32</p>
                      <p className="text-sm text-neutral-500 mt-1">(Phase 2 - Coming Soon)</p>
                    </div>
                  </div>
                </div>
              </label>

              {/* USB Option */}
              <label className="cursor-pointer opacity-50 pointer-events-none">
                <div className="border-2 border-neutral-300 rounded-lg p-4 bg-neutral-100">
                  <div className="flex items-start gap-3">
                    <input type="radio" name="sensorMode" value="EXTERNAL_USB" disabled className="mt-1" />
                    <div className="flex-1">
                      <p className="font-semibold text-neutral-600">USB ESP32</p>
                      <p className="text-sm text-neutral-500 mt-1">(Phase 2 - Coming Soon)</p>
                    </div>
                  </div>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Connection Status & Preview */}
        {isIOSDevice && !sensorConnected && (
          <div className="card bg-blue-50 border-blue-200">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-blue-900">
                <span className="text-sm font-semibold">📱 Motion Sensor Permission Required</span>
              </div>
              <p className="text-sm text-blue-800">
                iOS requires explicit permission to access motion sensors. Click the button below to grant this permission.
              </p>
              <button
                onClick={handleRequestPermission}
                disabled={permissionLoading}
                className="w-full btn-primary"
              >
                {permissionLoading ? 'Requesting...' : 'Grant Permission'}
              </button>
            </div>
          </div>
        )}

        {sensorError && (
          <div className="card bg-red-50 border-red-200">
            <p className="text-sm text-red-800">
              <span className="font-semibold">⚠️ Error:</span> {sensorError}
            </p>
          </div>
        )}

        {sensorData && (
          <div className="space-y-4">
            <LiveAngleDisplay
              pitch={sensorData.pitch}
              roll={sensorData.roll}
              yaw={sensorData.yaw}
              isStable={sensorData.isStable}
              stabilityProgress={sensorData.stabilityProgress}
              showLabel="Pitch"
            />

            <div className="text-center">
              <div className={`inline-flex items-center gap-2 ${sensorConnected ? 'text-success' : 'text-warning'}`}>
                <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                <span className="text-sm font-medium">{sensorConnected ? '🟢 Connected' : '🟠 Connecting...'}</span>
              </div>
            </div>
          </div>
        )}

        {!sensorData && !sensorError && !isIOSDevice && (
          <div className="card bg-yellow-50 border-yellow-200">
            <p className="text-sm text-yellow-800">
              <span className="font-semibold">⏳ Initializing sensor...</span> Waiting for motion sensor reading (may take a few seconds)...
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-4">
          <button onClick={() => navigate('/')} className="btn-secondary flex-1">
            Back
          </button>
          <button
            onClick={() => navigate('/measure')}
            disabled={!sensorConnected}
            className="btn-primary flex-1"
          >
            Next: Measurements
          </button>
        </div>
      </div>
    </div>
  );
}
