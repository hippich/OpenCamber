import type { FC } from 'react';

export type DiagramType = 'calibrate-flat' | 'calibrate-wheel' | 'measure' | 'caster-out' | 'caster-in';

interface PlacementDiagramProps {
  diagramType: DiagramType;
  /** Active wheel for 'measure' and 'caster-*' variants */
  wheel?: 'FL' | 'FR' | 'RL' | 'RR';
  /** Phone position: VERTICAL (camber) or HORIZONTAL (toe). Only used for 'measure'. */
  position?: 'VERTICAL' | 'HORIZONTAL';
  className?: string;
}

// ── Shared colours ────────────────────────────────────────────────────────────
const P = {
  bg: '#0f172a',
  carBody: '#1e293b',
  carStroke: '#334155',
  tire: '#0f172a',
  rim: '#475569',
  rimStroke: '#64748b',
  spoke: '#4b5563',
  wheelIdle: '#1e293b',
  wheelIdleStroke: '#334155',
  wheelActive: '#1d4ed8',
  wheelActiveStroke: '#60a5fa',
  jig: '#0891b2',
  jigStroke: '#67e8f9',
  phone: '#1e3a8a',
  phoneStroke: '#93c5fd',
  screen: '#93c5fd',
  label: '#94a3b8',
  dim: '#475569',
  accent: '#f59e0b',
  green: '#10b981',
};

// ── Re-usable SVG pieces ──────────────────────────────────────────────────────

const ArrowDefs: FC = () => (
  <>
    {/* BEGIN: ArrowDefs - marker definition for arrows */}
    <defs>
      <marker id="pd-arr" viewBox="0 0 10 10" refX="9" refY="5"
        markerWidth="5" markerHeight="5" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill={P.accent} />
      </marker>
    </defs>
    {/* END: ArrowDefs */}
  </>
);

/** Front-on view of a wheel (circle + rim + spokes). */
const WheelFace: FC<{ cx: number; cy: number; r: number }> = ({ cx, cy, r }) => (
  <>
    {/* BEGIN: WheelFace - front-on wheel with rim and spokes */}
    <g>
      <circle cx={cx} cy={cy} r={r} fill={P.tire} stroke="#334155" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={r * 0.68} fill="#1e293b" stroke={P.rimStroke} strokeWidth="1.5" />
      {[0, 60, 120, 180, 240, 300].map(a => {
        const rad = (a * Math.PI) / 180;
        return (
          <line key={a}
            x1={cx + Math.cos(rad) * r * 0.14} y1={cy + Math.sin(rad) * r * 0.14}
            x2={cx + Math.cos(rad) * r * 0.64} y2={cy + Math.sin(rad) * r * 0.64}
            stroke={P.spoke} strokeWidth="3.5" strokeLinecap="round"
          />
        );
      })}
      <circle cx={cx} cy={cy} r={r * 0.14} fill={P.rim} stroke={P.rimStroke} strokeWidth="1" />
    </g>
    {/* END: WheelFace */}
  </>
);

/** Top-down wheel rectangle. */
const WheelRect: FC<{ x: number; y: number; w: number; h: number; active?: boolean }> = ({
  x, y, w, h, active,
}) => (
  <>
    {/* BEGIN: WheelRect - top-down wheel representation */}
    <rect x={x} y={y} width={w} height={h} rx="2"
      fill={active ? P.wheelActive : P.wheelIdle}
      stroke={active ? P.wheelActiveStroke : P.wheelIdleStroke}
      strokeWidth="1.5"
    />
    {/* END: WheelRect */}
  </>
);

// ── Calibrate-Flat Diagram Components ─────────────────────────────────────────

const CalibrateFlatContent: FC = () => (
  <>
    {/* BEGIN: CalibrateFlatContent - ground and surface elements */}
    {/* Ground line + hatching */}
    <line x1="60" y1="165" x2="220" y2="165" stroke={P.dim} strokeWidth="2.5" />
    {Array.from({ length: 9 }, (_, i) => (
      <line key={i} x1={60 + i * 18} y1="165" x2={52 + i * 18} y2="180"
        stroke={P.dim} strokeWidth="1.5" />
    ))}
    {/* END: CalibrateFlatContent */}
  </>
);

