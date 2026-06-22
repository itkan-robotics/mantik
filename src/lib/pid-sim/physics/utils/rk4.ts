type State2 = readonly [number, number];

function addState(...states: State2[]): State2 {
  return states.reduce(
    (prev, cur) => [prev[0] + cur[0], prev[1] + cur[1]] as State2,
    [0, 0],
  );
}

function scaleState(scalar: number, state: State2): State2 {
  return [scalar * state[0], scalar * state[1]];
}

/** Second-order RK4 — ported from controls_js_sim utils/util.js */
export function secondOrderRK4(
  dState: (state: State2, inputVolts: number) => State2,
  state: State2,
  inputVolts: number,
  timestepS: number,
): State2 {
  const d1 = dState(state, inputVolts);
  const d2 = dState(addState(state, scaleState(0.5 * timestepS, d1)), inputVolts);
  const d3 = dState(addState(state, scaleState(0.5 * timestepS, d2)), inputVolts);
  const d4 = dState(addState(state, scaleState(timestepS, d3)), inputVolts);

  return addState(
    state,
    scaleState(timestepS / 6, addState(d1, scaleState(2, d2), scaleState(2, d3), d4)),
  );
}
