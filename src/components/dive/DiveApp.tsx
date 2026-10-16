import { useCallback, useEffect, useMemo, useState } from 'react';
import DiveLanding from './DiveLanding';
import DivePlay from './DivePlay';
import { dailySeedSuffix, hashString } from '@/lib/dive/seed';
import type { DivePromptPack, DiveRoster, DiveRosterTeam, DiveTeamMeta } from '@/lib/dive/types';

interface LoadedTeam {
  team: DiveRosterTeam;
  meta: DiveTeamMeta;
  source: string;
}

export default function DiveApp() {
  const [roster, setRoster] = useState<DiveRoster | null>(null);
  const [pack, setPack] = useState<DivePromptPack | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [inPlay, setInPlay] = useState(false);
  const [loadedTeam, setLoadedTeam] = useState<LoadedTeam | null>(null);
  const [teamLoading, setTeamLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rosterRes, packRes] = await Promise.all([
          fetch('/data/dive/team-roster.json'),
          fetch('/data/dive/prompts-frc.json'),
        ]);
        if (!rosterRes.ok || !packRes.ok) {
          throw new Error('Trenches data missing. Run npm run fetch:dive-teams.');
        }
        const rosterJson = (await rosterRes.json()) as DiveRoster;
        const packJson = (await packRes.json()) as DivePromptPack;
        if (!cancelled) {
          setRoster(rosterJson);
          setPack(packJson);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Failed to load Trenches data');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dailyTeam = useMemo(() => {
    if (!roster?.teams.length) return null;
    const idx = hashString(dailySeedSuffix()) % roster.teams.length;
    return roster.teams[idx] ?? null;
  }, [roster]);

  const loadBackdrop = useCallback(
    async (teamNumber: number) => {
      const team = roster?.teams.find((t) => t.teamNumber === teamNumber);
      if (!team) return false;
      setTeamLoading(true);
      setLoadError(null);
      try {
        const [srcRes, metaRes] = await Promise.all([
          fetch(`/data/dive/teams/${teamNumber}.java`),
          fetch(`/data/dive/teams/${teamNumber}.meta.json`),
        ]);
        if (!srcRes.ok || !metaRes.ok) throw new Error(`Missing cached file for team ${teamNumber}`);
        const source = await srcRes.text();
        const meta = (await metaRes.json()) as DiveTeamMeta;
        setLoadedTeam({ team, meta, source });
        return true;
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Failed to load backdrop file');
        setLoadedTeam(null);
        return false;
      } finally {
        setTeamLoading(false);
      }
    },
    [roster],
  );

  const startRun = useCallback(async () => {
    if (!dailyTeam) return;
    const ok = await loadBackdrop(dailyTeam.teamNumber);
    if (ok) setInPlay(true);
  }, [dailyTeam, loadBackdrop]);

  const exitPlay = () => {
    setInPlay(false);
    setLoadedTeam(null);
  };

  if (loadError && !roster) {
    return (
      <div className="dive-app dive-landing">
        <div className="lesson-content">
          <h1>The Trenches</h1>
          <p className="dive-error">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!roster || !pack) {
    return (
      <div className="dive-app dive-landing">
        <div className="lesson-content">
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  if (teamLoading) {
    return (
      <div className="dive-app dive-landing">
        <div className="lesson-content">
          <p>Loading today&apos;s backdrop…</p>
        </div>
      </div>
    );
  }

  if (inPlay && loadedTeam) {
    return (
      <DivePlay
        team={loadedTeam.team}
        meta={loadedTeam.meta}
        source={loadedTeam.source}
        pack={pack}
        onExit={exitPlay}
      />
    );
  }

  return (
    <DiveLanding
      dailyTeam={dailyTeam}
      onStart={() => void startRun()}
    />
  );
}