const CalibrateFlatJig: FC = () => (
  <>
    {/* BEGIN: CalibrateFlatJig - jig plate standing upright on ground */}
    <rect x="122" y="110" width="36" height="55" rx="4"
      fill={P.jig} stroke={P.jigStroke} strokeWidth="1.5" />
    <text x="140" y="141" textAnchor="middle"
      fill="white" fontSize="8" fontFamily="monospace" fontWeight="600"
      transform="rotate(0,140,141)">JIG</text>
    {/* END: CalibrateFlatJig */}
  </>
);

const CalibrateFlatPhone: FC = () => (
  <>
    {/* BEGIN: CalibrateFlatPhone - phone standing upright on jig */}
    <rect x="118" y="44" width="44" height="66" rx="4"
      fill={P.phone} stroke={P.phoneStroke} strokeWidth="1.5" />
    <rect x="122" y="50" width="36" height="54" rx="2"
      fill={P.screen} opacity="0.15" />
    <text x="140" y="81" textAnchor="middle"
      fill={P.screen} fontSize="8.5" fontFamily="sans-serif">PHONE</text>
    {/* Camera dot */}
    <circle cx="140" cy="54" r="3" fill="#1e293b" stroke={P.phoneStroke} strokeWidth="1" />
    {/* END: CalibrateFlatPhone */}
  </>
);

const CalibrateFlatGuides: FC = () => (
  <>
    {/* BEGIN: CalibrateFlatGuides - reference lines and annotations */}
    {/* Vertical reference line */}
    <line x1="140" y1="24" x2="140" y2="44"
      stroke={P.green} strokeWidth="1.5" strokeDasharray="4,3" />
    <text x="148" y="34" fill={P.green} fontSize="8" fontFamily="sans-serif">vertical</text>

    {/* Left-side annotation: beta ≈ 90° */}
    <line x1="115" y1="77" x2="88" y2="77" stroke={P.accent} strokeWidth="1.2" strokeDasharray="3,2" />
    <text x="85" y="73" textAnchor="end" fill={P.accent} fontSize="8" fontFamily="monospace">β≈90°</text>
    <text x="85" y="84" textAnchor="end" fill={P.accent} fontSize="8" fontFamily="monospace">roll≈0°</text>
    {/* END: CalibrateFlatGuides */}
  </>
);

const CalibrateFlatLabels: FC = () => (
  <>
    {/* BEGIN: CalibrateFlatLabels - text labels */}
    {/* Level bubble below jig */}
    <text x="140" y="185" textAnchor="middle"
      fill={P.dim} fontSize="8.5" fontFamily="sans-serif">flat, level surface</text>

    {/* Title */}
    <text x="140" y="16" textAnchor="middle"
      fill={P.label} fontSize="11" fontFamily="sans-serif" fontWeight="600">
      Hold jig upright on flat surface
    </text>
    {/* END: CalibrateFlatLabels */}
  </>
);

const CalibrateFlatDiagram: FC<{ className: string }> = ({ className }) => (
  <svg viewBox="0 0 280 200" className={className} role="img"
    aria-label="Hold jig upright on a level surface">
    {/* BEGIN: CalibrateFlatDiagram - complete diagram */}
    <ArrowDefs />
    <rect width="280" height="200" fill={P.bg} rx="8" />
    <CalibrateFlatContent />
    <CalibrateFlatJig />
    <CalibrateFlatPhone />
    <CalibrateFlatGuides />
    <CalibrateFlatLabels />
    {/* END: CalibrateFlatDiagram */}
  </svg>
);

// ── Calibrate-Wheel Diagram Components ────────────────────────────────────────

const CalibrateWheelGraphics: FC<{ cx: number; cy: number; r: number }> = ({ cx, cy, r }) => (
  <>
    {/* BEGIN: CalibrateWheelGraphics - wheel face */}
    <WheelFace cx={cx} cy={cy} r={r} />
    {/* END: CalibrateWheelGraphics */}
  </>
);

