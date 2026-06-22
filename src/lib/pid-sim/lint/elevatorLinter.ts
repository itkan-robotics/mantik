import type { LintMessage, TuningConfig, Vendor } from '../types';
import { parseElevatorCode } from '../parser/elevatorParser';

export function lintElevatorCode(source: string, vendor: Vendor): LintMessage[] {
  const { errors } = parseElevatorCode(source, vendor);
  return errors;
}

export function configFromCode(source: string, vendor: Vendor): TuningConfig | null {
  return parseElevatorCode(source, vendor).config;
}
