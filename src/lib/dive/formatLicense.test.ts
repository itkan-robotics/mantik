import { describe, expect, it } from 'vitest';
import { formatDiveLicense } from './formatLicense';

describe('formatDiveLicense', () => {
  it('maps NOASSERTION to friendly text', () => {
    expect(formatDiveLicense('NOASSERTION')).toBe('see repository on GitHub');
  });

  it('passes through known SPDX ids', () => {
    expect(formatDiveLicense('MIT')).toBe('MIT');
  });
});
