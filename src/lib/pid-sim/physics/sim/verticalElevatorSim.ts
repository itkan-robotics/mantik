/**
 * Vertical elevator sim — ported from controls_js_sim sim/vertical-elevator-sim.js.
 * PID runs in motor rotations; plant + TraceView display in meters.
 * Trapezoid profiling follows WPILib incremental calculate(dt, current, goal).
 */
import type { PlantConfig, SimSample, TuningConfig, Vendor } from '../../types';
import { REFERENCE_PLANT } from '../../reference/elevatorReference';
import { motorForVendor } from '../vendorMotor';
import {
  heightMToMotorRotations,
  linearMps2ToRotPerSec2,
  linearMpsToRotPerSec,
  motorRotationsToHeightM,
  rotPerSec2ToLinearMps2,
  rotPerSecToLinearMps,
} from '../units/encoderUnits';
import { VerticalElevatorPlant, PLANT_DT } from '../plant/verticalElevatorPlant';
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

export class ElevatorSim {
  position = REFERENCE_PLANT.startHeightM;
  velocity = 0;
  setpoint = REFERENCE_PLANT.startHeightM;
  private integral = 0;
  private previousPositionError = 0;
  private simTime = 0;
  private samples: SimSample[] = [];
  private running = false;
  private config: TuningConfig | null = null;
  private enabled = false;
  private plantConfig: PlantConfig;
  private vendor: Vendor;
  private plant: VerticalElevatorPlant;
  private profile: TrapezoidProfile;
  private profileSetpoint = new ProfileState(REFERENCE_PLANT.startHeightM, 0, 0);
  private goalHeightM = REFERENCE_PLANT.startHeightM;
  private delayLine: DelayLine;
  private inputVolts = 0;
  private listeners = new Set<SimListener>();
  private intervalId?: number;
  private latestSample: SimSample | null = null;
  private lastSetpointRot = 0;

  constructor(vendor: Vendor = 'rev', plant: PlantConfig = REFERENCE_PLANT) {
    this.vendor = vendor;
    this.plantConfig = plant;
    this.plant = new VerticalElevatorPlant(motorForVendor(vendor), plant);
    this.position = plant.startHeightM;
    this.setpoint = plant.startHeightM;
    this.goalHeightM = plant.startHeightM;
    this.profile = new TrapezoidProfile(this.profileConstraints(null));
    const startRot = heightMToMotorRotations(plant.startHeightM, plant);
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
    this.plant = new VerticalElevatorPlant(motorForVendor(vendor), this.plantConfig);
    this.reset();
  }

  setPlant(plant: PlantConfig): void {
    this.plantConfig = plant;
    this.plant = new VerticalElevatorPlant(motorForVendor(this.vendor), plant);
    this.plant.setLimits(plant.minHeightM, plant.maxHeightM);
    this.reset();
  }

  /** Steady-state kG hint for current vendor + plant. */
  getHoldVoltageHint(): number {
    return this.plant.getHoldVoltage();
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
    this.goalHeightM = motorRotationsToHeightM(config.setpoint, this.plantConfig);
    this.setpoint = this.goalHeightM;

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
    this.plant.reset(this.plantConfig.startHeightM);
    this.position = this.plantConfig.startHeightM;
    this.velocity = 0;
    this.integral = 0;
    this.previousPositionError = 0;
    this.simTime = 0;
    this.inputVolts = 0;
    this.samples = [];
    this.latestSample = null;

    const startRot = heightMToMotorRotations(this.plantConfig.startHeightM, this.plantConfig);
    this.delayLine.reset(startRot);

    if (this.config) {
      this.goalHeightM = motorRotationsToHeightM(this.config.setpoint, this.plantConfig);
      this.lastSetpointRot = this.config.setpoint;
      this.profile = new TrapezoidProfile(this.profileConstraints(this.config));
    } else {
      this.goalHeightM = this.plantConfig.startHeightM;
      this.lastSetpointRot = startRot;
    }
    this.setpoint = this.goalHeightM;
    this.syncProfileSetpointFromPlant();
    this.notify();
  }

  private syncProfileSetpointFromPlant(): void {
    this.profileSetpoint = new ProfileState(this.position, this.velocity, 0);
  }

  private profileConstraints(cfg: TuningConfig | null): ProfileConstraints {
    if (!cfg || this.isProfilingDisabled(cfg)) {
      return new ProfileConstraints(NO_PROFILE_LIMIT, NO_PROFILE_LIMIT);
    }
    const maxVelMps =
      cfg.maxVelocity > 0
        ? rotPerSecToLinearMps(cfg.maxVelocity, this.plantConfig)
        : NO_PROFILE_LIMIT;
    const maxAccelMps2 =
      cfg.maxAccel > 0
        ? rotPerSec2ToLinearMps2(cfg.maxAccel, this.plantConfig)
        : NO_PROFILE_LIMIT;
    return new ProfileConstraints(maxVelMps, maxAccelMps2);
  }

  private updateProfileSetpoint(): void {
    const goal = new ProfileState(this.goalHeightM, 0, 0);
    if (this.isProfilingDisabled()) {
      this.profileSetpoint = goal;
    } else {
      this.profileSetpoint = this.profile.calculate(SIM_DT, this.profileSetpoint, goal);
    }
  }

  private updateController(setpoint: ProfileState, measuredRot: number): number {
    const cfg = this.config!;
    const setpointRot = heightMToMotorRotations(setpoint.pos, this.plantConfig);
    const setpointVelRot = linearMpsToRotPerSec(setpoint.vel, this.plantConfig);
    const setpointAccelRot = linearMps2ToRotPerSec2(setpoint.accel, this.plantConfig);

    const positionError = setpointRot - measuredRot;
    this.integral += positionError * SIM_DT;
    const derivativeError = (positionError - this.previousPositionError) / SIM_DT;

    const sign = setpointVelRot !== 0 ? Math.sign(setpointVelRot) : 0;
    let controlEffortVolts =
      cfg.kG +
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

  getPlantConfig(): PlantConfig {
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
      const posM = this.plant.getPositionM();
      const rot = heightMToMotorRotations(posM, this.plantConfig);
      this.delayLine.addSample(rot);
    }

    this.position = this.plant.getPositionM();
    this.velocity = this.plant.getVelocityMps();
    this.setpoint = this.profileSetpoint.pos;

    const sample: SimSample = {
      time: this.simTime,
      position: this.position,
      velocity: this.velocity,
      setpoint: this.profileSetpoint.pos,
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
