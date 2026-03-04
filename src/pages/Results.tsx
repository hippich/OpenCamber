import { useNavigate } from 'react-router-dom';
import { useAlignmentStore } from '../store/alignmentStore';
import { useToast } from '../hooks/useToast';
import { exportAsJSON } from '../utils/storage';
import { calculateCaster } from '../utils/math';
import { DEFAULT_FACTORY_SPEC, WHEEL_LABELS } from '../utils/constants';

function getColorClass(value: number, min: number, max: number): string {
  if (value >= min && value <= max) return 'text-success';
  if (Math.abs(value - min) < 0.5 || Math.abs(value - max) < 0.5) return 'text-warning';
  return 'text-error';
}

export function Results() {
  const navigate = useNavigate();
  const { measurements, casterReadings, resetAll } = useAlignmentStore();
  const { addToast } = useToast();

  const hasSomeMeasurements = Object.values(measurements).some((m) => m !== null);

  if (!hasSomeMeasurements) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="card text-center">
          <p className="text-neutral-700 mb-4">No wheels have been measured yet</p>
          <button onClick={() => navigate('/measure')} className="btn-primary">
            Return to Measurements
          </button>
        </div>
      </div>
    );
  }

  const handleExport = () => {
    const data = {
      timestamp: new Date().toISOString(),
      measurements,
      casterReadings,
    };
    exportAsJSON(data, `alignment_${new Date().toISOString().slice(0, 10)}.json`);
    addToast('✓ Exported as JSON', 'success');
  };

  const handleReset = () => {
    if (window.confirm('Reset all measurements? This cannot be undone.')) {
      resetAll();
      navigate('/');
      addToast('Measurements reset', 'info');
    }
  };

  // Total front toe summary
  const flToe = measurements.FL?.toe ?? null;
  const frToe = measurements.FR?.toe ?? null;
  const totalFrontToe = flToe !== null && frToe !== null ? flToe + frToe : null;

  return (
    <div className="min-h-screen bg-neutral-900 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/measure')} className="text-neutral-400 hover:text-neutral-200">
            ← Measurements
          </button>
          <h1 className="text-2xl font-bold">RESULTS</h1>
          <div className="w-12" />
        </div>

        {/* Front Toe Summary */}
        {(flToe !== null || frToe !== null) && (
          <div className="card space-y-3">
            <h3 className="font-semibold text-neutral-900">Front Toe Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-neutral-500 mb-1">FL Toe</p>
                {flToe !== null ? (
                  <p className={`text-2xl font-mono font-bold ${getColorClass(flToe, DEFAULT_FACTORY_SPEC.toeFront.min, DEFAULT_FACTORY_SPEC.toeFront.max)}`}>
                    {flToe.toFixed(2)}°
                  </p>
                ) : <p className="text-2xl font-mono text-neutral-400">—</p>}
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-1">Total Front</p>
                {totalFrontToe !== null ? (
                  <p className={`text-2xl font-mono font-bold ${getColorClass(totalFrontToe, DEFAULT_FACTORY_SPEC.toeFront.min * 2, DEFAULT_FACTORY_SPEC.toeFront.max * 2)}`}>
                    {totalFrontToe.toFixed(2)}°
                  </p>
                ) : <p className="text-2xl font-mono text-neutral-400">—</p>}
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-1">FR Toe</p>
                {frToe !== null ? (
                  <p className={`text-2xl font-mono font-bold ${getColorClass(frToe, DEFAULT_FACTORY_SPEC.toeFront.min, DEFAULT_FACTORY_SPEC.toeFront.max)}`}>
                    {frToe.toFixed(2)}°
                  </p>
                ) : <p className="text-2xl font-mono text-neutral-400">—</p>}
              </div>
            </div>
          </div>
        )}

        {/* Results Table */}
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-300">
                <th className="text-left py-3 px-4 font-semibold">Wheel</th>
                <th className="text-right py-3 px-4 font-semibold">Camber</th>
                <th className="text-right py-3 px-4 font-semibold">Toe</th>
                <th className="text-right py-3 px-4 font-semibold">Caster</th>
              </tr>
            </thead>
            <tbody>
              {(['FL', 'FR', 'RL', 'RR'] as const).map((wheel) => {
                const measurement = measurements[wheel];

                const camberSpec = wheel.startsWith('F')
                  ? DEFAULT_FACTORY_SPEC.camberFront
                  : DEFAULT_FACTORY_SPEC.camberRear;
                const toeSpec = wheel.startsWith('F')
                  ? DEFAULT_FACTORY_SPEC.toeFront
                  : DEFAULT_FACTORY_SPEC.toeRear;

                const casterReading = wheel === 'FL' || wheel === 'FR'
                  ? casterReadings[wheel]
                  : null;
                const casterValue =
                  casterReading?.left != null && casterReading?.right != null
                    ? calculateCaster(casterReading.left, casterReading.right)
                    : null;

                return (
                  <tr key={wheel} className="border-b border-neutral-200 even:bg-neutral-100">
                    <td className="py-3 px-4 font-semibold">{WHEEL_LABELS[wheel]}</td>
                    <td className={`text-right py-3 px-4 font-mono font-semibold ${
                      measurement ? getColorClass(measurement.camber, camberSpec.min, camberSpec.max) : 'text-neutral-400'
                    }`}>
                      {measurement ? `${measurement.camber.toFixed(2)}°` : '—'}
                    </td>
                    <td className={`text-right py-3 px-4 font-mono font-semibold ${
                      measurement ? getColorClass(measurement.toe, toeSpec.min, toeSpec.max) : 'text-neutral-400'
                    }`}>
                      {measurement ? `${measurement.toe.toFixed(2)}°` : '—'}
                    </td>
                    <td className="text-right py-3 px-4 font-mono font-semibold">
                      {(wheel === 'FL' || wheel === 'FR') ? (
                        casterValue !== null ? (
                          <span className={getColorClass(casterValue, DEFAULT_FACTORY_SPEC.casterFront.min, DEFAULT_FACTORY_SPEC.casterFront.max)}>
                            {casterValue.toFixed(2)}°
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )
                      ) : (
                        <span className="text-neutral-300 text-xs">N/A</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Factory Specs Reference */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-neutral-900">Factory Spec (Generic Reference)</h3>
          <div className="grid grid-cols-3 gap-4 text-xs text-neutral-700">
            <div>
              <p className="font-medium mb-1">Camber</p>
              <p>Front: {DEFAULT_FACTORY_SPEC.camberFront.min}° to {DEFAULT_FACTORY_SPEC.camberFront.max}°</p>
              <p>Rear: {DEFAULT_FACTORY_SPEC.camberRear.min}° to {DEFAULT_FACTORY_SPEC.camberRear.max}°</p>
            </div>
            <div>
              <p className="font-medium mb-1">Toe</p>
              <p>Front: {DEFAULT_FACTORY_SPEC.toeFront.min}° to {DEFAULT_FACTORY_SPEC.toeFront.max}° / wheel</p>
              <p>Rear: {DEFAULT_FACTORY_SPEC.toeRear.min}° to {DEFAULT_FACTORY_SPEC.toeRear.max}°</p>
            </div>
            <div>
              <p className="font-medium mb-1">Caster</p>
              <p>Front: {DEFAULT_FACTORY_SPEC.casterFront.min}° to {DEFAULT_FACTORY_SPEC.casterFront.max}°</p>
            </div>
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            ℹ️ All values are relative to the Rear Left wheel (your zero reference). Compare to your vehicle's specific factory spec for accuracy.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button onClick={handleExport} className="btn-primary">Download JSON</button>
          <button onClick={handleReset} className="btn-secondary">Reset & Start Over</button>
        </div>

      </div>
    </div>
  );
}
