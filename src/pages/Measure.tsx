import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAlignmentStore } from '../store/alignmentStore';
import { useToast } from '../hooks/useToast';
import { LiveAngleDisplay } from '../components/LiveAngleDisplay';
import { PlacementDiagram } from '../components/PlacementDiagram';
import { calculateCamber, calculateToe, calculateCaster } from '../utils/math';
import { WHEEL_LABELS } from '../utils/constants';

type WheelKey = 'FL' | 'FR' | 'RL' | 'RR';
type PhonePosition = 'VERTICAL' | 'HORIZONTAL';

type RecordedMap = Partial<Record<string, boolean>>;

const WHEELS: WheelKey[] = ['FL', 'FR', 'RL', 'RR'];

/**
 * Returns a warning string if the phone orientation looks wrong for the given
 * measurement position, or null if all guards pass.
 *
 * VERTICAL (camber / caster): phone upright, back against wheel, port down.
 *   - pitch = gamma: phone lateral sway.  Guard: |pitch| > 20
 *   - roll  = beta-90: 0 when upright.    Guard: |roll| > 45 (near horizontal)
 *
 * HORIZONTAL (toe): phone flat, back to ground, screen up.
 *   - roll = beta-90 ≈ -90 when flat.     Deviation from flat = roll+90 = beta.
 *   - pitch = gamma.                       Guard: |pitch| > 20 (front/back tilt)
 */
function guardWarning(
  position: 'VERTICAL' | 'HORIZONTAL' | null,
  pitch: number,
  roll: number,
): string | null {
  if (!position) return null;
  if (position === 'VERTICAL') {
    if (Math.abs(pitch) > 20) return `Phone tilted sideways ${pitch.toFixed(0)}° — straighten it (charging port straight down)`;
    if (Math.abs(roll) > 45) return `Phone nearly horizontal (roll ${roll.toFixed(0)}°) — hold it UPRIGHT against the wheel`;
  } else {
    // HORIZONTAL: deviation from flat = roll + 90 (= beta)
    const flatDeviation = roll + 90;
    if (Math.abs(pitch) > 20) return `Phone tilted sideways ${pitch.toFixed(0)}° — keep it level`;
    if (Math.abs(flatDeviation) > 20) return `Phone not flat (${flatDeviation.toFixed(0)}° off) — lay it flat, back facing ground`;
  }
  return null;
}

