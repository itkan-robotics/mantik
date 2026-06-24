# CLAUDE.md — Mantik PID Simulation Handoff

Context handoff for continuing work on the **PID Simulation** tab in the Mantik docs site (`C:\GitHub\itkan-robotics\mantik`).

---

## Role & Persona

Act as **Agent** — senior WPILib/FRC programmer (Oblarg / PeterJohnson / jonahb tier). Amalgamation of WPILib, Limelight, PhotonVision, CTRE, AdvantageScope, YAMS, simulation experience since FRC inception.

**Communication:** User has **caveman skill on by default** (`C:\Users\abdul\.cursor\skills\caveman\SKILL.md`) — terse, technical, no fluff. Say `stop caveman` / `normal mode` to disable.

**Documentation style:** Follow [`.cursor/rules/ftc-documentation-style.mdc`](.cursor/rules/ftc-documentation-style.mdc) for any Mantik content — broad audience (freshmen to mentors), plain language, no filler.

**User is manager, not omniscient:** Explain what is/isn't feasible. Ask questions when assumptions unclear. Do not assume user knows every FRC/web option.

---

## Primary Task

Build and refine a **browser-based PID tuning trainer** as a top-level nav tab **PID Simulation** (`/pid-simulation`), separate from MDX lesson sections (java, ftc, frc, comp).

