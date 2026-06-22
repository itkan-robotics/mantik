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

## Future mechanisms

Reuse: `utils/` (RK4, delay line, trapezoid profile), vendor motor selector, encoder unit helpers per mechanism.

- **Flywheel:** velocity plant, no kG
- **Shooter:** velocity PID in rotations/s or degrees/s per lesson

Each mechanism gets its own design section appended to this doc.