const CalibrateWheelJig: FC<{ cx: number; cy: number; jW: number; jH: number }> = ({ cx, cy, jW, jH }) => (
  <>
    {/* BEGIN: CalibrateWheelJig - jig plate on wheel */}
    <rect x={cx - jW / 2} y={cy - jH / 2} width={jW} height={jH} rx="3"
      fill={P.jig} opacity="0.9" stroke={P.jigStroke} strokeWidth="1" />
    {/* END: CalibrateWheelJig */}
  </>
);

const CalibrateWheelPhone: FC<{ cx: number; cy: number; phoneW: number; phoneH: number }> = ({
  cx, cy, phoneW, phoneH,
}) => (
  <>
    {/* BEGIN: CalibrateWheelPhone - phone on jig */}
    {/* Phone upright (portrait) on jig */}
    <rect x={cx - phoneW / 2} y={cy - phoneH / 2}
      width={phoneW} height={phoneH} rx="3"
      fill={P.phone} stroke={P.phoneStroke} strokeWidth="1.5" />
    {/* Screen inset */}
    <rect x={cx - phoneW / 2 + 3} y={cy - phoneH / 2 + 8}
      width={phoneW - 6} height={phoneH - 16} rx="1.5"
      fill={P.screen} opacity="0.2" />
    <text x={cx} y={cy - 2} textAnchor="middle"
      fill={P.screen} fontSize="8" fontFamily="sans-serif">PHONE</text>
    {/* Camera dot near top */}
    <circle cx={cx} cy={cy - phoneH / 2 + 5} r="2.5"
      fill="#1e293b" stroke={P.phoneStroke} strokeWidth="0.8" />
    {/* Charging port at bottom */}
    <line x1={cx - 5} y1={cy + phoneH / 2 - 3} x2={cx + 5} y2={cy + phoneH / 2 - 3}
      stroke={P.phoneStroke} strokeWidth="1.5" strokeLinecap="round" />
    {/* port ↓ label */}
    <text x={cx} y={cy + phoneH / 2 + 10} textAnchor="middle"
      fill={P.accent} fontSize="7.5" fontFamily="sans-serif">port ↓</text>
    {/* END: CalibrateWheelPhone */}
  </>
);

const CalibrateWheelGuidance: FC<{ cx: number; cy: number; r: number }> = ({ cx, cy, r }) => (
  <>
    {/* BEGIN: CalibrateWheelGuidance - guidance arrows and labels */}
    {/* "press" arrow from outside-right */}
    <line x1="250" y1={cy} x2={cx + r + 4} y2={cy}
      stroke={P.accent} strokeWidth="2" markerEnd="url(#pd-arr)" />
    <text x="252" y={cy - 5} fill={P.accent} fontSize="8.5" fontFamily="sans-serif">press</text>

    {/* "outside" label */}
    <text x="252" y={cy + 13} fill={P.dim} fontSize="8" fontFamily="sans-serif">outside</text>
    {/* END: CalibrateWheelGuidance */}
  </>
);

const CalibrateWheelLabels: FC<{ cx: number }> = ({ cx }) => (
  <>
    {/* BEGIN: CalibrateWheelLabels - text labels */}
    {/* Title */}
    <text x={cx} y="16" textAnchor="middle"
      fill={P.label} fontSize="11" fontFamily="sans-serif" fontWeight="600">
      Jig flat against wheel face · phone upright
    </text>

    {/* Wheel label */}
    <text x={cx} y="194" textAnchor="middle"
      fill={P.label} fontSize="8.5" fontFamily="sans-serif">
      phone UPRIGHT · side edge on rim lip
    </text>
    <text x={cx} y="207" textAnchor="middle"
      fill={P.dim} fontSize="7.5" fontFamily="sans-serif">
      charging port pointing DOWN
    </text>
    {/* END: CalibrateWheelLabels */}
  </>
);

