/** Warm-cache physics chunks during landing idle time. */
export function preloadPhysicsOnIdle(): void {
  const preload = () => {
    void import('@/lib/pid-sim/physics/elevatorSim');
    void import('@/lib/pid-sim/physics/armSim');
  };
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(preload, { timeout: 2000 });
  } else {
    setTimeout(preload, 200);
  }
}
