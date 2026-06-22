/**
 * Single-jointed arm sim — ported from controls_js_sim sim/vertical-arm-sim.js.
 * PID in motor rotations; plant internal radians; display degrees on TraceView.
 */
import type { ArmPlantConfig, SimSample, TuningConfig, Vendor } from '../../types';
import { REFERENCE_ARM_PLANT } from '../../reference/armReference';
import { motorForVendor } from '../vendorMotor';
import {
  angleDegToRad,
  angleRadToDeg,
  angleRadToMotorRotations,
  motorRotationsToAngleDeg,
  motorRotationsToAngleRad,
  radPerSec2ToRotPerSec2,
  radPerSecToDegPerSec,
  radPerSecToRotPerSec,
  rotPerSec2ToRadPerSec2,
  rotPerSecToRadPerSec,
} from '../units/armUnits';
import { ArmPlant, PLANT_DT } from '../plant/armPlant';
import { DelayLine } from '../utils/delayLine';
import {
  ProfileConstraints,
  ProfileState,
  TrapezoidProfile,
} from '../utils/trapezoidProfile';

export const SIM_DT = 0.02;
export const PLANT_STEPS_PER_CONTROLLER = Math.round(SIM_DT / PLANT_DT);
const BUFFER_SECONDS = 5;
export const MAX_SAMPLES = Math.ceil(BUFFER_SECONDS / SIM_DT);
const MAX_MOTOR_VOLTAGE = 12;
const NO_PROFILE_LIMIT = 99999;
const DELAY_SAMPLES = 13;

const GAIN_KEYS: (keyof Pick<TuningConfig, 'kP' | 'kI' | 'kD' | 'kS' | 'kG' | 'kV'>)[] = [
  'kP',
  'kI',
  'kD',
  'kS',
  'kG',
  'kV',
];

type SimListener = () => void;

export class ArmSim {
  position = REFERENCE_ARM_PLANT.startAngleDeg;
  velocity = 0;
  setpoint = REFERENCE_ARM_PLANT.startAngleDeg;
  private integral = 0;
  private previousPositionError = 0;
  private simTime = 0;
  private samples: SimSample[] = [];
  private running = false;
  private config: TuningConfig | null = null;
  private enabled = false;
  private plantConfig: ArmPlantConfig;
  private vendor: Vendor;
  private plant: ArmPlant;
  private profile: TrapezoidProfile;
  private profileSetpoint = new ProfileState(0, 0, 0);
  private goalAngleRad = 0;
  private delayLine: DelayLine;
  private inputVolts = 0;
  private listeners = new Set<SimListener>();
  private intervalId?: number;
  private latestSample: SimSample | null = null;
  private lastSetpointRot = 0;

  constructor(vendor: Vendor = 'rev', plant: ArmPlantConfig = REFERENCE_ARM_PLANT) {
    this.vendor = vendor;
    this.plantConfig = plant;
    this.plant = new ArmPlant(motorForVendor(vendor), plant);
    const startRad = angleDegToRad(plant.startAngleDeg);
    this.position = plant.startAngleDeg;
    this.setpoint = plant.startAngleDeg;
    this.goalAngleRad = startRad;
    this.profile = new TrapezoidProfile(this.profileConstraints(null));
    const startRot = angleRadToMotorRotations(startRad, plant);
    this.delayLine = new DelayLine(DELAY_SAMPLES, startRot);
    this.syncProfileSetpointFromPlant();
  }