export function Measure() {
  const navigate = useNavigate();
  const {
    sensorData,
    rlBaseline,
    referenceWheel,
    setReferenceWheel,
    setRLBaselineRoll,
    setRLBaselineYaw,
    recordMeasurement,
    recordCasterReading,
    casterReadings,
    measurements,
    resetStabilization,
  } = useAlignmentStore();
  const { addToast } = useToast();

  // ── per-wheel camber / toe state ──────────────────────────────────────────
  const [selectedWheel, setSelectedWheel] = useState<WheelKey>('RL');
  const [selectedPosition, setSelectedPosition] = useState<PhonePosition | null>(null);
  const [recorded, setRecorded] = useState<RecordedMap>({});

  // ── caster sweep state (global, not per-wheel) ────────────────────────────
  // Workflow: pick steering side → put phone on FL → record → move to FR → record
  // then switch steering side and repeat.
  const [casterSteering, setCasterSteering] = useState<'left' | 'right' | null>(null);
  const [casterActiveWheel, setCasterActiveWheel] = useState<'FL' | 'FR' | null>(null);
  const [casterRecorded, setCasterRecorded] = useState<RecordedMap>({});

  // ── scroll refs ───────────────────────────────────────────────────────────
  const livePanelRef = useRef<HTMLDivElement>(null);
  const prevPositionRef = useRef<PhonePosition | null>(null);

  // Scroll to live panel when a position is chosen; scroll to top when done
  useEffect(() => {
    if (selectedPosition !== null) {
      // Give React a tick to render the panel before scrolling to it
      setTimeout(() => livePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } else if (prevPositionRef.current !== null) {
      // Both measurements for this wheel are done — return to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    prevPositionRef.current = selectedPosition;
  }, [selectedPosition]);

  const isRightWheel = selectedWheel.endsWith('R');
  const isRearWheel = selectedWheel === 'RL' || selectedWheel === 'RR';
  // hasRearBaseline: true once any rear wheel measurement has been started
  const hasRearBaseline = rlBaseline !== null;
  // Side-sign: 1 if the measured wheel faces the same direction as the reference,
  //           -1 if it faces the opposite direction (roll axis is mirrored).
  const refIsRight = referenceWheel === 'RR';
  const thisIsRight = selectedWheel === 'FR' || selectedWheel === 'RR';
  const sideSign = (thisIsRight === refIsRight) ? 1 : -1;

  // reset stability bar whenever active measurement changes
  useEffect(() => { resetStabilization(); }, [selectedWheel, selectedPosition, resetStabilization]);
  useEffect(() => { resetStabilization(); }, [casterSteering, casterActiveWheel, resetStabilization]);

  // ── guard / record readiness ──────────────────────────────────────────────
  const warning = guardWarning(selectedPosition, sensorData?.pitch ?? 0, sensorData?.roll ?? 0);
  const guardOk = warning === null;
  const canRecord = (sensorData?.isStable ?? false) && guardOk;

  // caster uses VERTICAL guard
  const casterWarning = guardWarning('VERTICAL', sensorData?.pitch ?? 0, sensorData?.roll ?? 0);
  const casterCanRecord = (sensorData?.isStable ?? false) && casterWarning === null;

  if (!sensorData) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <div className="card text-center">
          <p className="text-neutral-700 mb-4">Waiting for sensor data…</p>
          <button onClick={() => navigate('/setup')} className="btn-primary">Return to Setup</button>
        </div>
      </div>
    );
  }

  // ── helpers ───────────────────────────────────────────────────────────────
  const rk = (wheel: WheelKey, pos: string) => `${wheel}_${pos}`;
  const ckr = (wheel: 'FL' | 'FR') =>
    casterRecorded[`${wheel}_left`] && casterRecorded[`${wheel}_right`];
  const isAllDone = () =>
    WHEELS.every((w) => recorded[rk(w, 'VERTICAL')] && recorded[rk(w, 'HORIZONTAL')]) &&
    ckr('FL') && ckr('FR');

  // ── event handlers — camber / toe ─────────────────────────────────────────
  const handleSelectWheel = (w: WheelKey) => {
    setSelectedWheel(w);
    setSelectedPosition(null);
  };

  const handleSelectPosition = (pos: PhonePosition) => setSelectedPosition(pos);

  const handleRecordMeasurement = () => {
    if (!selectedPosition) return;

    if (selectedPosition === 'VERTICAL') {
      // Guard: front wheels require a rear camber baseline first
      if (rlBaseline?.roll == null && !isRearWheel) {
        addToast('Measure a rear wheel VERTICAL first to set camber baseline', 'error');
        return;
      }

      const isFirstRearCamber = rlBaseline?.roll == null;
      const camber = isFirstRearCamber
        ? 0
        : calculateCamber(sensorData.roll, rlBaseline!.roll!) * sideSign;

      if (isFirstRearCamber) {
        setRLBaselineRoll(sensorData.roll);
        if (referenceWheel === null) setReferenceWheel(selectedWheel as 'RL' | 'RR');
      }

      const existingToe = measurements[selectedWheel]?.toe ?? 0;
      recordMeasurement(selectedWheel, { camber, toe: existingToe });
      const next = { ...recorded, [rk(selectedWheel, 'VERTICAL')]: true };
      setRecorded(next);
      addToast(
        `✓ ${WHEEL_LABELS[selectedWheel]} Camber: ${camber.toFixed(2)}°${isFirstRearCamber ? ' (baseline set)' : ''}`,
        'success',
      );
      setSelectedPosition(next[rk(selectedWheel, 'HORIZONTAL')] ? null : 'HORIZONTAL');

    } else {
      // HORIZONTAL — toe
      // The phone is laid flat (screen up) for toe measurement. The compass
      // heading (yaw/alpha) directly measures the wheel's pointing direction.
      //
      // Auto-detect 180° phone rotation: if the phone was placed with its
      // top-end pointing opposite to how the reference was measured, the raw diff
      // will be ~180°. Real toe is always < ~10°, so anything > 90° is a flip.
      const rawYaw = sensorData.yaw;

      const isFirstRearToe = rlBaseline?.yaw == null;

      if (isFirstRearToe && !isRearWheel) {
        addToast('Measure a rear wheel HORIZONTAL first to set toe baseline', 'error');
        return;
      }

      if (isFirstRearToe) {
        // This rear wheel becomes the toe reference
        setRLBaselineYaw(rawYaw);
        if (referenceWheel === null) setReferenceWheel(selectedWheel as 'RL' | 'RR');
        const existingCamber = measurements[selectedWheel]?.camber ?? 0;
        recordMeasurement(selectedWheel, { camber: existingCamber, toe: 0 });
        const next = { ...recorded, [rk(selectedWheel, 'HORIZONTAL')]: true };
        setRecorded(next);
        addToast(`✓ ${WHEEL_LABELS[selectedWheel]} Toe: 0.00° (baseline set)`, 'success');
        setSelectedPosition(next[rk(selectedWheel, 'VERTICAL')] ? null : 'VERTICAL');
      } else {
        const refYaw = rlBaseline!.yaw!;

        // 180° flip detection
        const rawDiff = calculateToe(rawYaw, refYaw);
        let workingYaw = rawYaw;
        let flipped = false;
        if (Math.abs(rawDiff) > 90) {
          workingYaw = (rawYaw + 180) % 360;
          flipped = true;
        }

        const toe = calculateToe(workingYaw, refYaw) * sideSign;

        const existingCamber = measurements[selectedWheel]?.camber ?? 0;
        recordMeasurement(selectedWheel, { camber: existingCamber, toe });
        const next = { ...recorded, [rk(selectedWheel, 'HORIZONTAL')]: true };
        setRecorded(next);
        addToast(
          `✓ ${WHEEL_LABELS[selectedWheel]} Toe: ${toe.toFixed(2)}°${flipped ? ' (auto-corrected: phone was flipped 180°)' : ''}`,
          flipped ? 'warning' : 'success',
        );
        setSelectedPosition(next[rk(selectedWheel, 'VERTICAL')] ? null : 'VERTICAL');
      }
    }
  };

  // ── event handlers — caster sweep ─────────────────────────────────────────
  const handleSelectCasterSteering = (side: 'left' | 'right') => {
    setCasterSteering(side);
    setCasterActiveWheel(null);
  };

  const handleSelectCasterWheel = (w: 'FL' | 'FR') => {
    if (casterRecorded[`${w}_${casterSteering}`]) return; // already done
    setCasterActiveWheel(w);
  };

  const handleRecordCaster = () => {
    if (!casterSteering || !casterActiveWheel || rlBaseline?.roll == null) return;

    const casterIsRight = casterActiveWheel === 'FR';
    const casterSign = (casterIsRight === refIsRight) ? 1 : -1;
    const camber = calculateCamber(sensorData.roll, rlBaseline.roll) * casterSign;

    recordCasterReading(casterActiveWheel, casterSteering, camber);
    const nextCasterRecorded = { ...casterRecorded, [`${casterActiveWheel}_${casterSteering}`]: true };
    setCasterRecorded(nextCasterRecorded);
    addToast(
      `✓ ${WHEEL_LABELS[casterActiveWheel]} camber at ${casterSteering === 'left' ? 'LEFT' : 'RIGHT'} 20°: ${camber.toFixed(2)}°`,
      'success',
    );

    // Compute and announce caster if both readings for this wheel are now complete
    const otherSide = casterSteering === 'left' ? 'right' : 'left';
    const otherCamber = casterReadings[casterActiveWheel]?.[otherSide] ?? null;
    if (otherCamber !== null) {
      const [leftVal, rightVal] =
        casterSteering === 'left' ? [camber, otherCamber] : [otherCamber, camber];
      const caster = calculateCaster(leftVal, rightVal);
      addToast(`✓ ${WHEEL_LABELS[casterActiveWheel]} Caster: ${caster.toFixed(2)}°`, 'success');
    }

    // Auto-advance: move to the other front wheel if it hasn't been recorded at
    // this steering position yet.
    const otherWheel = casterActiveWheel === 'FL' ? 'FR' : 'FL';
    if (!nextCasterRecorded[`${otherWheel}_${casterSteering}`]) {
      setCasterActiveWheel(otherWheel);
    } else {
      // Both wheels done at this steering pos — prompt to switch sides
      setCasterActiveWheel(null);
      if (!nextCasterRecorded[`FL_${otherSide}`] || !nextCasterRecorded[`FR_${otherSide}`]) {
        addToast(
          `Both wheels recorded at ${casterSteering === 'left' ? 'LEFT' : 'RIGHT'} — now turn steering ${otherSide === 'left' ? 'LEFT' : 'RIGHT'} 20°`,
          'info',
        );
        setCasterSteering(otherSide);
      }
    }
  };

  // ── derived display values ────────────────────────────────────────────────
  const positionLabel =
    selectedPosition === 'VERTICAL' ? 'Vertical — Camber' : 'Horizontal — Toe';
  const positionInstructions =
    selectedPosition === 'VERTICAL'
      ? 'Hold phone UPRIGHT against the wheel face — charging port pointing DOWN, back of phone flat on wheel, screen toward you'
      : 'Hold phone FLAT — back facing the ground, screen facing up. Keep it level';
  const angleLabel = selectedPosition === 'HORIZONTAL' ? 'Toe (Yaw)' : 'Camber (Roll)';

  const casterPrereqsMet = rlBaseline?.roll != null;
  const casterSectionActive = casterSteering !== null && casterActiveWheel !== null;

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-neutral-900 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/setup')} className="text-neutral-400 hover:text-neutral-200 text-sm">
            ← Setup
          </button>
          <h1 className="text-2xl font-bold">MEASUREMENTS</h1>
          <div className="w-16" />
        </div>

        {/* Status Dashboard */}
        <div className="card">
          <h3 className="text-xs font-semibold text-neutral-500 mb-3 uppercase tracking-wider">Progress</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {WHEELS.map((w) => (
              <button
                key={w}
                onClick={() => !(!hasRearBaseline && (w === 'FL' || w === 'FR')) && handleSelectWheel(w)}
                disabled={!hasRearBaseline && (w === 'FL' || w === 'FR')}
                className={`rounded-lg p-3 border-2 transition text-left ${
                  !hasRearBaseline && (w === 'FL' || w === 'FR')
                    ? 'border-neutral-100 bg-neutral-100 opacity-40 cursor-not-allowed'
                    : selectedWheel === w ? 'border-blue-500 bg-blue-50' : 'border-neutral-200 bg-white hover:border-neutral-300'
                }`}
              >
                <p className="font-bold text-neutral-900 mb-2 text-sm">{WHEEL_LABELS[w]}</p>
                <div className="space-y-0.5 text-xs">
                  <div className={recorded[rk(w, 'VERTICAL')] ? 'text-success' : 'text-neutral-400'}>
                    {recorded[rk(w, 'VERTICAL')] ? '✓' : '○'} Camber
                  </div>
                  <div className={recorded[rk(w, 'HORIZONTAL')] ? 'text-success' : 'text-neutral-400'}>
                    {recorded[rk(w, 'HORIZONTAL')] ? '✓' : '○'} Toe
                  </div>
                  {(w === 'FL' || w === 'FR') && (
                    <div className={ckr(w as 'FL' | 'FR') ? 'text-success' : 'text-neutral-400'}>
                      {ckr(w as 'FL' | 'FR') ? '✓' : '○'} Caster
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Camber / Toe section ── */}
        <div className="card space-y-4">
          {/* Wheel selector */}
          <div>
            <h3 className="text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wider">Wheel</h3>
            <div className="grid grid-cols-2 gap-2">
              {WHEELS.map((w) => {
                const isFront = w === 'FL' || w === 'FR';
                const disabled = isFront && !hasRearBaseline;
                return (
                  <button
                    key={w}
                    onClick={() => !disabled && handleSelectWheel(w)}
                    disabled={disabled}
                    className={`py-3 rounded font-bold text-sm transition ${
                      disabled
                        ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed opacity-50'
                        : selectedWheel === w
                        ? 'bg-blue-600 text-white'
                        : 'bg-neutral-200 text-neutral-800 hover:bg-neutral-300'
                    }`}
                  >
                    {w}
                    {disabled && <div className="text-xs font-normal opacity-60 mt-0.5">Set rear first</div>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Position selector */}
          <div>
            <h3 className="text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wider">Position</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSelectPosition('VERTICAL')}
                className={`py-3 px-2 rounded font-semibold text-sm transition ${
                  selectedPosition === 'VERTICAL'
                    ? 'bg-green-600 text-white ring-2 ring-green-400'
                    : recorded[rk(selectedWheel, 'VERTICAL')]
                    ? 'bg-green-100 text-green-800 hover:bg-green-200 border border-success'
                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                }`}
              >
                {recorded[rk(selectedWheel, 'VERTICAL')] ? '✓ Vertical' : 'Vertical'}
                <div className="text-xs font-normal mt-0.5 opacity-75">Camber</div>
              </button>

              <button
                onClick={() => handleSelectPosition('HORIZONTAL')}
                className={`py-3 px-2 rounded font-semibold text-sm transition ${
                  selectedPosition === 'HORIZONTAL'
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                    : recorded[rk(selectedWheel, 'HORIZONTAL')]
                    ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 border border-success'
                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                }`}
              >
                {recorded[rk(selectedWheel, 'HORIZONTAL')] ? '✓ Horizontal' : 'Horizontal'}
                <div className="text-xs font-normal mt-0.5 opacity-75">Toe</div>
              </button>
            </div>
          </div>
        </div>

        {/* Live panel — camber / toe */}
        {selectedPosition && (
          <div ref={livePanelRef} className="space-y-4">
            <div className="card">
              <h2 className="text-lg font-bold text-blue-700 mb-1">
                {WHEEL_LABELS[selectedWheel]} — {positionLabel}
              </h2>
              <p className="text-sm text-neutral-600">{positionInstructions}</p>
              {isRightWheel && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-1.5 mt-2">
                  ⚠️ Right-side wheel: sign correction applied automatically.
                </p>
              )}
              <PlacementDiagram diagramType="measure" wheel={selectedWheel} position={selectedPosition ?? 'VERTICAL'} className="w-full mt-3" />
            </div>

            <LiveAngleDisplay
              pitch={sensorData.pitch}
              roll={sensorData.roll}
              yaw={sensorData.yaw}
              isStable={sensorData.isStable}
              stabilityProgress={sensorData.stabilityProgress}
              showLabel={angleLabel}
            />

            {warning && (
              <div className="bg-red-50 border border-red-300 text-red-700 text-sm rounded-lg px-4 py-3">
                ⚠️ {warning}
              </div>
            )}

            {guardOk && (
              <button
                onClick={handleRecordMeasurement}
                disabled={!canRecord}
                className={`w-full py-4 rounded-lg font-bold text-white text-lg transition ${
                  canRecord ? 'bg-success hover:bg-green-600 active:scale-95' : 'bg-neutral-600 opacity-50 cursor-not-allowed'
                }`}
              >
                {!sensorData.isStable
                  ? 'Waiting for stability…'
                  : `RECORD ${selectedPosition === 'VERTICAL' ? 'CAMBER' : 'TOE'}`}
              </button>
            )}
          </div>
        )}

        {/* ── Caster Sweep section ── */}
        <div className={`card space-y-4 ${!casterPrereqsMet ? 'opacity-50' : ''}`}>
          <div>
            <h3 className="font-semibold text-neutral-900">Caster Sweep</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              {casterPrereqsMet
                ? 'Turn steering to one side, record FL then FR, then repeat for the other side.'
                : 'Record a rear wheel camber first to unlock caster sweep.'}
            </p>
          </div>

          {/* Steering selector */}
          <div className="grid grid-cols-2 gap-2">
            {(['left', 'right'] as const).map((side) => {
              const bothDone = !!casterRecorded[`FL_${side}`] && !!casterRecorded[`FR_${side}`];
              return (
                <button
                  key={side}
                  onClick={() => !bothDone && casterPrereqsMet && handleSelectCasterSteering(side)}
                  className={`py-3 rounded font-semibold text-sm transition ${
                    casterSteering === side
                      ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                      : bothDone
                      ? 'bg-neutral-100 text-success border border-success opacity-70 cursor-default'
                      : casterPrereqsMet
                      ? 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                      : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                  }`}
                >
                  {bothDone ? '✓ ' : ''}{side === 'left' ? '← Steering LEFT 20°' : 'Steering RIGHT 20° →'}
                </button>
              );
            })}
          </div>

          {/* Progress chips */}
          <div className="grid grid-cols-4 gap-1 text-xs">
            {(['FL', 'FR'] as const).flatMap((w) =>
              (['left', 'right'] as const).map((side) => (
                <div
                  key={`${w}_${side}`}
                  className={`rounded px-2 py-1 text-center font-medium ${
                    casterRecorded[`${w}_${side}`]
                      ? 'bg-success text-white'
                      : casterSteering === side && casterActiveWheel === w
                      ? 'bg-purple-200 text-purple-800 ring-1 ring-purple-400'
                      : 'bg-neutral-100 text-neutral-500'
                  }`}
                >
                  {w} {side === 'left' ? 'L' : 'R'}
                  {casterRecorded[`${w}_${side}`] ? ' ✓' : ''}
                </div>
              ))
            )}
          </div>

          {/* Wheel picker + live panel (shown when a steering side is selected) */}
          {casterSteering !== null && (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-neutral-500 mb-2 uppercase tracking-wider font-semibold">
                  Steering {casterSteering === 'left' ? 'LEFT' : 'RIGHT'} 20° — place phone on:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(['FL', 'FR'] as const).map((w) => {
                    const done = !!casterRecorded[`${w}_${casterSteering}`];
                    return (
                      <button
                        key={w}
                        onClick={() => handleSelectCasterWheel(w)}
                        className={`py-3 rounded font-bold text-sm transition ${
                          casterActiveWheel === w
                            ? 'bg-purple-600 text-white ring-2 ring-purple-400'
                            : done
                            ? 'bg-neutral-100 text-success border border-success opacity-70 cursor-default'
                            : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                        }`}
                      >
                        {done ? `✓ ${WHEEL_LABELS[w]}` : WHEEL_LABELS[w]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {casterSectionActive && (
                <>
                  <p className="text-xs text-neutral-600">
                    Phone VERTICAL against {WHEEL_LABELS[casterActiveWheel!]} — charging port down, back to wheel.
                    Steering held at {casterSteering === 'left' ? 'LEFT' : 'RIGHT'} ~20°.
                  </p>

                  <LiveAngleDisplay
                    pitch={sensorData.pitch}
                    roll={sensorData.roll}
                    yaw={sensorData.yaw}
                    isStable={sensorData.isStable}
                    stabilityProgress={sensorData.stabilityProgress}
                    showLabel="Camber (Roll)"
                  />

                  {casterWarning && (
                    <div className="bg-red-50 border border-red-300 text-red-700 text-sm rounded-lg px-4 py-3">
                      ⚠️ {casterWarning}
                    </div>
                  )}

                  {!casterWarning && (
                    <button
                      onClick={handleRecordCaster}
                      disabled={!casterCanRecord}
                      className={`w-full py-4 rounded-lg font-bold text-white text-lg transition ${
                        casterCanRecord ? 'bg-purple-600 hover:bg-purple-700 active:scale-95' : 'bg-neutral-600 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {!sensorData.isStable
                        ? 'Waiting for stability…'
                        : `RECORD ${WHEEL_LABELS[casterActiveWheel!]} — Steering ${casterSteering === 'left' ? 'LEFT' : 'RIGHT'}`}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Baseline status */}
        {rlBaseline && (
          <div className="text-xs text-neutral-400 bg-neutral-800 rounded px-3 py-2">
            <span className="font-medium">{referenceWheel ? WHEEL_LABELS[referenceWheel] : 'Rear'} Baseline: </span>
            <span className={rlBaseline.roll != null ? 'text-success' : 'text-neutral-600'}>
              Camber ref {rlBaseline.roll != null ? `${rlBaseline.roll.toFixed(2)}°` : '—'}
            </span>
            {' · '}
            <span className={rlBaseline.yaw != null ? 'text-success' : 'text-neutral-600'}>
              Toe ref {rlBaseline.yaw != null ? `${rlBaseline.yaw.toFixed(1)}°` : '—'}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex gap-4">
          <button onClick={() => navigate('/setup')} className="btn-secondary flex-1">← Setup</button>
          {isAllDone() ? (
            <button onClick={() => navigate('/results')} className="btn-primary flex-1">View Results →</button>
          ) : (
            <button
              onClick={() => navigate('/results')}
              disabled={Object.values(measurements).every((m) => m === null)}
              className="btn-secondary flex-1 disabled:opacity-40"
            >
              Partial Results →
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
