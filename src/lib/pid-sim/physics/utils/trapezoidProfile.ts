/**
 * Trapezoid motion profile — WPILib TrapezoidProfile incremental API.
 * @see https://github.wpilib.org/allwpilib/docs/release/java/src-html/edu/wpi/first/math/trajectory/TrapezoidProfile.html
 */

export class ProfileConstraints {
  readonly maxVel: number;
  readonly maxAccel: number;

  constructor(maxVel: number, maxAccel: number) {
    if (maxVel < 0 || maxAccel < 0) {
      throw new Error('Constraints must be non-negative');
    }
    this.maxVel = maxVel;
    this.maxAccel = maxAccel;
  }
}

export class ProfileState {
  pos: number;
  vel: number;
  /** Phase acceleration for kA feedforward (not in WPILib State). */
  accel: number;

  constructor(pos: number, vel: number, accel = 0) {
    this.pos = pos;
    this.vel = vel;
    this.accel = accel;
  }
}

export class TrapezoidProfile {
  private readonly constraints: ProfileConstraints;

  constructor(constraints: ProfileConstraints) {
    this.constraints = constraints;
  }

  /**
   * Advance from current toward goal over duration dt (one controller period).
   * Recomputes the profile from current each call so goals can change every tick.
   */
  calculate(dt: number, current: ProfileState, goal: ProfileState): ProfileState {
    const direction = current.pos > goal.pos ? -1 : 1;
    let mCurrent = this.direct(current, direction);
    const mGoal = this.direct(goal, direction);

    if (Math.abs(mCurrent.vel) > this.constraints.maxVel) {
      mCurrent = new ProfileState(
        mCurrent.pos,
        Math.sign(mCurrent.vel) * this.constraints.maxVel,
        mCurrent.accel,
      );
    }

    const { maxVel, maxAccel } = this.constraints;

    const cutoffBegin = mCurrent.vel / maxAccel;
    const cutoffDistBegin = (cutoffBegin * cutoffBegin * maxAccel) / 2;

    const cutoffEnd = mGoal.vel / maxAccel;
    const cutoffDistEnd = (cutoffEnd * cutoffEnd * maxAccel) / 2;

    const fullTrapezoidDist = cutoffDistBegin + (mGoal.pos - mCurrent.pos) + cutoffDistEnd;
    let accelerationTime = maxVel / maxAccel;

    let fullSpeedDist = fullTrapezoidDist - accelerationTime * accelerationTime * maxAccel;

    if (fullSpeedDist < 0) {
      accelerationTime = Math.sqrt(fullTrapezoidDist / maxAccel);
      fullSpeedDist = 0;
    }

    const endAccel = accelerationTime - cutoffBegin;
    const endFullSpeed = endAccel + fullSpeedDist / maxVel;
    const endDecel = endFullSpeed + accelerationTime - cutoffEnd;

    let phaseAccel = 0;
    let result: ProfileState;

    if (dt < endAccel) {
      phaseAccel = maxAccel;
      result = new ProfileState(
        mCurrent.pos + (mCurrent.vel + (dt * maxAccel) / 2) * dt,
        mCurrent.vel + dt * maxAccel,
        0,
      );
    } else if (dt < endFullSpeed) {
      phaseAccel = 0;
      result = new ProfileState(
        mCurrent.pos +
          (mCurrent.vel + (endAccel * maxAccel) / 2) * endAccel +
          maxVel * (dt - endAccel),
        maxVel,
        0,
      );
    } else if (dt <= endDecel) {
      phaseAccel = -maxAccel;
      const timeLeft = endDecel - dt;
      result = new ProfileState(
        mGoal.pos - (mGoal.vel + (timeLeft * maxAccel) / 2) * timeLeft,
        mGoal.vel + timeLeft * maxAccel,
        0,
      );
    } else {
      result = new ProfileState(mGoal.pos, mGoal.vel, 0);
    }

    result.accel = phaseAccel * direction;
    return this.direct(result, direction);
  }

  private direct(state: ProfileState, direction: number): ProfileState {
    return new ProfileState(state.pos * direction, state.vel * direction, state.accel * direction);
  }
}
