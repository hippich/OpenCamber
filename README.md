# OpenCamber (Wheel Alignment App)

Precision wheel alignment measurement in the browser using phone sensors.

## Current Status

Phase 1 is implemented: **web app + internal phone sensor (`deviceorientation`)**.

- ✅ Measure camber, toe, and caster
- ✅ Rear-wheel baseline workflow (no separate calibration page)
- ✅ Stability detection with progress feedback
- ✅ iOS motion-permission request flow
- ✅ Results table + JSON export
- 🚧 BLE/USB external sensors are planned for Phase 2 (UI placeholders exist)

## Tech Stack

- React 18 + TypeScript + Vite
- Zustand (global alignment store)
- TailwindCSS
- React Router
- Vitest (unit tests)

## Project Structure

```text
src/
  components/      # UI building blocks (live display, diagrams, toasts)
  hooks/           # Sensor and toast hooks
  pages/           # Home, Setup, Measure, Results
  store/           # Zustand alignment store
  types/           # Shared TypeScript types
  utils/           # Math, filters, constants, storage
  __tests__/       # Vitest unit tests
```

## Quick Start

### Requirements

- Node.js 18+
- Modern browser with Device Orientation support
- HTTPS or localhost (required for sensor APIs)

### Install

```bash
npm install
```

### Run (dev)

```bash
npm run dev
```

### Build

```bash
npm run build
npm run preview
```

## Scripts

- `npm run dev` — start development server
- `npm run build` — type-check + production build
- `npm run preview` — preview production build
- `npm run lint` — run ESLint
- `npm run format` — run Prettier on `src/**/*.{ts,tsx,css,md}`
- `npm run type-check` — TypeScript no-emit check
- `npm run test` — run unit tests once
- `npm run test:watch` — run tests in watch mode
- `npm run test:coverage` — run tests with coverage

## How Measurement Works (Phase 1)

1. Choose **Internal Phone Sensor** in Setup
2. Measure rear wheel(s) first to establish camber and toe baselines
3. For each wheel:
   - **Vertical phone** position for camber
   - **Horizontal phone** position for toe
4. For front wheels, capture caster via left/right steering sweep
5. Review results and export JSON

All wheel angles are normalized to the rear baseline to reduce floor-slope bias.

## Phone Positioning Notes

- **Vertical (Camber):** phone upright against wheel, charging port down
- **Horizontal (Toe):** phone flat, screen up, back facing ground
- App enforces guard checks and waits for stable readings before recording

## Browser / Device Notes

- iOS requires explicit motion permission (`DeviceOrientationEvent.requestPermission()`)
- Heading quality can vary by browser/device; toe is computed relatively to baseline
- Avoid strong magnetic interference and long pauses between baseline and front toe reads
