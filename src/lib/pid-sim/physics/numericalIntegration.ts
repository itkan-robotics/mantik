/** 2-state vector for elevator [position, velocity]. */
export type Vec2 = [number, number];

export function vecAdd(a: Vec2, b: Vec2): Vec2 {
  return [a[0] + b[0], a[1] + b[1]];
}

export function vecScale(s: number, a: Vec2): Vec2 {
  return [s * a[0], s * a[1]];
}

export function vecNorm(a: Vec2): number {
  return Math.hypot(a[0], a[1]);
}

/** Dormand-Prince 5(4) coefficients — WPILib NumericalIntegration. */
const A5 = [
  35 / 384,
  0,
  500 / 1113,
  125 / 192,
  -2187 / 6784,
  11 / 84,
] as const;

const B1 = [35 / 384, 0, 500 / 1113, 125 / 192, -2187 / 6784, 11 / 84, 0] as const;
const B2 = [
  5179 / 57600,
  0,
  7571 / 16695,
  393 / 640,
  -92097 / 339200,
  187 / 2100,
  1 / 40,
] as const;

/**
 * Adaptive Dormand-Prince integration of dx/dt = f(x, u) — port of WPILib rkdp.
 */
export function rkdp(
  f: (x: Vec2, u: number) => Vec2,
  x: Vec2,
  u: number,
  dt: number,
  maxError = 1e-6,
): Vec2 {
  let y = x;
  let dtElapsed = 0;
  let h = dt;

  while (dtElapsed < dt) {
    h = Math.min(h, dt - dtElapsed);

    let newY: Vec2;
    let truncationError: number;

    do {
      h = Math.min(h, dt - dtElapsed);

      const k1 = f(y, u);
      const k2 = f(vecAdd(y, vecScale(h / 5, k1)), u);
      const k3 = f(vecAdd(y, vecScale(h, vecAdd(vecScale(3 / 40, k1), vecScale(9 / 40, k2)))), u);
      const k4 = f(
        vecAdd(
          y,
          vecScale(h, vecAdd(vecScale(44 / 45, k1), vecAdd(vecScale(-56 / 15, k2), vecScale(32 / 9, k3)))),
        ),
        u,
      );
      const k5 = f(
        vecAdd(
          y,
          vecScale(
            h,
            vecAdd(
              vecScale(19372 / 6561, k1),
              vecAdd(
                vecScale(-25360 / 2187, k2),
                vecAdd(vecScale(64448 / 6561, k3), vecScale(-212 / 729, k4)),
              ),
            ),
          ),
        ),
        u,
      );
      const k6 = f(
        vecAdd(
          y,
          vecScale(
            h,
            vecAdd(
              vecScale(9017 / 3168, k1),
              vecAdd(
                vecScale(-355 / 33, k2),
                vecAdd(
                  vecScale(46732 / 5247, k3),
                  vecAdd(vecScale(49 / 176, k4), vecScale(-5103 / 18656, k5)),
                ),
              ),
            ),
          ),
        ),
        u,
      );

      newY = vecAdd(
        y,
        vecScale(
          h,
          vecAdd(
            vecScale(A5[0], k1),
            vecAdd(
              vecScale(A5[2], k3),
              vecAdd(
                vecScale(A5[3], k4),
                vecAdd(vecScale(A5[4], k5), vecScale(A5[5], k6)),
              ),
            ),
          ),
        ),
      );

      const k7 = f(newY, u);

      const errVec = vecScale(h, vecAdd(
        vecScale(B1[0] - B2[0], k1),
        vecAdd(
          vecScale(B1[1] - B2[1], k2),
          vecAdd(
            vecScale(B1[2] - B2[2], k3),
            vecAdd(
              vecScale(B1[3] - B2[3], k4),
              vecAdd(
                vecScale(B1[4] - B2[4], k5),
                vecAdd(vecScale(B1[5] - B2[5], k6), vecScale(B1[6] - B2[6], k7)),
              ),
            ),
          ),
        ),
      ));
      truncationError = vecNorm(errVec);

      if (truncationError === 0) break;
      h *= 0.9 * Math.pow(maxError / truncationError, 1 / 5);
    } while (truncationError > maxError);

    dtElapsed += h;
    y = newY;
  }

  return y;
}