const CalibrateWheelDiagram: FC<{ className: string }> = ({ className }) => {
  const cx = 128, cy = 105, r = 70;
  const jW = 40, jH = 80;
  const phoneW = 32, phoneH = 66;

  return (
    <svg viewBox="0 0 280 220" className={className} role="img"
      aria-label="Jig against rear left wheel">
      {/* BEGIN: CalibrateWheelDiagram - complete diagram */}
      <ArrowDefs />
      <rect width="280" height="208" fill={P.bg} rx="8" />
      <CalibrateWheelGraphics cx={cx} cy={cy} r={r} />
      <CalibrateWheelJig cx={cx} cy={cy} jW={jW} jH={jH} />
      <CalibrateWheelPhone cx={cx} cy={cy} phoneW={phoneW} phoneH={phoneH} />
      <CalibrateWheelGuidance cx={cx} cy={cy} r={r} />
      <CalibrateWheelLabels cx={cx} />
      {/* END: CalibrateWheelDiagram */}
    </svg>
  );
};

// ── Measure Diagram Components ────────────────────────────────────────────────

// Left panel: Top-down car view
const MeasureLeftPanelCarBody: FC<{ cbX: number; cbY: number; cbW: number; cbH: number }> = ({
  cbX, cbY, cbW, cbH,
}) => (
  <>
    {/* BEGIN: MeasureLeftPanelCarBody - car outline */}
    {/* Car body */}
    <rect x={cbX} y={cbY} width={cbW} height={cbH} rx="7"
      fill={P.carBody} stroke={P.carStroke} strokeWidth="1.5" />
    {/* Windshield */}
    <rect x={cbX + 7} y={cbY + 11} width={cbW - 14} height={9} rx="1.5" fill="#334155" />
    {/* Rear window */}
    <rect x={cbX + 7} y={cbY + cbH - 20} width={cbW - 14} height={9} rx="1.5" fill="#334155" />
    {/* END: MeasureLeftPanelCarBody */}
  </>
);

const MeasureLeftPanelAxles: FC<{ flX: number; frX: number; wW: number; frontY: number; rearY: number; wH: number }> = ({
  flX, frX, wW, frontY, rearY, wH,
}) => (
  <>
    {/* BEGIN: MeasureLeftPanelAxles - axle lines */}
    <line x1={flX} y1={frontY + wH / 2} x2={frX + wW} y2={frontY + wH / 2}
      stroke={P.carStroke} strokeWidth="1.5" />
    <line x1={flX} y1={rearY + wH / 2} x2={frX + wW} y2={rearY + wH / 2}
      stroke={P.carStroke} strokeWidth="1.5" />
    {/* END: MeasureLeftPanelAxles */}
  </>
);

const MeasureLeftPanelWheels: FC<{
  wheel: 'FL' | 'FR' | 'RL' | 'RR';
  flX: number; frX: number; wW: number; wH: number;
  frontY: number; rearY: number;
}> = ({ wheel, flX, frX, wW, wH, frontY, rearY }) => (
  <>
    {/* BEGIN: MeasureLeftPanelWheels - wheel positions and labels */}
    {(['FL', 'FR', 'RL', 'RR'] as const).map(w => {
      const wx = w.endsWith('R') ? frX : flX;
      const wy = w.startsWith('F') ? frontY : rearY;
      const act = w === wheel;
      return (
        <g key={w}>
          <WheelRect x={wx} y={wy} w={wW} h={wH} active={act} />
          <text x={wx + wW / 2} y={wy + wH + 9} textAnchor="middle"
            fill={act ? P.wheelActiveStroke : P.dim}
            fontSize="7" fontFamily="sans-serif" fontWeight={act ? '700' : '400'}>{w}</text>
        </g>
      );
    })}
    {/* END: MeasureLeftPanelWheels */}
  </>
);

const MeasureLeftPanelJigCallout: FC<{
  arrowFromX: number; arrowFromY: number;
  arrowToX: number; arrowToY: number;
}> = ({ arrowFromX, arrowFromY, arrowToX, arrowToY }) => (
  <>
    {/* BEGIN: MeasureLeftPanelJigCallout - arrow */}
    <line x1={arrowFromX} y1={arrowFromY} x2={arrowToX} y2={arrowToY}
      stroke={P.accent} strokeWidth="1.5" markerEnd="url(#pd-arr)" />
    {/* END: MeasureLeftPanelJigCallout */}
  </>
);

