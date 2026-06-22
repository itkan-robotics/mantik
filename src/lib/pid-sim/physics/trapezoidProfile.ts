/** Lightweight single-axis trapezoid setpoint generator (WPILib-style, fixed dt). */

export interface ProfileState {
  position: number;
  velocity: number;
  acceleration: number;
}

export function createProfileState(position: number): ProfileState {
  return { position, velocity: 0, acceleration: 0 };
}

/**
 * Advance profile toward goal with max velocity/acceleration.
 * When maxVelocity or maxAccel is 0, snap to goal (step setpoint — used for kG/kP tuning).
 */
export function stepTrapezoidProfile(
  state: ProfileState,
  goal: number,
  maxVelocity: number,
  maxAccel: number,
  dt: number,
): ProfileState {
  if (maxVelocity <= 0 || maxAccel <= 0) {
    return { position: goal, velocity: 0, acceleration: 0 };
  }

  const error = goal - state.position;
  const direction = Math.sign(error);
  const distance = Math.abs(error);

  // Slow down early enough to stop at goal without overshoot.
  const stoppingDistance = (state.velocity * state.velocity) / (2 * maxAccel);
  let desiredVelocity = direction * maxVelocity;
  if (distance <= stoppingDistance + 1e-9) {
    desiredVelocity = direction * Math.min(maxVelocity, Math.sqrt(2 * maxAccel * distance));
  }
  if (distance < 1e-6) {
    desiredVelocity = 0;
  }

  let acceleration = (desiredVelocity - state.velocity) / dt;
  acceleration = Math.max(-maxAccel, Math.min(maxAccel, acceleration));

  let velocity = state.velocity + acceleration * dt;
  if (Math.abs(velocity) > maxVelocity) {
    velocity = Math.sign(velocity) * maxVelocity;
  }

  let position = state.position + velocity * dt;

  // Clamp to goal when close — avoids limit-cycle chatter.
  if (Math.abs(goal - position) < 1e-4 && Math.abs(velocity) < 0.02) {
    return { position: goal, velocity: 0, acceleration: 0 };
  }

  // Do not pass through goal on this tick.
  if ((goal - state.position) * (goal - position) < 0) {
    return { position: goal, velocity: 0, acceleration: 0 };
  }

  return { position, velocity, acceleration };
}
