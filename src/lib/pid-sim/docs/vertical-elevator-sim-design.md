# Vertical Elevator Browser Simulation — Design Reference

Reference for Mantik PID Simulation physics. Read this before adding or changing mechanism simulators.

## Sources

- [WPILib Physics Simulation](https://docs.wpilib.org/en/stable/docs/software/wpilib-tools/robot-simulation/physics-sim.html)
- [controls_js_sim](https://github.com/wpilibsuite/wpilib-docs/tree/main/source/_extensions/controls_js_sim) — especially `sim/vertical-elevator-sim.js`, `plant/vertical-elevator-plant.js`, `utils/trapezoid-profile.js`

## WPILib simulation loop

On a real robot:

1. **User / periodic code (20 ms):** PID reads encoder, computes voltage, calls `motor.setVoltage`.
2. **Simulation periodic:** Apply voltage to plant, integrate physics, write encoder distance/rate for the next user loop.

Mantik mirrors this split: plant integrates at **5 ms**, controller runs at **20 ms**, encoder reading passes through a **delay line** (sensor lag).

## controls_js_sim architecture

```text
VerticalElevatorSim
  ├── VerticalElevatorPlant (RK4 @ 5 ms, height in meters)
  ├── TrapezoidProfile (setpoint pos/vel/accel in meters)
  ├── DelayLine (delayed position measurement)
  └── updateController: kG + kV·v + kA·a + PID → voltage
```

WPILib’s docs JS sim runs PID in **meters**. Mantik runs PID in **motor rotations** so gains match SparkMax / Talon FX on-controller tuning (encoder native units).

## Unit model

| Layer | Position | Velocity | Acceleration |
|-------|----------|----------|--------------|
| Plant (internal) | meters | m/s | m/s² |
| Encoder / PID / templates / SpringTune | motor rotations | rot/s | rot/s² |
| Mechanism + TraceView display | meters | m/s | — |

Conversion (from `PlantConfig`):

```text
metersPerMotorRotation = drumCircumferenceM / gearRatio
heightM = motorRotations × metersPerMotorRotation
motorRotations = heightM × gearRatio / drumCircumferenceM
```

Gain units (rotation PID):

- kG, kS: volts
- kV: V/(rot/s)
- kA: V/(rot/s²)
- kP: V/rot
- kI: V·s/rot
- kD: V/(rot/s)

Feedforward during profiling converts profile vel/accel from m/s → rot/s before applying kV/kA.

## Vendor motors

| Vendor | WPILib motor | Used for |
|--------|--------------|----------|
| REV | `DCMotor.getNEO(1)` | Spark MAX template |
| CTRE | `DCMotor.getKrakenX60(1)` | Talon FX template (closest WPILib constant) |

Same `PlantConfig` (mass, gearing, drum); different motor → different hold kG and motion feel.

## Plant model

Ported from `vertical-elevator-plant.js`:

- State `[positionM, velocityMps]`
- RK4 integration
- Acceleration: gravity + back-EMF + control voltage + limit spring/dashpot at min/max height
- Plant coefficients `kG`, `kV`, `kA` (internal physics) derived from `DCMotor` + `PlantConfig` via linear elevator model — not the user’s tuner kG/kV/kA

User feedforward gains in `TuningConfig` are separate (controller side), matching real robot workflow.

### Editable plant constants

Students can edit `kMassLbs`, `kMinHeightM`, `kMaxHeightM`, `kStartHeightM`, `kGearRatio`, and `kDrumCircumferenceM` in the subsystem `PLANT` block. [`plantParser.ts`](../parser/plantParser.ts) parses them on every code edit; [`PidSimApp`](../../../components/pid-sim/PidSimApp.tsx) calls `ElevatorSim.setPlant()` when values change. Missing constants fall back to [`REFERENCE_PLANT`](../reference/elevatorReference.ts). Code Tour mentions the block in passing — defaults first, edit later.

## Trapezoidal motion profiling

Authoritative reference: [Trapezoidal Motion Profiles in WPILib](https://docs.wpilib.org/en/stable/docs/software/advanced-controls/controllers/trapezoidal-profiles.html) and [`TrapezoidProfile.java`](https://github.wpilib.org/allwpilib/docs/release/java/src-html/edu/wpi/first/math/trajectory/TrapezoidProfile.html).

Implementation: [`physics/utils/trapezoidProfile.ts`](../physics/utils/trapezoidProfile.ts), integrated in [`physics/sim/verticalElevatorSim.ts`](../physics/sim/verticalElevatorSim.ts).

### Why incremental sampling (not absolute time)

WPILib’s `TrapezoidProfile` is a **setpoint filter**: each controller period, advance the previous profiled setpoint toward the goal by one timestep:

```java
m_setpoint = m_profile.calculate(kDt, m_setpoint, m_goal);
```

The goal (`config.setpoint` → `goalHeightM`) can change every tick. The profile is recomputed from the current setpoint state toward the current goal. Do **not** reset profile time or zero out setpoint velocity on setpoint edits.

Mantik previously ported [controls_js_sim `trapezoid-profile.js`](https://github.com/wpilibsuite/wpilib-docs/blob/main/source/_extensions/controls_js_sim/utils/trapezoid-profile.js), which used `init()` plus absolute simulation time. That port had math errors (missing start position offset, wrong acceleration term) and does not match how WPILib is used on real robots. **Use WPILib math and API going forward.**

### Zero limits bypass (kP tuning mode)

When `maxVelocity <= 0` **and** `maxAccel <= 0`, profiling is disabled:

```typescript
profileSetpoint = goal; // instant step setpoint
```

This preserves kG → kP tuning where the setpoint trace jumps immediately to the target. Do not substitute “infinite constraint” profiling for this path.

When only one limit is non-zero, the other axis uses a large cap (`NO_PROFILE_LIMIT`) so partial constraints still work (velocity-only or acceleration-only caps).

### Unit flow

User code and SpringTune store limits in **motor rotations per second** and **rotations per second squared**. The profile runs internally in **m/s** and **m/s²** (plant units):

```text
maxVelMps   = rotPerSecToLinearMps(kMaxVelocity, plant)
maxAccelMps2 = rotPerSec2ToLinearMps2(kMaxAccel, plant)
```

Profile output position/velocity are converted back to rotations for PID and to meters for TraceView.

### Profile math (summary)

Given constraints `maxVel`, `maxAccel`, current state `(pos, vel)`, goal `(goalPos, goalVel)`:

1. **Direction flip** if `current.pos > goal.pos` (run math in a forward frame, flip signs back).
2. **Truncated profile cutoffs** — if start or goal velocity is non-zero, compute `cutoffBegin` / `cutoffEnd` distances needed to ramp from/to zero.
3. **Full trapezoid distance** = `cutoffDistBegin + (goalPos - currentPos) + cutoffDistEnd`.
4. **Cruise phase** exists only if `fullSpeedDist >= 0`. Otherwise use a **triangle profile** (accel then decel, no flat top).
5. Phase times: `endAccel`, `endFullSpeed`, `endDecel`.
6. For timestep `dt`, return state at `t = dt` along the segment from current toward goal.

```text
     vel
      |     +--------+  maxVel
      |    /          \
      |   /            \
      +--+--------------+-- time
        accel  cruise  decel
```

### kA feedforward

WPILib `State` has position and velocity only. Mantik’s `ProfileState` adds `accel` for kA feedforward during profiling:

| Phase | `accel` (directed frame) |
|-------|--------------------------|
| Acceleration | `+maxAccel` |
| Cruise | `0` |
| Deceleration | `-maxAccel` |
| At goal | `0` |

Converted to rot/s² before applying `kA` in `updateController`.

## Differences vs previous Mantik sim

- Removed: Java RKDP `LinearSystemSim` port, golden CSV traces, `simMetrics`, V/m kP, hardcoded `getNeo(1)` for all vendors
- Added: controls_js_sim loop, dual timestep, rotation PID, vendor-specific motor

## Single-jointed arm

Reference: [`controls_js_sim` vertical-arm](https://github.com/wpilibsuite/wpilib-docs/tree/main/source/_extensions/controls_js_sim) — `plant/vertical-arm-plant.js`, `sim/vertical-arm-sim.js`.

### Plant state and gravity

```text
State: [angleRad, angularVelRadPerS]   // 0 rad = horizontal (+X), +θ = CCW (arm up)
accel = -(kGVolts · cos(θ)) / kA + EMF + V/kA + hard-limit spring at ±90°
```

Default plant (controls_js_sim specs + Mantik angle limits):

| Field | Value |
|-------|--------|
| Mass | 5 kg |
| Arm length | 1 m (point mass at end) |
| Gearing | 100:1 motor rot / mechanism rot |
| Start | 0° horizontal |
| Soft limits | ±60° (editable in Java PLANT) |
| Hard limits | ±90° (fixed in physics) |

Coefficients derived from `DCMotor` + `ArmPlantConfig` — not hardcoded ReCalc values.

### Unit model

| Layer | Position | Velocity | Profiling limits |
|-------|----------|----------|------------------|
| Plant internal | radians | rad/s | rad/s, rad/s² |
| PID / templates / SpringTune | motor rotations | rot/s | rot/s, rot/s² |
| Mechanism + TraceView | **degrees** | deg/s | — |

```text
angleDeg = motorRot × (360 / gearRatio)
```

### Controller vs elevator

Arm feedforward: **`kG · cos(setpointRad)`** — not constant kG.

Trapezoid profile uses WPILib incremental `calculate(dt, current, goal)` in rad/s internally; zero max vel **and** max accel bypasses profiling for kG/kP tuning.

### Vendor motors

Same as elevator: REV NEO, CTRE Kraken X60 via `motorForVendor()`.

### Differences from mantik-pid-practice

Local YAMS arm uses degrees in closed-loop config, 12:1 gearing, and different limits. Browser sim uses controls_js plant numbers and motor-rotation PID for vendor tuner parity.

## Flywheel (velocity control)

Reference: [`controls_js_sim` flywheel](https://github.com/wpilibsuite/wpilib-docs/tree/main/source/_extensions/controls_js_sim) — `plant/flywheel-plant.js`, `sim/flywheel-sim.js`.

FRC lesson: [`pid-tuning-practice-shooter.mdx`](../../../../content/frc/frc-pid-tuning-practice/pid-tuning-practice-shooter.mdx) (flywheel velocity tuning video).

### Plant model (DC motor + wheel inertia — not RK4)

Elevator and arm use RK4 on a second-order state. The flywheel uses **Euler integration @ 5 ms** of a DC-motor-driven wheel (controls_js mass/geometry; motor from `vendorMotor`):

```text
State: ω_wheel (rad/s), integrated wheel revolutions (viz only)
Update @ PLANT_DT = 5 ms:
  motor_ω = ω_wheel · gearRatio
  I = (V − motor_ω/Kv) / R
  τ_load = (Kt · I) / gearRatio − viscous friction (0.0005 · ω)
  ω_new = ω + (τ_load / J) · Ts
  clamp 0 ≤ ω ≤ maxRpm (wheel)
J = mass · radius²
Kt, Kv, R from DCMotor(vendor)
Steady state (no friction): ω_wheel ≈ (Kv · V) / gearRatio
```

Default plant (controls_js_sim):

| Field | Value |
|-------|--------|
| Mass | 0.55 kg |
| Radius | 0.0762 m (3 in) |
| Gearing | 5:1 motor rot / wheel rot |
| Max wheel speed | 6000 RPM (clamp in plant) |

### Unit model

| Layer | Velocity | Position (viz) |
|-------|----------|------------------|
| Plant internal | wheel rad/s | wheel revolutions |
| PID / Java / SpringTune | **motor rot/s** | N/A (velocity mode) |
| Mechanism + TraceView | **wheel RPM** | wheel revs (spin angle) |

```text
wheelRpm = (motorRotPerSec / gearRatio) × 60
motorRotPerSec = (wheelRpm / 60) × gearRatio
```

Setpoint in code is **motor rot/s** (SparkMax / Talon FX velocity mode). TraceView shows **wheel RPM** so students can compare to shooter lesson targets (e.g. 417 RPM).

### Controller (@ 20 ms)

```text
FlywheelSim
  ├── FlywheelPlant @ 5 ms
  ├── DelayLine on measured motor rot/s (13 samples — same as elevator)
  └── updateController:
        goal = setpoint (motor rot/s), capped by maxVelocity and plant max RPM
        error = goal − measured
        FF = kS·sign(goal) + kV·goal   (no kG)
        PID on velocity error
        voltage clamp ±12 V
```

No trapezoid profile — setpoint steps immediately (kS → kV → target RPM → kP lesson flow). `maxVelocity` / `maxAccel` remain in Java template for vendor API parity; profiling is disabled in browser physics. `maxVelocity` optionally caps commanded setpoint.

### Tuning order (shooter lesson)

1. kS — static friction FF (small; sim has little friction)
2. kV — setpoint **1 motor rot/s**, use kS-doubling trick, copy result to kV
3. Target velocity — convert RPM → motor rot/s (`motorRotPerSec = wheelRpm / 60 × gearRatio`)
4. kP — very small (≈0.001–0.01); helps rise time and disturbance recovery

### Vendor motors

| Vendor | Motor | Effect |
|--------|-------|--------|
| REV | `getNEO(1)` | Different C1/C2 → different kV feel |
| CTRE | `getKrakenX60(1)` | Same inertia, different motor constants |

### Differences from elevator / arm

| | Elevator / arm | Flywheel |
|--|----------------|----------|
| Control | Position PID | **Velocity PID** |
| kG | Yes (constant or cos θ) | **No** |
| Profile | Trapezoid (optional) | **None** |
| TraceView primary | Position | **Velocity (RPM)** |
| Teleop presets | Travel height fractions | **Velocity fractions of max RPM** |

### Differences from mantik-pid-practice

Local YAMS `ShooterSubsystem` uses 4 in / 1 lb / 12:1 / NEO. Browser sim uses controls_js plant numbers and motor-rotation velocity PID for vendor tuner parity.

## Future mechanisms

Reuse: `utils/` (delay line), vendor motor selector, unit helpers per mechanism.

Each mechanism gets its own design section appended to this doc.
