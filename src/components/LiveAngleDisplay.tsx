
interface LiveAngleDisplayProps {
  pitch: number;
  roll: number;
  yaw: number;
  isStable: boolean;
  stabilityProgress: number;
  showLabel?: string;
}

export function LiveAngleDisplay({
  pitch,
  roll,
  yaw,
  isStable,
  stabilityProgress,
  showLabel = 'Pitch',
}: LiveAngleDisplayProps) {
  const displayValue =
    showLabel.includes('Camber') || showLabel.includes('Caster') ? roll
    : showLabel.includes('Toe') ? yaw
    : pitch;

  const stabilityColor = isStable ? 'text-success' : 'text-warning';
  const barColor = isStable ? 'bg-success' : stabilityProgress > 60 ? 'bg-yellow-400' : 'bg-blue-400';

  return (
    <div className={`w-full px-4 py-3 rounded-lg ${isStable ? 'bg-neutral-700' : 'bg-neutral-800'}`}>
      <div className="flex items-center gap-3">

        {/* Label + primary value */}
        <div className="flex-1 min-w-0">
          <p className="text-neutral-400 text-xs font-medium leading-none mb-1 truncate">{showLabel}</p>
          <div className={`text-3xl font-bold font-mono leading-none ${isStable ? 'text-success' : 'text-neutral-100'}`}>
            {displayValue.toFixed(1)}°
          </div>
        </div>

        {/* Raw values */}
        <div className="text-right text-xs text-neutral-500 space-y-0.5 shrink-0">
          <div>R {roll.toFixed(1)}°</div>
          <div>Y {yaw.toFixed(1)}°</div>
        </div>

        {/* Stability column */}
        <div className="shrink-0 w-16 text-right">
          <span className={`text-xs font-semibold ${stabilityColor}`}>
            {isStable ? 'READY' : `${stabilityProgress}%`}
          </span>
          <div className="w-full bg-neutral-600 rounded-full h-1.5 mt-1.5 overflow-hidden">
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${barColor}`}
              style={{ width: `${stabilityProgress}%` }}
            />
          </div>
        </div>

      </div>
    </div>
  );
}
