import type { ArmPlantConfig, SimSample, TuningConfig, Vendor } from '../types';

/** Shared surface for elevator and arm browser simulators. */
export interface PidMechanismSim {
  subscribe(listener: () => void): () => void;
  setConfig(config: TuningConfig): void;
  setEnabled(enabled: boolean): void;
  setVendor(vendor: Vendor): void;
  reset(): void;
  start(): void;
  stop(): void;
  step(): SimSample | null;
  getLatest(): SimSample | null;
  getSamples(): readonly SimSample[];
  getHoldVoltageHint(): number;
  isRunning(): boolean;
}
