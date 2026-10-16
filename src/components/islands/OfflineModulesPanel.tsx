import { useCallback, useEffect, useState } from 'react';
import { sections } from '@/config/navigation';
import { downloadModule, fetchModuleManifest } from '@/lib/offline/downloadModule';
import { getModuleUiStatus, loadStoredModules } from '@/lib/offline/moduleStatus';
import { formatBundleSize, trackBundleZipUrl } from '@/lib/offline/trackBundle';
import type { ModuleDownloadProgress, ModuleId, ModuleManifest } from '@/lib/offline/types';

type RowState = {
  uiStatus: ReturnType<typeof getModuleUiStatus>;
  downloading: boolean;
  progress: ModuleDownloadProgress | null;
  error: string | null;
};

const initialRow = (): RowState => ({
  uiStatus: 'not_downloaded',
  downloading: false,
  progress: null,
  error: null,
});

export default function OfflineModulesPanel() {
  const [manifests, setManifests] = useState<Partial<Record<ModuleId, ModuleManifest>>>({});
  const [rows, setRows] = useState<Record<ModuleId, RowState>>(() =>
    Object.fromEntries(sections.map((s) => [s.id, initialRow()])) as Record<ModuleId, RowState>,
  );
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  const refreshStatuses = useCallback((nextManifests: Partial<Record<ModuleId, ModuleManifest>>) => {
    setRows((prev) => {
      const out = { ...prev };
      for (const s of sections) {
        out[s.id] = {
          ...out[s.id],
          uiStatus: getModuleUiStatus(s.id, nextManifests[s.id] ?? null),
        };
      }
      return out;
    });
  }, []);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    if (!online) {
      refreshStatuses(manifests);
      return;
    }

    let cancelled = false;
    (async () => {
      const loaded: Partial<Record<ModuleId, ModuleManifest>> = {};
      for (const s of sections) {
        try {
          loaded[s.id] = await fetchModuleManifest(s.id);
        } catch {
          /* preview without postbuild manifests */
        }
      }
      if (cancelled) return;
      setManifests(loaded);
      refreshStatuses(loaded);
    })();

    return () => {
      cancelled = true;
    };
  }, [online, refreshStatuses]);

  const statusLabel = (section: ModuleId): string => {
    const row = rows[section];
    if (row.downloading && row.progress) {
      const { phase, done, total } = row.progress;
      if (phase === 'manifest') return 'Preparing…';
      if (total > 0) return `Saving… ${done}/${total}`;
      return 'Saving…';
    }
    if (row.error) return row.error;
    switch (row.uiStatus) {
      case 'ready':
        return 'Ready offline';
      case 'update_available':
        return 'Update available';
      default:
        return 'Not downloaded';
    }
  };

  const buttonLabel = (section: ModuleId): string => {
    const row = rows[section];
    if (row.error) return 'Retry';
    if (row.uiStatus === 'update_available') return 'Update';
    if (row.uiStatus === 'ready') return 'Re-download';
    return 'Download';
  };

  const runDownload = async (section: ModuleId) => {
    setRows((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        downloading: true,
        error: null,
        progress: { phase: 'manifest', done: 0, total: 0, failedUrls: [] },
      },
    }));

    try {
      const result = await downloadModule(section, {
        onProgress: (progress) => {
          setRows((prev) => ({
            ...prev,
            [section]: { ...prev[section], progress },
          }));
        },
      });

      const manifest = manifests[section] ?? (await fetchModuleManifest(section));
      setManifests((m) => ({ ...m, [section]: manifest }));

      let error: string | null = null;
      if (result.assetFailures.length > 0) {
        error = `${result.assetFailures.length} asset(s) failed — lessons may still work`;
      }

      setRows((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          downloading: false,
          progress: null,
          error,
          uiStatus: getModuleUiStatus(section, manifest),
        },
      }));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Download failed';
      setRows((prev) => ({
        ...prev,
        [section]: {
          ...prev[section],
          downloading: false,
          progress: null,
          error: message,
          uiStatus: getModuleUiStatus(section, manifests[section] ?? null),
        },
      }));
    }
  };

  const stored = loadStoredModules();

  return (
    <fieldset className="prefs-group prefs-offline-modules">
      <legend className="prefs-legend">Offline lessons</legend>
      <p className="prefs-offline-hint">
        <strong>ZIP file (recommended for classrooms):</strong> download a track, unzip on a mentor laptop,
        run a local web server, and open the track URL from student Chromebooks on the same Wi‑Fi. See
        README inside the ZIP. Double‑clicking lesson HTML does not work.
      </p>
      <p className="prefs-offline-hint">
        <strong>Save in this browser:</strong> uses Chrome&apos;s cache when your school allows it. Use the
        lesson sidebar and prev/next — not search. In-browser Java Run still needs internet.
      </p>
      {!online && (
        <p className="prefs-offline-hint prefs-offline-hint--warn" role="status">
          You are offline. Connect to download or update tracks.
        </p>
      )}
      <ul className="prefs-offline-list">
        {sections.map((s) => {
          const row = rows[s.id];
          const disabled = row.downloading || (!online && !row.error);
          const manifest = manifests[s.id];
          const zipHref = manifest?.bundleZip ?? trackBundleZipUrl(s.id);
          const zipSize = formatBundleSize(manifest?.bundleSizeBytes);
          return (
            <li key={s.id} className="prefs-offline-row">
              <div className="prefs-offline-row-main">
                <span className="prefs-offline-label">{s.label}</span>
                <span className="prefs-offline-status" role="status">{statusLabel(s.id)}</span>
              </div>
              <div className="prefs-offline-actions">
                <a
                  className="prefs-offline-zip"
                  href={zipHref}
                  download
                  aria-disabled={!online ? true : undefined}
                  tabIndex={!online ? -1 : undefined}
                  onClick={(e) => {
                    if (!online) e.preventDefault();
                  }}
                >
                  ZIP{zipSize ? ` (${zipSize})` : ''}
                </a>
                <button
                  type="button"
                  className="prefs-offline-download"
                  disabled={disabled}
                  onClick={() => void runDownload(s.id)}
                >
                  {buttonLabel(s.id)}
                </button>
              </div>
              {stored[s.id]?.completedAt && row.uiStatus === 'ready' && !row.downloading && (
                <span className="prefs-offline-meta">
                  Saved {new Date(stored[s.id]!.completedAt).toLocaleDateString()}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}
