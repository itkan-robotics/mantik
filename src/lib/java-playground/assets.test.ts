import { describe, expect, it } from 'vitest';
import { cheerpjAppPath, ECJ_FILENAME, playgroundPublicUrl, siteBasePath } from './assets';
import { JavaRunCancelledError, timeoutMessage } from './constants';
import { isRunPhaseStatus } from './protocol';

describe('playground assets', () => {
  it('names the versioned ECJ jar', () => {
    expect(ECJ_FILENAME).toBe('ecj-3.46.100.jar');
  });

  it('builds same-origin and CheerpJ /app paths', () => {
    const base = siteBasePath();
    expect(playgroundPublicUrl(ECJ_FILENAME)).toBe(`${base}/java-playground/${ECJ_FILENAME}`);
    expect(cheerpjAppPath(ECJ_FILENAME)).toBe(`/app${base}/java-playground/${ECJ_FILENAME}`);
  });
});

describe('run timeout helpers', () => {
  it('formats the stop message in seconds', () => {
    expect(timeoutMessage(20_000)).toBe('Program stopped after 20 s');
  });

  it('names cancelled errors', () => {
    expect(new JavaRunCancelledError().name).toBe('JavaRunCancelledError');
  });

  it('treats Running and Checking as the timed run phase', () => {
    expect(isRunPhaseStatus('Running…')).toBe(true);
    expect(isRunPhaseStatus('Checking 2 of 3…')).toBe(true);
    expect(isRunPhaseStatus('Compiling…')).toBe(false);
    expect(isRunPhaseStatus('Loading Java runtime… 40%')).toBe(false);
  });
});
