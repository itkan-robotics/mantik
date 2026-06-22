/** Trapezoid motion profile — ported from controls_js_sim utils/trapezoid-profile.js */

export class ProfileConstraints {
  readonly maxVel: number;
  readonly maxAccel: number;

  constructor(maxVel: number, maxAccel: number) {
    this.maxVel = Math.max(maxVel, 1e-9);
    this.maxAccel = Math.max(maxAccel, 1e-9);
  }
}

export class ProfileState {
  pos: number;
  vel: number;
  accel: number;

  constructor(pos: number, vel: number, accel: number) {
    this.pos = pos;
    this.vel = vel;
    this.accel = accel;
  }
}

export class TrapezoidProfile {
  private readonly constraints: ProfileConstraints;
  private isFlipped = false;
  private currentState = new ProfileState(0, 0, 0);
  private goalState = new ProfileState(0, 0, 0);
  private initialState = new ProfileState(0, 0, 0);
  private endAccel = 0;
  private endFullSpeed = 0;
  private endDeccel = 0;

  constructor(constraints: ProfileConstraints) {
    this.constraints = constraints;
  }

  private assignDirection(input: ProfileState): ProfileState {
    if (!this.isFlipped) return new ProfileState(input.pos, input.vel, input.accel);
    return new ProfileState(-input.pos, -input.vel, -input.accel);
  }

  private shouldFlipAcceleration(initialState: ProfileState, goalState: ProfileState): boolean {
    return initialState.pos > goalState.pos;
  }

  init(initialState: ProfileState, goalState: ProfileState): void {
    this.isFlipped = this.shouldFlipAcceleration(initialState, goalState);
    this.currentState = this.assignDirection(initialState);
    this.initialState = this.assignDirection(initialState);
    this.goalState = this.assignDirection(goalState);

    if (this.currentState.vel > this.constraints.maxVel) {
      this.currentState.vel = this.constraints.maxVel;
    }

    const cutoffBeginTime = this.currentState.vel / this.constraints.maxAccel;
    const cutoffEndTime = goalState.vel / this.constraints.maxAccel;
    const accelTime = this.constraints.maxVel / this.constraints.maxAccel;

    const cutoffDistBegin =
      (cutoffBeginTime ** 2 * this.constraints.maxAccel) / 2;
    const cutoffDistEnd = (cutoffEndTime ** 2 * this.constraints.maxAccel) / 2;

    const fullTrapezoidDist =
      cutoffDistBegin + (goalState.pos - this.currentState.pos) + cutoffDistEnd;
    let fullSpeedDist =
      fullTrapezoidDist - accelTime ** 2 * this.constraints.maxAccel;

    let effectiveAccelTime = accelTime;
    if (fullSpeedDist < 0) {
      effectiveAccelTime = Math.sqrt(fullTrapezoidDist / this.constraints.maxAccel);
      fullSpeedDist = 0;
    }

    this.endAccel = effectiveAccelTime - cutoffBeginTime;
    this.endFullSpeed = this.endAccel + fullSpeedDist / this.constraints.maxVel;
    this.endDeccel = this.endFullSpeed + effectiveAccelTime - cutoffEndTime;
  }

  calculate(curTimeS: number, currentState: ProfileState): ProfileState {
    this.currentState = this.assignDirection(currentState);
    let result = new ProfileState(
      this.currentState.pos,
      this.currentState.vel,
      this.currentState.accel,
    );

    if (curTimeS < this.endAccel) {
      result.accel = this.constraints.maxAccel;
      result.vel = curTimeS * this.currentState.accel;
      result.pos =
        (this.initialState.vel + (curTimeS * this.currentState.accel) / 2) * curTimeS;
    } else if (curTimeS < this.endFullSpeed) {
      result.accel = 0;
      result.vel = this.constraints.maxVel;
      result.pos =
        (this.initialState.vel + (this.endAccel * this.constraints.maxAccel) / 2) *
          this.endAccel +
        this.constraints.maxVel * (curTimeS - this.endAccel);
    } else if (curTimeS <= this.endDeccel) {
      const timeLeft = this.endDeccel - curTimeS;
      result.accel = -this.constraints.maxAccel;
      result.vel = this.goalState.vel + timeLeft * this.constraints.maxAccel;
      result.pos =
        this.goalState.pos -
        (this.goalState.vel + (timeLeft * this.constraints.maxAccel) / 2) * timeLeft;
    } else {
      result = new ProfileState(this.goalState.pos, this.goalState.vel, 0);
    }

    return this.assignDirection(result);
  }
}
