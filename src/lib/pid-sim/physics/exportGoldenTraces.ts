/**
 * Writes WPILib-reference CSV traces. Run: npm run golden:export
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GOLDEN_SCENARIOS } from './goldenScenarios';
import { runWpilibReferenceScenario, samplesToCsv } from './wpilibReferenceRunner';
import { REFERENCE_PLANT } from '../reference/elevatorReference';

const GOLDEN_DIR = join(dirname(fileURLToPath(import.meta.url)), 'golden');
mkdirSync(GOLDEN_DIR, { recursive: true });

for (const scenario of GOLDEN_SCENARIOS) {
  const samples = runWpilibReferenceScenario(REFERENCE_PLANT, scenario.config, scenario.durationSec);
  const path = join(GOLDEN_DIR, `${scenario.id}.csv`);
  writeFileSync(path, samplesToCsv(samples), 'utf8');
  console.log(`Wrote ${path} (${samples.length} rows)`);
}

console.log(
  'Done. Prefer mantik-pid-practice GoldenTraceExportTest when Java/WPILib sim is available.',
);
