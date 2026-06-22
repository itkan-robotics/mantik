import { describe, expect, it } from 'vitest';
import { GOLDEN_SCENARIOS } from './goldenScenarios';
import {
  assertWithinTolerance,
  compareSamplesToGolden,
  computeTraceMetrics,
  loadGoldenCsv,
  runBrowserScenario,
} from './goldenTrace';

const POSITION_TOLERANCE = 0.1;
const METRIC_TOLERANCE = 0.1;

describe('golden trace validation vs WPILib reference', () => {
  for (const scenario of GOLDEN_SCENARIOS) {
    it(`${scenario.id} position trace within ${POSITION_TOLERANCE * 100}% of WPILib export`, () => {
      const golden = loadGoldenCsv(scenario.id);
      const browser = runBrowserScenario(scenario);
      compareSamplesToGolden(browser, golden, POSITION_TOLERANCE);
    });

    it(`${scenario.id} metrics within ${METRIC_TOLERANCE * 100}% of WPILib export`, () => {
      const golden = loadGoldenCsv(scenario.id);
      const browser = runBrowserScenario(scenario);
      const target = scenario.config.setpoint;

      const gMetrics = computeTraceMetrics(golden, target);
      const bMetrics = computeTraceMetrics(browser, target);

      assertWithinTolerance(
        bMetrics.finalPosition,
        gMetrics.finalPosition,
        METRIC_TOLERANCE,
        `${scenario.id} final position`,
      );
      assertWithinTolerance(
        bMetrics.peakOvershoot,
        gMetrics.peakOvershoot,
        METRIC_TOLERANCE,
        `${scenario.id} peak overshoot`,
      );

      if (gMetrics.settlingTimeSec !== null && bMetrics.settlingTimeSec !== null) {
        assertWithinTolerance(
          bMetrics.settlingTimeSec,
          gMetrics.settlingTimeSec,
          METRIC_TOLERANCE,
          `${scenario.id} settling time`,
        );
      }

      if (scenario.id === 'kg-hold') {
        assertWithinTolerance(
          bMetrics.holdDriftM,
          gMetrics.holdDriftM,
          0.5,
          `${scenario.id} hold drift`,
        );
        expect(bMetrics.holdDriftM).toBeLessThan(0.05);
      }
    });
  }
});