const MeasureLeftPanelLabels: FC = () => (
  <>
    {/* BEGIN: MeasureLeftPanelLabels - directional labels */}
    <text x="61" y="14" textAnchor="middle"
      fill={P.dim} fontSize="7" fontFamily="sans-serif" letterSpacing="2">FRONT ↑</text>
    <text x="61" y="182" textAnchor="middle"
      fill={P.dim} fontSize="7" fontFamily="sans-serif" letterSpacing="2">REAR ↓</text>
    {/* END: MeasureLeftPanelLabels */}
  </>
);

const MeasureLeftPanel: FC<{
  wheel: 'FL' | 'FR' | 'RL' | 'RR';
}> = ({ wheel }) => {
  const cbX = 37, cbY = 22, cbW = 48, cbH = 128;
  const cbRight = cbX + cbW;
  const wW = 10, wH = 24;
  const flX = cbX - wW - 3;
  const frX = cbRight + 3;
  const frontY = 30;
  const rearY = 126;

  const isRight = wheel.endsWith('R');
  const isFront = wheel.startsWith('F');

  const arrowFromX = isRight ? frX + wW + 15 : flX - 15;
  const arrowFromY = (isFront ? frontY : rearY) + wH / 2;
  const arrowToX = isRight ? frX + wW + 5: flX - 5;
  const arrowToY = (isFront ? frontY : rearY) + wH / 2;

  return (
    <>
      {/* BEGIN: MeasureLeftPanel - top-down car view */}
      <MeasureLeftPanelLabels />
      <MeasureLeftPanelCarBody cbX={cbX} cbY={cbY} cbW={cbW} cbH={cbH} />
      <MeasureLeftPanelAxles flX={flX} frX={frX} wW={wW} frontY={frontY} rearY={rearY} wH={wH} />
      <MeasureLeftPanelWheels wheel={wheel} flX={flX} frX={frX} wW={wW} wH={wH} frontY={frontY} rearY={rearY} />
      <MeasureLeftPanelJigCallout
        arrowFromX={arrowFromX} arrowFromY={arrowFromY}
        arrowToX={arrowToX} arrowToY={arrowToY}
      />
      {/* END: MeasureLeftPanel */}
    </>
  );
};

// Right panel: Wheel close-up (horizontal or vertical)
const MeasureRightPanelHorizontal: FC<{ cx: number; cy: number; r: number }> = ({ cx, cy, r }) => (
  <>
    {/* BEGIN: MeasureRightPanelVertical - camber measurement (phone upright on wheel) */}
    <WheelFace cx={cx} cy={cy} r={r} />

    {/* direction of the car */}
    <line x1={cx - 25} y1={cy - r - 10} x2={cx + 25} y2={cy - r - 10}
      stroke={P.accent} strokeWidth="1.5" markerEnd="url(#pd-arr)" markerStart="url(#pd-arr)" />
    <text x={cx - 55} y={cy - r - 8} fill={P.accent} fontSize="7" fontFamily="sans-serif">Front</text>
    <text x={cx + 40} y={cy - r - 8} fill={P.accent} fontSize="7" fontFamily="sans-serif">Rear</text>

    {/* Phone — portrait / upright rectangle */}
    <rect x={cx - 23} y={cy + 28}
      width={45} height={5} rx="3"
      fill={P.phone} stroke={P.phoneStroke} strokeWidth="1.5" />

    {/* "port →" label */}
    <text x={cx + 38} y={cy + 32} textAnchor="middle"
      fill={P.accent} fontSize="7" fontFamily="sans-serif">→ port</text>

    {/* "screen →" arrow & label */}
    <line x1={cx} y1={cy + 25} x2={cx} y2={cy - 15}
      stroke={P.accent} strokeWidth="1.5" markerEnd="url(#pd-arr)" />
    <text x={cx - 10} y={cy - 20} fill={P.accent} fontSize="7" fontFamily="sans-serif">screen</text>
    {/* END: MeasureRightPanelVertical */}
  </>
);

