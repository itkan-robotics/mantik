export type GuidePrerequisite = 'teleop' | 'liveTuning' | 'simRunning' | 'validCode';

export interface PrerequisiteState {
  teleopEnabled: boolean;
  liveTuning: boolean;
  simRunning: boolean;
  codeValid: boolean;
}

const LABELS: Record<GuidePrerequisite, string> = {
  teleop: 'Enable Teleoperated in Sim Controls',
  liveTuning: 'Enable Live Tuning in Sim Controls',
  simRunning: 'Run the simulation',
  validCode: 'Fix code errors',
};

export function unmetPrerequisites(
  required: GuidePrerequisite[] | undefined,
  state: PrerequisiteState,
): string[] {
  if (!required?.length) return [];
  const unmet: string[] = [];
  for (const req of required) {
    switch (req) {
      case 'teleop':
        if (!state.teleopEnabled) unmet.push(LABELS.teleop);
        break;
      case 'liveTuning':
        if (!state.liveTuning) unmet.push(LABELS.liveTuning);
        break;
      case 'simRunning':
        if (!state.simRunning) unmet.push(LABELS.simRunning);
        break;
      case 'validCode':
        if (!state.codeValid) unmet.push(LABELS.validCode);
        break;
    }
  }
  return unmet;
}
