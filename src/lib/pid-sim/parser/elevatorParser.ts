import type { LintMessage, ParseResult, PlantConfig, TuningConfig, Vendor } from '../types';
import { DEFAULT_TUNING } from '../types';
import { tuningWarnings } from '../reference/elevatorReference';
import { revElevatorTemplate } from '../templates/revElevator';
import { ctreElevatorTemplate } from '../templates/ctreElevator';
import { revRobotTemplate } from '../templates/revRobot';
import { ctreRobotTemplate } from '../templates/ctreRobot';

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

export function parseElevatorCode(source: string, vendor: Vendor): ParseResult {
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

  if (partial.kP !== undefined && (partial.kP < 0 || partial.kP > 300)) {
    errors.push({
      line: 1,
      column: 1,
      message: 'kP should be between 0 and 300 V/rot for this exercise',
      severity: 'warning',
    });
  }

  if (partial.kG !== undefined && (partial.kG < 0 || partial.kG > 20)) {
    errors.push({
      line: 1,
      column: 1,
      message: 'kG should be between 0 and 20 for this exercise',
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
    for (const msg of tuningWarnings(configForWarnings, vendor)) {
      errors.push({ line: 1, column: 1, message: msg, severity: 'warning' });
    }
  }

  const config: TuningConfig | null = hasErrors ? null : configForWarnings;

  return { config, errors };
}

export function patchConstant(source: string, name: string, value: number): string {
  const pattern = new RegExp(
    `(private\\s+static\\s+final\\s+double\\s+${name}\\s*=\\s*)([-+]?\\d*\\.?\\d+(?:[eE][-+]?\\d+)?)(\\s*;)`,
    'g',
  );
  if (!pattern.test(source)) return source;
  pattern.lastIndex = 0;
  return source.replace(pattern, `$1${value}$3`);
}

export function getTemplateForVendor(vendor: Vendor, config: TuningConfig, plant: PlantConfig): string {
  return vendor === 'rev' ? revElevatorTemplate(config, plant) : ctreElevatorTemplate(config, plant);
}

export function getRobotTemplateForVendor(vendor: Vendor): string {
  return vendor === 'rev' ? revRobotTemplate() : ctreRobotTemplate();
}

/** Find 1-based line number of a constant declaration in subsystem code. */
export function findConstLine(source: string, constName: string): number | null {
  const pattern = new RegExp(
    `private\\s+static\\s+final\\s+double\\s+${constName}\\s*=`,
  );
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) return i + 1;
  }
  return null;
}