const MeasureRightPanelVertical: FC<{ cx: number; cy: number; r: number }> = ({ cx, cy, r }) => (
  <>
    {/* BEGIN: MeasureRightPanelVertical - camber measurement (phone upright on wheel) */}
    <WheelFace cx={cx} cy={cy} r={r} />

    {/* direction of the car */}
    <line x1={cx - 25} y1={cy - r - 10} x2={cx + 25} y2={cy - r - 10}
      stroke={P.accent} strokeWidth="1.5" markerEnd="url(#pd-arr)" markerStart="url(#pd-arr)" />
    <text x={cx - 55} y={cy - r - 8} fill={P.accent} fontSize="7" fontFamily="sans-serif">Front</text>
    <text x={cx + 40} y={cy - r - 8} fill={P.accent} fontSize="7" fontFamily="sans-serif">Rear</text>

    {/* Phone — portrait / upright rectangle */}
    <rect x={cx - 34} y={cy - 23}
      width={5} height={45} rx="3"
      fill={P.phone} stroke={P.phoneStroke} strokeWidth="1.5" />

    {/* "port ↓" label */}
    <text x={cx - 34} y={cy + 32} textAnchor="middle"
      fill={P.accent} fontSize="7" fontFamily="sans-serif">port ↓</text>

    {/* "screen → YOU" arrow & label */}
    <line x1={cx - 25} y1={cy} x2={cx + 10} y2={cy}
      stroke={P.accent} strokeWidth="1.5" markerEnd="url(#pd-arr)" />
    <text x={cx + 12} y={cy + 1} fill={P.accent} fontSize="7" fontFamily="sans-serif">screen</text>
    {/* END: MeasureRightPanelVertical */}
  </>
);

const MeasureRightPanelCaption: FC<{ cx: number; wheel: 'FL' | 'FR' | 'RL' | 'RR'; isRight: boolean; isHorizontal: boolean }> = ({
  cx, wheel, isRight, isHorizontal,
}) => (
  <>
    {/* BEGIN: MeasureRightPanelCaption - text labels for right panel */}
    {isHorizontal && (
      <>
        <text x={cx} y="160" textAnchor="middle"
          fill={P.label} fontSize="8" fontFamily="sans-serif">
          phone's side edge on rim lip
        </text>
        <text x={cx} y="171" textAnchor="middle"
          fill={P.dim} fontSize="7.5" fontFamily="sans-serif">
          screen facing up · keep it level
        </text>
      </>
    )}
    {!isHorizontal && (
      <>
        <text x={cx} y="168" textAnchor="middle"
          fill={P.label} fontSize="8" fontFamily="sans-serif">
          phone UPRIGHT · side edge on rim lip
        </text>
        <text x={cx} y="179" textAnchor="middle"
          fill={P.dim} fontSize="7.5" fontFamily="sans-serif">
          charging port down · screen faces you
        </text>
      </>
    )}
    <text x={cx} y="194" textAnchor="middle"
      fill={P.wheelActiveStroke} fontSize="9.5" fontFamily="sans-serif" fontWeight="600">
      {wheel} — {isRight ? 'right' : 'left'} side · {isHorizontal ? 'TOE' : 'CAMBER'}
    </text>
    {/* END: MeasureRightPanelCaption */}
  </>
);

const MeasurePanelDivider: FC = () => (
  <>
    {/* BEGIN: MeasurePanelDivider - vertical separator between panels */}
    <line x1="124" y1="10" x2="124" y2="192"
      stroke="#334155" strokeWidth="1" strokeDasharray="4,3" />
    {/* END: MeasurePanelDivider */}
  </>
);