**Goal:** Students learn elevator PID tuning (kG → kP) with skills transferable to real robots (Elastic, AdvantageScope, Phoenix Tuner, REV Hardware Client). **Not** a replacement for full WPILib+YAMS JVM sim — link to [mantik-pid-practice](https://github.com/itkan-robotics/mantik-pid-practice) for that.

---

## Current Architecture (Session 3+)

### Stack
- **Site:** Astro 5 static + React island (`@astrojs/react`) + Monaco + uPlot
- **Route:** [`src/pages/pid-simulation/index.astro`](src/pages/pid-simulation/index.astro) — `<PidSimApp client:only="react" />`
- **Nav:** [`src/config/navigation.ts`](src/config/navigation.ts) — `appRoutes` for non-MDX apps
- **Main app:** [`src/components/pid-sim/PidSimApp.tsx`](src/components/pid-sim/PidSimApp.tsx) — passes `vendor` into sim constructor

### Physics (controls_js_sim port — **do not revert to old RKDP stack**)

Authoritative design doc: [`src/lib/pid-sim/docs/vertical-elevator-sim-design.md`](src/lib/pid-sim/docs/vertical-elevator-sim-design.md)

| Layer | Path | Notes |
|-------|------|--------|
| Public export | [`physics/elevatorSim.ts`](src/lib/pid-sim/physics/elevatorSim.ts) | Re-exports `ElevatorSim` for dynamic import |
| Sim loop | [`physics/sim/verticalElevatorSim.ts`](src/lib/pid-sim/physics/sim/verticalElevatorSim.ts) | Controller @ **20 ms**, rotation PID, ring buffer, `subscribe()` |
| Plant | [`physics/plant/verticalElevatorPlant.ts`](src/lib/pid-sim/physics/plant/verticalElevatorPlant.ts) | RK4 @ **5 ms**, height in meters |
| Motor | [`physics/vendorMotor.ts`](src/lib/pid-sim/physics/vendorMotor.ts) | REV → `getNeo(1)`, CTRE → `getKrakenX60(1)` |
| Units | [`physics/units/encoderUnits.ts`](src/lib/pid-sim/physics/units/encoderUnits.ts) | motor rotations ↔ meters |
| Utils | [`physics/utils/`](src/lib/pid-sim/physics/utils/) | `trapezoidProfile.ts`, `delayLine.ts`, `rk4.ts` |
| Motor constants | [`physics/dcMotor.ts`](src/lib/pid-sim/physics/dcMotor.ts) | WPILib DCMotor port — shared, no sim logic |

**External references (read before changing physics):**
- [WPILib Physics Simulation](https://docs.wpilib.org/en/stable/docs/software/wpilib-tools/robot-simulation/physics-sim.html)
- [controls_js_sim](https://github.com/wpilibsuite/wpilib-docs/tree/main/source/_extensions/controls_js_sim) — `sim/vertical-elevator-sim.js`, `plant/vertical-elevator-plant.js`, `utils/trapezoid-profile.js`

**Removed (Session 3 — do not resurrect):** `elevatorPlant.ts`, `linearSystemSim.ts`, `numericalIntegration.ts`, `simMetrics.ts`, `elevatorFeedforward.ts`, golden CSV traces, `golden:export` script, V/m kP, hardcoded `getNeo(1)` for all vendors.

### Units model (critical)

| Where | Units |
|-------|--------|
| Java templates, SpringTune, `TuningConfig`, PID math | **Motor rotations** — kP V/rot, kV V/(rot/s), setpoint rot |
| Mechanism canvas, TraceView (`SimSample.position`) | **Meters** (converted in sim + `MechanismPanel`) |

Conversion: `metersPerMotorRotation = drumCircumferenceM / gearRatio`

Default setpoint rot ≈ start height: see `DEFAULT_SETPOINT_ROT` in [`elevatorReference.ts`](src/lib/pid-sim/reference/elevatorReference.ts).

### UI components
```
src/components/pid-sim/
  PidSimApp.tsx          — state, vendor, sim lifecycle, layout
  PidSimLanding.tsx      — vendor picker (link-grid branding)
  CodeTourPanel.tsx      — code explanation guide
  TuningGuidePanel.tsx   — tuning workflow guide
  CodeEditorTabs.tsx     — ElevatorSubsystem.java + Robot.java (Monaco lazy)
  ElasticPanel.tsx       — SpringTune sliders (rotation units)
  SimulatorPanel.tsx     — BenchScope shell
  MechanismPanel.tsx     — canvas elevator (meters display)
  GraphPanel.tsx         — uPlot TraceView
  SimControlsBar.tsx     — Teleop, Live Tuning, Run
```

### Lib / config
```
src/lib/pid-sim/
  types.ts               — TuningConfig (+ kA), PlantConfig, SimSample
  reference/elevatorReference.ts — plant, hold kG hints per vendor, KP_SLIDER_MAX
  parser/elevatorParser.ts       — parse/patch constants (includes kA)
  parser/plantParser.ts          — stub (future editable plant)
  guides/                          — codeTourSteps, tuningGuideSteps, prerequisites, aidLevel
  templates/revElevator.ts, ctreElevator.ts, revRobot.ts, ctreRobot.ts
  lint/elevatorLinter.ts
  docs/vertical-elevator-sim-design.md
src/styles/pid-sim.css
```

### Key design decisions (user-approved, still in force)

| Topic | Decision |
|-------|----------|
| Code execution | Browser physics — parser extracts constants from Java templates |
| MVP mechanism | Elevator only (arm/shooter later) |
| REV template | SparkMax + SparkMaxConfig — **NO YAMS** |
| CTRE template | Talon FX Slot0 on-controller PID |
| Robot tab | **Robot.java** (TimedRobot) — not RobotContainer |
| Guides | Code Tour + Tuning Guide (separate); Socratic, no auto-answers |
| Layout | Guide+Editor top; SpringTune \| BenchScope bottom (CSS grid) |
| Live tuning | Teleop required to run; Live Tuning for sliders only; code edits always apply |
| Vendor | Affects **physics motor** and Java boilerplate |
| Display | Sliders/code in rotations; graph/mechanism in meters |

### Reference plant (hints only — not answers)

From mantik-pid-practice / FRC elevator lesson:
- 16 lb, 0–3 m travel, start 0.5 m, 12:1 gearing, drum circ ≈ 0.14 m (`0.25 * 22 * 0.0254` m)
- kG: plant+vendor specific — binary search; `REV_HOLD_KG` / `CTRE_HOLD_KG` in reference file are hints only
- kP: start **0.1 V/rot**, double; lesson SparkMax video ~25–51 may align better than old V/m sim
- kI/kD/kA: usually 0 for elevator MVP

### Cross-links (MDX updated Session 3)
- [`pid-tuning-practice-setup.mdx`](src/content/frc/frc-pid-tuning-practice/pid-tuning-practice-setup.mdx) — Tier 1 browser, rotation PID, vendor motor
- [`pid-tuning-practice-elevator.mdx`](src/content/frc/frc-pid-tuning-practice/pid-tuning-practice-elevator.mdx) — kG plant-specific; browser V/rot

---

## Agent SOP

**Read before changing `pid-sim/` code:** [`.cursor/rules/pid-simulation-sop.mdc`](.cursor/rules/pid-simulation-sop.mdc)

Mechanism-agnostic checklist for physics, performance, pedagogy, new mechanisms. Session 3 rewrote §2 (physics) and §5 (adding mechanisms).

---

## Critical Caveats & User Feedback History

1. **No answers in guides** — no one-click setpoint, no exact kG/kP values
2. **Setup ≠ tuning** — Code Tour vs Tuning Guide stay separate
3. **Teleop + Live Tuning** — Sim Controls bar; gate Next on prerequisites
4. **REV = SparkMax, not YAMS** — mantik-pid-practice uses YAMS locally only
5. **Robot.java not RobotContainer**
6. **Landing branding** — `lesson-content`, `rules-box`, `link-grid` from [`global.css`](src/styles/global.css)
7. **Mechanism view always visible** — side canvas, not toggle
8. **SpringTune slider → subsystem tab** — keep behavior
9. **Do not hardcode getNeo(1)** — use vendor motor mapping
10. **Do not use V/m kP** — rotation PID matches vendor tuners
11. **Future:** editable plant params — scaffold only (`plantParser.ts`, template comments)

---

## What Is NOT Feasible

- Real WPILib + YAMS + Gradle in browser
- Byte-identical YAMS/AdvantageScope traces
- Arbitrary Java compile/IDE
- 3D mechanism (2D canvas only)

**Alternatives:** browser training sim (current), local [mantik-pid-practice](https://github.com/itkan-robotics/mantik-pid-practice), future backend Java (heavy).

---

## Tech / Repo Notes

| Command | Purpose |
|---------|---------|
| `npm run dev` | http://localhost:5173/pid-simulation |
| `npm run build` | Astro + Pagefind |
| `npm run test:physics` | Vitest — [`verticalElevatorSim.test.ts`](src/lib/pid-sim/physics/verticalElevatorSim.test.ts) (6 tests) |

- **Git:** Do not commit unless user asks
- **Reference repo:** `C:\GitHub\itkan-robotics\mantik-pid-practice` — plant numbers, YAMS workflow; not browser template source
- **React island:** `client:only="react"` on PidSimApp. If `ReactSharedInternals.H is null` / useState crash: restart dev server + hard refresh (stale Vite chunk). Consider `vite.resolve.dedupe: ['react', 'react-dom']` if recurrence with Monaco chunks.

---

## Session History

### Sessions 1–2 (foundation)
- Full PID Simulation tab v1 + UX v2: two guides, Sim Controls, side-by-side SpringTune+BenchScope, Monaco, uPlot, vendor landing
- Earlier physics: hand-ported WPILib Java RKDP + golden CSV validation — **replaced in Session 3**

### Session 3 (physics redo — **current**)
- User direction: vendor-specific motors, rotation-based PID, port [controls_js_sim](https://github.com/wpilibsuite/wpilib-docs/tree/main/source/_extensions/controls_js_sim), delete old physics
- Wrote design doc, deleted RKDP/golden stack, rebuilt plant/sim/utils
- Wired vendor through PidSimApp; templates/parser/SpringTune in rotations; guides + MDX + SOP updated
- Verified: `npm run test:physics` 6/6, `npm run build` pass
- Debug: React useState null internals on load — user fixed (dev restart); instrumentation removed from PidSimApp

---

## Open Items

- Arm, shooter, flywheel mechanisms (follow design doc pattern)
- Editable plant parameters UI (scaffold exists)
- Motion profiling UX (kV/kA tuning steps; profile limits in rot/s)
- Homepage mention of PID Simulation tab
- Parser/physics E2E tests beyond current 6
- Optional: `vite.resolve.dedupe` for React if Monaco duplicate-react recurs
- Branch may be behind `origin/main` — merge/rebase when user asks

---

## Likely Next Work (priority order)

1. Manual UX pass on `/pid-simulation` — REV vs CTRE kG feel, kP double from 0.1, descent vs ascent
2. Calibrate plant coefficients vs mantik-pid-practice feel (pedagogy match, not byte-identical)
3. Additional mechanisms using `docs/vertical-elevator-sim-design.md` as template
4. Commit/push when user requests
