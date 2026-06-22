import { Suspense, lazy, useEffect, useState } from 'react';
import PidSimLanding from './PidSimLanding';
import { preloadPhysicsOnIdle } from '@/lib/pid-sim/preloadPhysics';
import type { MechanismType, Vendor } from '@/lib/pid-sim/types';

const PidSimWorkspace = lazy(() => import('./PidSimWorkspace'));

interface Session {
  mechanism: MechanismType;
  vendor: Vendor;
}

function SimulationLoading() {
  return (
    <div className="pid-sim-app pid-sim-landing">
      <div className="lesson-content">
        <p className="pid-editor-loading">Loading simulation…</p>
      </div>
    </div>
  );
}

export default function PidSimApp() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    preloadPhysicsOnIdle();
  }, []);

  if (!session) {
    return <PidSimLanding onStart={(mechanism, vendor) => setSession({ mechanism, vendor })} />;
  }

  return (
    <Suspense fallback={<SimulationLoading />}>
      <PidSimWorkspace
        mechanism={session.mechanism}
        vendor={session.vendor}
        onExit={() => setSession(null)}
      />
    </Suspense>
  );
}