const MeasureDiagram: FC<{
  className: string;
  wheel: 'FL' | 'FR' | 'RL' | 'RR';
  position: 'VERTICAL' | 'HORIZONTAL';
}> = ({ className, wheel, position }) => {
  const isRight = wheel.endsWith('R');
  const isHorizontal = position === 'HORIZONTAL';
  const cx = 204, cy = 94, r = 58;

  return (
    <svg viewBox="0 0 280 200" className={className} role="img"
      aria-label={`Jig placement for ${wheel} wheel — ${isHorizontal ? 'horizontal' : 'vertical'}`}>
      {/* BEGIN: MeasureDiagram - two-panel layout with car and wheel detail */}
      <ArrowDefs />
      <rect width="280" height="200" fill={P.bg} rx="8" />

      {/* ── LEFT PANEL ── */}
      <MeasureLeftPanel wheel={wheel} />

      {/* ── PANEL DIVIDER ── */}
      <MeasurePanelDivider />

      {/* ── RIGHT PANEL ── */}
      {isHorizontal ? (
        <MeasureRightPanelHorizontal cx={cx} cy={cy} r={r} />
      ) : (
        <MeasureRightPanelVertical cx={cx} cy={cy} r={r} />
      )}

      {/* ── CAPTION ── */}
      <MeasureRightPanelCaption cx={cx} wheel={wheel} isRight={isRight} isHorizontal={isHorizontal} />
      {/* END: MeasureDiagram */}
    </svg>
  );
};

// ── Caster Diagram Components ─────────────────────────────────────────────────

const CasterFrontAxle: FC<{ flCx: number; frCx: number; axleY: number }> = ({  axleY }) => (
  <>
    {/* BEGIN: CasterFrontAxle - axle line and car body */}
    {/* Car body stub (just front half visible) */}
    <rect x="110" y={axleY} width="60" height="50" rx="6"
      fill={P.carBody} stroke={P.carStroke} strokeWidth="1.5" />

    {/* Axle */}
    <line x1="44" y1={axleY} x2="236" y2={axleY}
      stroke={P.carStroke} strokeWidth="2" />
    {/* END: CasterFrontAxle */}
  </>
);

const CasterWheelGroup: FC<{
  wheelId: 'FL' | 'FR';
  cx: number;
  axleY: number;
  steerAngle: number;
  wW: number;
  wH: number;
  jigOnLeft: boolean;
}> = ({ wheelId, cx, axleY, steerAngle, wW, wH, jigOnLeft }) => {
  const isLeft = wheelId === 'FL';

  return (
    <>
      {/* BEGIN: CasterWheelGroup - {wheelId} wheel with rotation */}
      <g transform={`rotate(${steerAngle}, ${cx}, ${axleY})`}>
        <WheelRect
          x={cx - wW / 2} y={axleY - wH / 2} w={wW} h={wH}
          active={isLeft === jigOnLeft}
        />
        {/* Jig on this wheel */}
        {isLeft === jigOnLeft && (
          <rect
            x={isLeft ? cx - wW / 2 - 9 : cx + wW / 2 + 2}
            y={axleY - 14}
            width={7} height={28}
            rx="2" fill={P.jig} stroke={P.jigStroke} strokeWidth="1.5"
          />
        )}
      </g>

      {/* Wheel label (outside transform so text stays upright) */}
      <text x={cx} y={axleY + 38} textAnchor="middle"
        fill={isLeft === jigOnLeft ? P.wheelActiveStroke : P.label}
        fontSize="8" fontFamily="sans-serif" fontWeight={isLeft === jigOnLeft ? '700' : '400'}>
        {wheelId}
      </text>
      {/* END: CasterWheelGroup */}
    </>
  );
};

const CasterSteeringIndicator: FC<{ steerLeft: boolean }> = ({ steerLeft }) => (
  <>
    {/* BEGIN: CasterSteeringIndicator - arrow and label */}
    {steerLeft ? (
      <path d="M 155 40 Q 112 20 68 52"
        stroke={P.accent} strokeWidth="2.5" fill="none" markerEnd="url(#pd-arr)" />
    ) : (
      <path d="M 125 40 Q 168 20 212 52"
        stroke={P.accent} strokeWidth="2.5" fill="none" markerEnd="url(#pd-arr)" />
    )}

    {/* Direction label */}
    <text x="140" y="28" textAnchor="middle"
      fill={P.accent} fontSize="14" fontFamily="sans-serif" fontWeight="700">
      {steerLeft ? '← LEFT 20°' : 'RIGHT 20° →'}
    </text>
    {/* END: CasterSteeringIndicator */}
  </>
);

