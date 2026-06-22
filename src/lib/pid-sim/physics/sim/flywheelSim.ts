/**
 * Flywheel sim — ported from controls_js_sim sim/flywheel-sim.js.
 * Velocity PID in motor rot/s; TraceView / mechanism display in wheel RPM.
 */
import type { FlywheelPlantConfig, SimSample, TuningConfig, Vendor } from '../../types';
import {
  DEFAULT_FLYWHEEL_SETPOINT_ROT_PER_SEC,
  REFERENCE_FLYWHEEL_PLANT,
} from '../../reference/flywheelReference';
import { motorForVendor } from '../vendorMotor';
import {
  maxMotorRotPerSec,
  motorRotPerSecToWheelRpm,
  wheelRadPerSecToWheelRpm,
} from '../units/flywheelUnits';
import { FlywheelPlant, PLANT_DT } from '../plant/flywheelPlant';
import { DelayLine } from '../utils/delayLine';

export const SIM_DT = 0.02;
export const PLANT_STEPS_PER_CONTROLLER = Math.round(SIM_DT / PLANT_DT);
const BUFFER_SECONDS = 5;
export const MAX_SAMPLES = Math.ceil(BUFFER_SECONDS / SIM_DT);
const MAX_MOTOR_VOLTAGE = 12;
const DELAY_SAMPLES = 13;

const GAIN_KEYS: (keyof Pick<TuningConfig, 'kP' | 'kI' | 'kD' | 'kS' | 'kV'>)[] = [
  'kP',
  'kI',
  'kD',
  'kS',
  'kV',
];

type SimListener = () => void;

export class FlywheelSim {
  position = 0;
  velocity = 0;
  setpoint = 0;
  private integral = 0;
  private previousVelocityError = 0;
  private simTime = 0;
  private samples: SimSample[] = [];
  private running = false;
  private config: TuningConfig | null = null;
  private enabled = false;
  private plantConfig: FlywheelPlantConfig;
  private vendor: Vendor;
  private plant: FlywheelPlant;
  private delayLine: DelayLine;
  private inputVolts = 0;
  private listeners = new Set<SimListener>();
  private intervalId?: number;
  private latestSample: SimSample | null = null;

  constructor(vendor: Vendor = 'rev', plant: FlywheelPlantConfig = REFERENCE_FLYWHEEL_PLANT) {
    this.vendor = vendor;
    this.plantConfig = plant;
    this.plant = new FlywheelPlant(motorForVendor(vendor), plant);
    this.delayLine = new DelayLine(DELAY_SAMPLES, 0);
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
    this.plant = new FlywheelPlant(motorForVendor(vendor), this.plantConfig);
    this.reset();
  }

  setPlant(plant: FlywheelPlantConfig): void {
    this.plantConfig = plant;
    this.plant = new FlywheelPlant(motorForVendor(this.vendor), plant);
    this.reset();
  }

  /** Estimated kV at 1 motor rot/s for current vendor + plant. */
  getHoldVoltageHint(): number {
    return this.plant.estimateVoltageForMotorRotPerSec(1);
  }

  setConfig(config: TuningConfig): void {
    const gainsChanged =
      this.config !== null && GAIN_KEYS.some((k) => this.config![k] !== config[k]);
    if (gainsChanged) {
      this.integral = 0;
      this.previousVelocityError = 0;
    }
    this.config = config;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  reset(): void {
    this.plant.reset();
    this.integral = 0;
    this.previousVelocityError = 0;
    this.simTime = 0;
    this.samples = [];
    this.latestSample = null;
    this.inputVolts = 0;
    this.position = 0;
    this.velocity = 0;
    this.setpoint = motorRotPerSecToWheelRpm(
      this.config?.setpoint ?? DEFAULT_FLYWHEEL_SETPOINT_ROT_PER_SEC,
      this.plantConfig,
    );
    this.delayLine = new DelayLine(DELAY_SAMPLES, 0);
    this.notify();
  }

  private goalMotorRotPerSec(): number {
    const cfg = this.config!;
    let goal = Math.max(0, cfg.setpoint);
    if (cfg.maxVelocity > 0) goal = Math.min(goal, cfg.maxVelocity);
    goal = Math.min(goal, maxMotorRotPerSec(this.plantConfig));
    return goal;
  }

  private updateController(measuredMotorRotPerSec: number): number {
    const cfg = this.config!;
    const goal = this.goalMotorRotPerSec();
    const velocityError = goal - measuredMotorRotPerSec;

    this.integral += velocityError * SIM_DT;
    const derivativeError = (velocityError - this.previousVelocityError) / SIM_DT;

    const sign = goal > 0 ? 1 : 0;
    let controlEffortVolts =
      cfg.kS * sign +
      cfg.kV * goal +
      cfg.kP * velocityError +
      cfg.kI * this.integral +
      cfg.kD * derivativeError;

    controlEffortVolts = Math.max(
      -MAX_MOTOR_VOLTAGE,
      Math.min(MAX_MOTOR_VOLTAGE, controlEffortVolts),
    );
    this.previousVelocityError = velocityError;
    return controlEffortVolts;
  }

  getLatest(): SimSample | null {
    return this.latestSample;
  }

  getSamples(): readonly SimSample[] {
    return this.samples;
  }

  getPlantConfig(): FlywheelPlantConfig {
    return this.plantConfig;
  }

  step(): SimSample | null {
    if (!this.config || !this.enabled) return null;

    const measuredMotorRotPerSec = this.delayLine.getSample();
    this.inputVolts = this.updateController(measuredMotorRotPerSec);

    for (let i = 0; i < PLANT_STEPS_PER_CONTROLLER; i++) {
      this.plant.update(this.inputVolts);
      this.simTime += PLANT_DT;
      this.delayLine.addSample(this.plant.getMotorRotPerSec());
    }

    const goalMotor = this.goalMotorRotPerSec();
    this.position = this.plant.getWheelRevs();
    this.velocity = wheelRadPerSecToWheelRpm(this.plant.getWheelRadPerSec());
    this.setpoint = motorRotPerSecToWheelRpm(goalMotor, this.plantConfig);

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
    if (this.intervalId !== undefined) {
      window.clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }
}
