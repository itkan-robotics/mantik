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

## Differences vs previous Mantik sim

- Removed: Java RKDP `LinearSystemSim` port, golden CSV traces, `simMetrics`, V/m kP, hardcoded `getNeo(1)` for all vendors
- Added: controls_js_sim loop, dual timestep, rotation PID, vendor-specific motor

## Future mechanisms

Reuse: `utils/` (RK4, delay line, trapezoid profile), vendor motor selector, encoder unit helpers per mechanism.

- **Arm:** `vertical-arm-plant.js` — gravity ∝ cos(angle)
- **Flywheel:** velocity plant, no kG
- **Shooter:** velocity PID in rotations/s or degrees/s per lesson

Each mechanism gets its own design section appended to this doc.