const CasterJigLabel: FC<{ jigOnLeft: boolean; flCx: number; frCx: number; wW: number; axleY: number }> = ({
  jigOnLeft, flCx, frCx, wW, axleY,
}) => (
  <>
    {/* BEGIN: CasterJigLabel - JIG text label */}
    {jigOnLeft ? (
      <text x={flCx - wW / 2 - 14} y={axleY + 6} textAnchor="end"
        fill={P.jigStroke} fontSize="8" fontFamily="sans-serif" fontWeight="600">JIG</text>
    ) : (
      <text x={frCx + wW / 2 + 14} y={axleY + 6} textAnchor="start"
        fill={P.jigStroke} fontSize="8" fontFamily="sans-serif" fontWeight="600">JIG</text>
    )}
    {/* END: CasterJigLabel */}
  </>
);

const CasterFooter: FC = () => (
  <>
    {/* BEGIN: CasterFooter - instructions */}
    <text x="140" y="178" textAnchor="middle"
      fill={P.label} fontSize="9.5" fontFamily="sans-serif">
      Keep jig on wheel · hold steering steady
    </text>
    {/* END: CasterFooter */}
  </>
);

const CasterDiagram: FC<{
  className: string;
  diagramType: 'caster-out' | 'caster-in';
  wheel: 'FL' | 'FR';
}> = ({ className, diagramType, wheel }) => {
  const steerLeft = diagramType === 'caster-out';
  const steerAngle = steerLeft ? -20 : 20;
  const jigOnLeft = wheel === 'FL';

  const flCx = 88, frCx = 192, axleY = 106;
  const wW = 14, wH = 48;

  return (
    <svg viewBox="0 0 280 188" className={className} role="img"
      aria-label={`Turn steering ${steerLeft ? 'left' : 'right'} 20 degrees`}>
      {/* BEGIN: CasterDiagram - steering angle measurement */}
      <ArrowDefs />
      <rect width="280" height="188" fill={P.bg} rx="8" />

      <CasterFrontAxle flCx={flCx} frCx={frCx} axleY={axleY} />

      {/* Front wheels with steering rotation */}
      <CasterWheelGroup
        wheelId="FL" cx={flCx} axleY={axleY}
        steerAngle={steerAngle} wW={wW} wH={wH}
        jigOnLeft={jigOnLeft}
      />
      <CasterWheelGroup
        wheelId="FR" cx={frCx} axleY={axleY}
        steerAngle={steerAngle} wW={wW} wH={wH}
        jigOnLeft={jigOnLeft}
      />

      <CasterJigLabel jigOnLeft={jigOnLeft} flCx={flCx} frCx={frCx} wW={wW} axleY={axleY} />
      <CasterSteeringIndicator steerLeft={steerLeft} />
      <CasterFooter />
      {/* END: CasterDiagram */}
    </svg>
  );
};

// ── Main PlacementDiagram Component ───────────────────────────────────────────

export const PlacementDiagram: FC<PlacementDiagramProps> = ({
  diagramType,
  wheel,
  position = 'VERTICAL',
  className = '',
}) => {
  switch (diagramType) {
    case 'calibrate-flat':
      return <CalibrateFlatDiagram className={className} />;

    case 'calibrate-wheel':
      return <CalibrateWheelDiagram className={className} />;

    case 'measure':
      if (!wheel) return null;
      return <MeasureDiagram className={className} wheel={wheel} position={position} />;

    case 'caster-out':
    case 'caster-in':
      if (!wheel || (!wheel.startsWith('F'))) return null;
      return <CasterDiagram className={className} diagramType={diagramType} wheel={wheel as 'FL' | 'FR'} />;

    default:
      return null;
  }
};
