import type { FlywheelPlantConfig, LintMessage, ParseResult, TuningConfig, Vendor } from '../types';
import { DEFAULT_TUNING } from '../types';
import { flywheelTuningWarnings } from '../reference/flywheelReference';
import { parseFlywheelPlantConfig } from './flywheelPlantParser';
import { revFlywheelTemplate } from '../templates/revFlywheel';
import { ctreFlywheelTemplate } from '../templates/ctreFlywheel';
import { revFlywheelRobotTemplate } from '../templates/revFlywheelRobot';
import { ctreFlywheelRobotTemplate } from '../templates/ctreFlywheelRobot';

const CONST_PATTERN =
  /private\s+static\s+final\s+double\s+(kP|kI|kD|kS|kG|kV|kA|kMaxVelocity|kMaxAccel|kSetpoint)\s*=\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*;/g;

function findLineColumn(source: string, index: number): { line: number; column: number } {
  const before = source.slice(0, index);
  const lines = before.split('\n');
  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 };
}

function parseConstants(source: string): { config: Partial<TuningConfig>; missing: string[] } {
  const partial: Partial<TuningConfig> = {};
  const found = new Set<string>();

  let match: RegExpExecArray | null;
  CONST_PATTERN.lastIndex = 0;
  while ((match = CONST_PATTERN.exec(source)) !== null) {
    const name = match[1];
    const value = parseFloat(match[2]);
    found.add(name);
    switch (name) {
      case 'kP':
        partial.kP = value;
        break;
      case 'kI':
        partial.kI = value;
        break;
      case 'kD':
        partial.kD = value;
        break;
      case 'kS':
        partial.kS = value;
        break;
      case 'kG':
        partial.kG = value;
        break;
      case 'kV':
        partial.kV = value;
        break;
      case 'kA':
        partial.kA = value;
        break;
      case 'kMaxVelocity':
        partial.maxVelocity = value;
        break;
      case 'kMaxAccel':
        partial.maxAccel = value;
        break;
      case 'kSetpoint':
        partial.setpoint = value;
        break;
    }
  }

  const required = ['kP', 'kI', 'kD', 'kS', 'kG', 'kV', 'kA', 'kMaxVelocity', 'kMaxAccel', 'kSetpoint'];
  const missing = required.filter((key) => !found.has(key));
  return { config: partial, missing };
}

function bracketBalanceErrors(source: string): LintMessage[] {
  const errors: LintMessage[] = [];
  let depth = 0;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth < 0) {
        const pos = findLineColumn(source, i);
        errors.push({
          line: pos.line,
          column: pos.column,
          message: 'Unexpected closing brace',
          severity: 'error',
        });
        depth = 0;
      }
    }
  }
  if (depth > 0) {
    errors.push({
      line: source.split('\n').length,
      column: 1,
      message: `Missing ${depth} closing brace(s)`,
      severity: 'error',
    });
  }
  return errors;
}

export function parseFlywheelCode(source: string, _vendor: Vendor): ParseResult {
  const errors: LintMessage[] = [...bracketBalanceErrors(source)];
  const { config: partial, missing } = parseConstants(source);

  if (missing.length > 0) {
    errors.push({
      line: 1,
      column: 1,
      message: `Missing tuning constants: ${missing.join(', ')}`,
      severity: 'error',
    });
  }

  if (partial.kP !== undefined && (partial.kP < 0 || partial.kP > 0.2)) {
    errors.push({
      line: 1,
      column: 1,
      message: 'kP for velocity is usually very small (0 to ~0.05 V/(rot/s))',
      severity: 'warning',
    });
  }

  if (partial.setpoint !== undefined && partial.setpoint < 0) {
    errors.push({
      line: 1,
      column: 1,
      message: 'Velocity setpoint should be zero or positive (motor rot/s)',
      severity: 'warning',
    });
  }

  const hasErrors = errors.some((e) => e.severity === 'error') || missing.length > 0;

  const configForWarnings: TuningConfig | null = hasErrors
    ? null
    : {
        kP: partial.kP ?? DEFAULT_TUNING.kP,
        kI: partial.kI ?? DEFAULT_TUNING.kI,
        kD: partial.kD ?? DEFAULT_TUNING.kD,
        kS: partial.kS ?? DEFAULT_TUNING.kS,
        kG: partial.kG ?? DEFAULT_TUNING.kG,
        kV: partial.kV ?? DEFAULT_TUNING.kV,
        kA: partial.kA ?? DEFAULT_TUNING.kA,
        maxVelocity: partial.maxVelocity ?? DEFAULT_TUNING.maxVelocity,
        maxAccel: partial.maxAccel ?? DEFAULT_TUNING.maxAccel,
        setpoint: partial.setpoint ?? DEFAULT_TUNING.setpoint,
      };

  if (configForWarnings) {
    const plant = parseFlywheelPlantConfig(source);
    for (const msg of flywheelTuningWarnings(configForWarnings, plant)) {
      errors.push({ line: 1, column: 1, message: msg, severity: 'warning' });
    }
  }

  const config: TuningConfig | null = hasErrors ? null : configForWarnings;

  return { config, errors };
}

export { patchConstant, findConstLine } from './elevatorParser';

export function getFlywheelTemplateForVendor(
  vendor: Vendor,
  config: TuningConfig,
  plant: FlywheelPlantConfig,
): string {
  return vendor === 'rev' ? revFlywheelTemplate(config, plant) : ctreFlywheelTemplate(config, plant);
}

export function getFlywheelRobotTemplateForVendor(vendor: Vendor): string {
  return vendor === 'rev' ? revFlywheelRobotTemplate() : ctreFlywheelRobotTemplate();
}