  subscribe(listener: SimListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  setVendor(vendor: Vendor): void {
    if (vendor === this.vendor) return;
    this.vendor = vendor;
    this.plant = new ArmPlant(motorForVendor(vendor), this.plantConfig);
    this.reset();
  }

  setPlant(plant: ArmPlantConfig): void {
    this.plantConfig = plant;
    this.plant = new ArmPlant(motorForVendor(this.vendor), plant);
    this.reset();
  }

  /** ArmFeedforward kG hint at horizontal (θ = 0). */
  getHoldVoltageHint(): number {
    return this.plant.getHoldVoltageHorizontal();
  }

  private isProfilingDisabled(cfg: TuningConfig | null = this.config): boolean {
    if (!cfg) return true;
    return cfg.maxVelocity <= 0 && cfg.maxAccel <= 0;
  }

  setConfig(config: TuningConfig): void {
    const gainsChanged =
      this.config !== null && GAIN_KEYS.some((k) => this.config![k] !== config[k]);
    const limitsChanged =
      this.config?.maxVelocity !== config.maxVelocity ||
      this.config?.maxAccel !== config.maxAccel;

    this.config = config;
    this.lastSetpointRot = config.setpoint;
    this.goalAngleRad = motorRotationsToAngleRad(config.setpoint, this.plantConfig);
    this.setpoint = motorRotationsToAngleDeg(config.setpoint, this.plantConfig);

    if (gainsChanged) {
      this.integral = 0;
      this.previousPositionError = 0;
    }

    if (limitsChanged) {
      this.profile = new TrapezoidProfile(this.profileConstraints(config));
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  reset(): void {
    const startRad = angleDegToRad(this.plantConfig.startAngleDeg);
    this.plant.reset(startRad);
    this.position = this.plantConfig.startAngleDeg;
    this.velocity = 0;
    this.integral = 0;
    this.previousPositionError = 0;
    this.simTime = 0;
    this.inputVolts = 0;
    this.samples = [];
    this.latestSample = null;

    const startRot = angleRadToMotorRotations(startRad, this.plantConfig);
    this.delayLine.reset(startRot);

    if (this.config) {
      this.goalAngleRad = motorRotationsToAngleRad(this.config.setpoint, this.plantConfig);
      this.lastSetpointRot = this.config.setpoint;
      this.profile = new TrapezoidProfile(this.profileConstraints(this.config));
    } else {
      this.goalAngleRad = startRad;
      this.lastSetpointRot = startRot;
    }
    this.setpoint = angleRadToDeg(this.goalAngleRad);
    this.syncProfileSetpointFromPlant();
    this.notify();
  }

  private syncProfileSetpointFromPlant(): void {
    const posRad = this.plant.getPositionRad();
    const velRad = this.plant.getVelocityRadPerSec();
    this.profileSetpoint = new ProfileState(posRad, velRad, 0);
  }

  private profileConstraints(cfg: TuningConfig | null): ProfileConstraints {
    if (!cfg || this.isProfilingDisabled(cfg)) {
      return new ProfileConstraints(NO_PROFILE_LIMIT, NO_PROFILE_LIMIT);
    }
    const maxVelRad =
      cfg.maxVelocity > 0
        ? rotPerSecToRadPerSec(cfg.maxVelocity, this.plantConfig)
        : NO_PROFILE_LIMIT;
    const maxAccelRad =
      cfg.maxAccel > 0
        ? rotPerSec2ToRadPerSec2(cfg.maxAccel, this.plantConfig)
        : NO_PROFILE_LIMIT;
    return new ProfileConstraints(maxVelRad, maxAccelRad);
  }

  private updateProfileSetpoint(): void {
    const goal = new ProfileState(this.goalAngleRad, 0, 0);
    if (this.isProfilingDisabled()) {
      this.profileSetpoint = goal;
    } else {
      this.profileSetpoint = this.profile.calculate(SIM_DT, this.profileSetpoint, goal);
    }
  }

  private updateController(setpoint: ProfileState, measuredRot: number): number {
    const cfg = this.config!;
    const setpointRot = angleRadToMotorRotations(setpoint.pos, this.plantConfig);
    const setpointVelRot = radPerSecToRotPerSec(setpoint.vel, this.plantConfig);
    const setpointAccelRot = radPerSec2ToRotPerSec2(setpoint.accel, this.plantConfig);

    const positionError = setpointRot - measuredRot;
    this.integral += positionError * SIM_DT;
    const derivativeError = (positionError - this.previousPositionError) / SIM_DT;

    const sign = setpointVelRot !== 0 ? Math.sign(setpointVelRot) : 0;
    let controlEffortVolts =
      cfg.kG * Math.cos(setpoint.pos) +
      cfg.kS * sign +
      cfg.kV * setpointVelRot +
      cfg.kA * setpointAccelRot +
      cfg.kP * positionError +
      cfg.kI * this.integral +
      cfg.kD * derivativeError;

    controlEffortVolts = Math.max(
      -MAX_MOTOR_VOLTAGE,
      Math.min(MAX_MOTOR_VOLTAGE, controlEffortVolts),
    );
    this.previousPositionError = positionError;
    return controlEffortVolts;
  }

  getLatest(): SimSample | null {
    return this.latestSample;
  }

  getSamples(): readonly SimSample[] {
    return this.samples;
  }

  getPlantConfig(): ArmPlantConfig {
    return this.plantConfig;
  }

  step(): SimSample | null {
    if (!this.config || !this.enabled) return null;

    this.updateProfileSetpoint();

    const measuredRot = this.delayLine.getSample();
    this.inputVolts = this.updateController(this.profileSetpoint, measuredRot);

    for (let i = 0; i < PLANT_STEPS_PER_CONTROLLER; i++) {
      this.plant.update(this.inputVolts);
      this.simTime += PLANT_DT;
      const rot = angleRadToMotorRotations(this.plant.getPositionRad(), this.plantConfig);
      this.delayLine.addSample(rot);
    }

    const posRad = this.plant.getPositionRad();
    const velRad = this.plant.getVelocityRadPerSec();
    this.position = angleRadToDeg(posRad);
    this.velocity = radPerSecToDegPerSec(velRad);
    this.setpoint = angleRadToDeg(this.profileSetpoint.pos);

    const sample: SimSample = {
      time: this.simTime,
      position: this.position,
      velocity: this.velocity,
      setpoint: this.setpoint,
      output: this.inputVolts,
    };

    this.latestSample = sample;
    this.samples.push(sample);
    if (this.samples.length > MAX_SAMPLES) this.samples.shift();

    this.notify();
    return sample;
  }

  isRunning(): boolean {
    return this.running;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.intervalId = window.setInterval(() => {
      if (!this.running) return;
      this.step();
    }, SIM_DT * 1000);
  }

  stop(): void {
    this.running = false;
    if (this.intervalId !== undefined) window.clearInterval(this.intervalId);
  }
}
