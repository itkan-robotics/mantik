/** Start CheerpJ in a worker as soon as the lesson hydrates. */
export function preloadJavaRuntimeSoon(): void {
  void import('./cheerpjRunner').then((mod) => {
    void mod.preloadJavaRuntime();
    if (typeof window !== 'undefined') {
      (window as unknown as { __jpDumpResources?: typeof mod.dumpCheerpjResources }).__jpDumpResources =
        mod.dumpCheerpjResources;
    }
  });
}
