import { useNavigate } from 'react-router-dom';

export function Home() {
  const navigate = useNavigate();

  return (
    <div className="h-dvh overflow-hidden bg-neutral-900 flex items-center justify-center px-4">
      <div className="bg-neutral-50 text-neutral-900 rounded-lg shadow-lg p-4 max-w-md w-full text-center space-y-3">
        {/* Logo/Title */}
        <div>
          <h1 className="text-4xl font-bold mb-2">OpenCamber</h1>
          <p className="text-neutral-600">Wheel Alignment in Your Browser</p>
        </div>

        {/* Description */}
        <div className="space-y-4 text-left">
          <p className="text-neutral-700">Measure camber, toe, and caster angles using your smartphone's sensors (or a Bluetooth-connected device in the future).</p>

          <ul className="space-y-3 text-sm text-neutral-600">
            <li className="flex items-start gap-3">
              <span className="text-success font-bold mt-0.5">✓</span>
              <span>No expensive equipment needed</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-success font-bold mt-0.5">✓</span>
              <span>Works with phone sensors (or external modules in the future, maybe)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-success font-bold mt-0.5">✓</span>
              <span>All data stored locally, no cloud required</span>
            </li>
          </ul>
        </div>

        {/* Main CTA */}
        <button
          onClick={() => navigate('/setup')}
          className="btn-primary w-full text-lg py-4 font-semibold"
        >
          Start Alignment
        </button>

        {/* Footnote */}
        <div className="text-xs text-neutral-500 pt-2 border-t border-neutral-300">
          ⓘ Requires flat, level ground and properly inflated tires
        </div>
      </div>
    </div>
  );
}
