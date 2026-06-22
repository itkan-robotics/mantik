/**
 * Flywheel plant — WPILib-style DC motor + wheel inertia.
 * Discrete Euler @ 5 ms. Steady wheel speed ≈ (Kv·V)/gearRatio (rad/s).
 * Ported from controls_js_sim structure; motor constants from vendorMotor.
 */
import type { FlywheelPlantConfig } from '../../types';
import type { DCMotorModel } from '../dcMotor';
import {
  motorRotPerSecToWheelRadPerSec,
  wheelRadPerSecToMotorRotPerSec,
  wheelRadPerSecToWheelRpm,
  wheelRpmToWheelRadPerSec,
} from '../units/flywheelUnits';

export const PLANT_DT = 0.005;
const VISCOUS_FRICTION = 0.0005;

export class FlywheelPlant {
  private speedRadPerSec = 0;
  private wheelRevs = 0;

  constructor(
    private readonly motor: DCMotorModel,
    private readonly plantConfig: FlywheelPlantConfig,
    private readonly timestepS = PLANT_DT,
  ) {}

  reset(): void {
    this.speedRadPerSec = 0;
    this.wheelRevs = 0;
  }

  getWheelRadPerSec(): number {
    return this.speedRadPerSec;
  }

  getWheelRpm(): number {
    return wheelRadPerSecToWheelRpm(this.speedRadPerSec);
  }

  getWheelRevs(): number {
    return this.wheelRevs;
  }

  getMotorRotPerSec(): number {
    return wheelRadPerSecToMotorRotPerSec(this.speedRadPerSec, this.plantConfig);
  }

  /** Steady-state voltage for target motor rot/s (linear FF hint). */
  estimateVoltageForMotorRotPerSec(motorRotPerSec: number): number {
    const wheelRadPerSec = motorRotPerSecToWheelRadPerSec(motorRotPerSec, this.plantConfig);
    const motorRadPerSec = wheelRadPerSec * this.plantConfig.gearRatio;
    return motorRadPerSec / this.motor.KvRadPerSecPerVolt;
  }

  update(inputVolts: number): void {
    const { KtNMPerAmp: Kt, rOhms: R, KvRadPerSecPerVolt: Kv } = this.motor;
    const gearRatio = this.plantConfig.gearRatio;
    const inertiaKgM2 = this.plantConfig.massKg * this.plantConfig.radiusM ** 2;

    const motorRadPerSec = this.speedRadPerSec * gearRatio;
    const backEmf = motorRadPerSec / Kv;
    const current = (inputVolts - backEmf) / R;
    const motorTorque = Kt * current;
    const loadTorque = motorTorque / gearRatio;
    const friction = VISCOUS_FRICTION * this.speedRadPerSec;
    const alpha = (loadTorque - friction) / inertiaKgM2;

    this.speedRadPerSec += alpha * this.timestepS;

    if (this.speedRadPerSec < 0) this.speedRadPerSec = 0;

    const maxWheelRadPerSec = wheelRpmToWheelRadPerSec(this.plantConfig.maxRpm);
    if (this.speedRadPerSec > maxWheelRadPerSec) {
      this.speedRadPerSec = maxWheelRadPerSec;
    }

    this.wheelRevs += (this.speedRadPerSec / (2 * Math.PI)) * this.timestepS;
  }
}
