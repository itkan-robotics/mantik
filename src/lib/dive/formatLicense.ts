/** Human-readable license line for cached GitHub backdrop repos. */
export function formatDiveLicense(license: string | null | undefined): string {
  if (!license || license === 'NOASSERTION') {
    return 'see repository on GitHub';
  }
  return license;
}
