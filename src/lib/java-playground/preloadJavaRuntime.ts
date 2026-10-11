/** Start CheerpJ in a worker as soon as the lesson hydrates. */
export function preloadJavaRuntimeSoon(onStatus?: (message: string) => void): void {
  void import('./cheerpjRunner').then((mod) => {
    void mod.preloadJavaRuntime(onStatus);
    if (typeof window !== 'undefined') {
      (window as unknown as { __jpDumpResources?: typeof mod.dumpCheerpjResources }).__jpDumpResources =
        mod.dumpCheerpjResources;
    }
  });
}
