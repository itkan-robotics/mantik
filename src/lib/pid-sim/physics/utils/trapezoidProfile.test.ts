import { describe, expect, it } from 'vitest';
import { ProfileConstraints, ProfileState, TrapezoidProfile } from './trapezoidProfile';

const DT = 0.02;

function integrate(
  profile: TrapezoidProfile,
  start: ProfileState,
  goal: ProfileState,
  seconds: number,
): ProfileState {
  let state = start;
  const steps = Math.ceil(seconds / DT);
  for (let i = 0; i < steps; i++) {
    state = profile.calculate(DT, state, goal);
  }
  return state;
}

describe('TrapezoidProfile', () => {
  it('reaches a distant goal with trapezoidal velocity', () => {
    const profile = new TrapezoidProfile(new ProfileConstraints(2, 4));
    const start = new ProfileState(0, 0);
    const goal = new ProfileState(5, 0);

    let state = start;
    let peakVel = 0;
    for (let i = 0; i < 500; i++) {
      state = profile.calculate(DT, state, goal);
      peakVel = Math.max(peakVel, Math.abs(state.vel));
      if (Math.abs(state.pos - goal.pos) < 1e-6 && Math.abs(state.vel) < 1e-6) break;
    }

    expect(state.pos).toBeCloseTo(5, 3);
    expect(state.vel).toBeCloseTo(0, 3);
    expect(peakVel).toBeCloseTo(2, 2);
  });

  it('uses triangle profile when distance is too short for cruise', () => {
    const profile = new TrapezoidProfile(new ProfileConstraints(10, 2));
    const start = new ProfileState(0, 0);
    const goal = new ProfileState(0.5, 0);

    const end = integrate(profile, start, goal, 3);
    expect(end.pos).toBeCloseTo(0.5, 3);
    expect(end.vel).toBeCloseTo(0, 3);
  });

  it('moves downward when goal is below current', () => {
    const profile = new TrapezoidProfile(new ProfileConstraints(1, 2));
    const start = new ProfileState(2, 0);
    const goal = new ProfileState(0.5, 0);

    const end = integrate(profile, start, goal, 5);
    expect(end.pos).toBeCloseTo(0.5, 3);
    expect(end.pos).toBeLessThan(start.pos);
  });

  it('reports positive accel during acceleration phase', () => {
    const profile = new TrapezoidProfile(new ProfileConstraints(2, 4));
    const start = new ProfileState(0, 0);
    const goal = new ProfileState(5, 0);

    const first = profile.calculate(DT, start, goal);
    expect(first.accel).toBeGreaterThan(0);
    expect(first.pos).toBeGreaterThan(0);
  });

  it('does not move when already at goal', () => {
    const profile = new TrapezoidProfile(new ProfileConstraints(2, 4));
    const atGoal = new ProfileState(1.5, 0);
    const goal = new ProfileState(1.5, 0);

    const next = profile.calculate(DT, atGoal, goal);
    expect(next.pos).toBeCloseTo(1.5, 6);
    expect(next.vel).toBeCloseTo(0, 6);
  });
});
