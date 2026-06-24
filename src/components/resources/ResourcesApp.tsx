import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import type { ResourceEntry, ResourceMajor } from '@/lib/resources/schema';
import {
  RESOURCE_MAJOR_LABELS,
  RESOURCE_MINOR_OPTIONS,
  resourceMajorSchema,
} from '@/lib/resources/schema';
import ResourceCard from './ResourceCard';
import ResourceFilters from './ResourceFilters';
import { resolveRecaptchaSiteKey, shouldUseRecaptchaTestKeys, RECAPTCHA_SCRIPT, SUBMIT_ENDPOINT } from '@/lib/resources/submitEnv';

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      render: (
        container: HTMLElement,
        params: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        },
      ) => number;
      reset: (widgetId?: number) => void;
    };
  }
}

interface Props {
  resources: ResourceEntry[];
  minorTags: string[];
}

function parseInitialMajors(): Set<ResourceMajor> {
  if (typeof window === 'undefined') return new Set();
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('major');
  if (!raw) return new Set();
  const majors = raw.split(',').map((s) => s.trim().toLowerCase());
  const valid = majors.filter((m): m is ResourceMajor => resourceMajorSchema.safeParse(m).success);
  return new Set(valid);
}

function parseInitialMinors(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('minor');
  if (!raw) return new Set();
  return new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
}

export default function ResourcesApp({ resources, minorTags }: Props) {
  const [query, setQuery] = useState('');
  const [selectedMajors, setSelectedMajors] = useState<Set<ResourceMajor>>(() => new Set());
  const [selectedMinors, setSelectedMinors] = useState<Set<string>>(() => new Set());
  const [submitOpen, setSubmitOpen] = useState(false);

  useEffect(() => {
    setSelectedMajors(parseInitialMajors());
    setSelectedMinors(parseInitialMinors());
  }, []);

  const majors = useMemo(
    () => [...new Set(resources.map((r) => r.major))].sort() as ResourceMajor[],
    [resources],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return resources.filter((r) => {
      if (selectedMajors.size > 0 && !selectedMajors.has(r.major)) return false;
      if (selectedMinors.size > 0 && !selectedMinors.has(r.minor)) return false;
      if (!q) return true;
      const haystack = [
        r.title,
        r.description,
        r.minor,
        RESOURCE_MAJOR_LABELS[r.major],
        ...(r.tags ?? []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [resources, query, selectedMajors, selectedMinors]);

  const toggleMajor = useCallback((major: ResourceMajor) => {
    setSelectedMajors((prev) => {
      const next = new Set(prev);
      if (next.has(major)) next.delete(major);
      else next.add(major);
      return next;
    });
  }, []);

  const toggleMinor = useCallback((minor: string) => {
    setSelectedMinors((prev) => {
      const next = new Set(prev);
      if (next.has(minor)) next.delete(minor);
      else next.add(minor);
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedMajors(new Set());
    setSelectedMinors(new Set());
    setQuery('');
  }, []);

  const presetMinorOptions = useMemo(
    () => [...RESOURCE_MINOR_OPTIONS].filter((o) => o !== 'Other'),
    [],
  );

  return (
    <div className="resources-app">
      <div className="resources-toolbar">
        <button
          type="button"
          className="resources-submit-toggle"
          aria-expanded={submitOpen}
          onClick={() => setSubmitOpen((o) => !o)}
        >
          {submitOpen ? 'Hide form' : 'Submit resource'}
        </button>
        <label className="resources-search-wrap">
          <span className="visually-hidden">Search resources</span>
          <input
            type="search"
            className="resources-search"
            placeholder="Search by title, topic, or keyword…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <p className="resources-count">
          {filtered.length} of {resources.length} resources
        </p>
      </div>

      {submitOpen && (
        <div className="resources-submit-panel">
          <SubmitResourceForm minorOptions={presetMinorOptions} />
        </div>
      )}

      <ResourceFilters
        majors={majors}
        minors={minorTags}
        selectedMajors={selectedMajors}
        selectedMinors={selectedMinors}
        onToggleMajor={toggleMajor}
        onToggleMinor={toggleMinor}
        onClearFilters={clearFilters}
      />

      {filtered.length === 0 ? (
        <p className="resources-empty">No resources match your search or filters.</p>
      ) : (
        <div className="resources-grid">
          {filtered.map((resource) => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      )}
    </div>
  );
}

function RequiredMark() {
  return (
    <span className="resources-required" aria-hidden="true">
      *
    </span>
  );
}

function FieldLabel({
  required,
  children,
}: {
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <span className="resources-field-label">
      {children}
      {required ? <RequiredMark /> : null}
    </span>
  );
}

interface SubmitProps {
  minorOptions: string[];
}

function SubmitResourceForm({ minorOptions }: SubmitProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [major, setMajor] = useState<ResourceMajor>('frc');
  const [minorPreset, setMinorPreset] = useState(minorOptions[0] ?? 'Environment Setup');
  const [minorCustom, setMinorCustom] = useState('');
  const [minorIsCustom, setMinorIsCustom] = useState(false);
  const [contact, setContact] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);

  const hostname = typeof window !== 'undefined' ? window.location.hostname : undefined;
  const siteKey = resolveRecaptchaSiteKey(
    import.meta.env.PUBLIC_RECAPTCHA_SITE_KEY,
    import.meta.env.DEV,
    hostname,
  );
  const usingTestRecaptcha = shouldUseRecaptchaTestKeys({
    isDev: import.meta.env.DEV,
    hostname,
  });

  useEffect(() => {
    if (!siteKey || !recaptchaRef.current) return;

    let cancelled = false;

    function renderWidget() {
      if (cancelled || !recaptchaRef.current || !window.grecaptcha) return;
      if (widgetIdRef.current !== null) {
        window.grecaptcha.reset(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      widgetIdRef.current = window.grecaptcha.render(recaptchaRef.current, {
        sitekey: siteKey!,
        callback: (token) => setRecaptchaToken(token),
        'expired-callback': () => setRecaptchaToken(''),
        'error-callback': () => setRecaptchaToken(''),
      });
    }

    function initRecaptcha() {
      if (cancelled || !window.grecaptcha) return;
      window.grecaptcha.ready(renderWidget);
    }

    const existing = document.querySelector(`script[src^="${RECAPTCHA_SCRIPT.split('?')[0]}"]`);
    if (window.grecaptcha) {
      initRecaptcha();
    } else if (existing) {
      existing.addEventListener('load', initRecaptcha);
    } else {
      const script = document.createElement('script');
      script.src = RECAPTCHA_SCRIPT;
      script.async = true;
      script.defer = true;
      script.onload = initRecaptcha;
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current !== null && window.grecaptcha) {
        window.grecaptcha.reset(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  const resolvedMinor = minorIsCustom ? minorCustom.trim() : minorPreset;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    if (minorIsCustom && !minorCustom.trim()) {
      setErrorMsg('Enter a topic.');
      setStatus('error');
      return;
    }
    if (!siteKey) {
      setErrorMsg('Submission is not configured on this environment.');
      setStatus('error');
      return;
    }
    if (!recaptchaToken) {
      setErrorMsg('Complete the reCAPTCHA checkbox first.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    try {
      const res = await fetch(SUBMIT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          url: url.trim(),
          major,
          minor: resolvedMinor,
          submitterContact: contact.trim() || undefined,
          recaptchaToken,
          website: honeypot,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'Submission failed.');
      }
      setStatus('success');
      setTitle('');
      setDescription('');
      setUrl('');
      setContact('');
      setMinorCustom('');
      setMinorIsCustom(false);
      setRecaptchaToken('');
      if (widgetIdRef.current !== null && window.grecaptcha) {
        window.grecaptcha.reset(widgetIdRef.current);
      }
    } catch (err) {
      setStatus('error');
      if (import.meta.env.DEV && err instanceof TypeError) {
        setErrorMsg('Submit endpoint unreachable. Restart the dev server and try again.');
        return;
      }
      setErrorMsg(err instanceof Error ? err.message : 'Submission failed.');
    }
  }

  if (status === 'success') {
    return (
      <p className="resources-submit-success">
        Submitted for review. Maintainers will add approved resources after checking the link.
      </p>
    );
  }

  return (
    <form className="resources-submit-form" onSubmit={handleSubmit}>
      <p className="resources-submit-intro">
        Suggest a programming resource for FIRST teams. Submissions open a GitHub issue for
        maintainer review before anything is published.
      </p>

      <div className="resources-form-row">
        <label>
          <FieldLabel required>Title</FieldLabel>
          <input
            type="text"
            required
            maxLength={120}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
      </div>

      <div className="resources-form-row">
        <label>
          <FieldLabel required>Short description</FieldLabel>
          <textarea
            required
            maxLength={500}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
      </div>

      <div className="resources-form-row">
        <label>
          <FieldLabel required>Link (URL or site path)</FieldLabel>
          <input
            type="text"
            required
            maxLength={2048}
            placeholder="https://… or /frc/lesson-id"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
      </div>

      <div className="resources-form-row resources-form-row-split">
        <label>
          <FieldLabel required>Section</FieldLabel>
          <select value={major} onChange={(e) => setMajor(e.target.value as ResourceMajor)}>
            {(Object.keys(RESOURCE_MAJOR_LABELS) as ResourceMajor[]).map((m) => (
              <option key={m} value={m}>
                {RESOURCE_MAJOR_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <FieldLabel required>Topic</FieldLabel>
          {minorIsCustom ? (
            <>
              <input
                type="text"
                required
                maxLength={40}
                placeholder="Enter topic"
                value={minorCustom}
                onChange={(e) => setMinorCustom(e.target.value)}
              />
              <button
                type="button"
                className="resources-topic-back"
                onClick={() => {
                  setMinorIsCustom(false);
                  setMinorCustom('');
                }}
              >
                Choose from list
              </button>
            </>
          ) : (
            <select
              value={minorPreset}
              onChange={(e) => {
                if (e.target.value === '__other__') {
                  setMinorIsCustom(true);
                  setMinorCustom('');
                } else {
                  setMinorPreset(e.target.value);
                }
              }}
            >
              {minorOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
              <option value="__other__">Other…</option>
            </select>
          )}
        </label>
      </div>

      <div className="resources-form-row">
        <label>
          <FieldLabel>Contact</FieldLabel>
          <span className="resources-optional-hint">GitHub username or email</span>
          <input
            type="text"
            maxLength={120}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
        </label>
      </div>

      <div className="resources-honeypot" aria-hidden="true">
        <label>
          Website
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </label>
      </div>

      {siteKey ? (
        <div ref={recaptchaRef} className="resources-recaptcha" />
      ) : (
        <p className="resources-submit-note">
          Submissions require <code>PUBLIC_RECAPTCHA_SITE_KEY</code> in the Netlify build environment.
        </p>
      )}

      {usingTestRecaptcha && import.meta.env.DEV && (
        <p className="resources-submit-note">
          Local dev: reCAPTCHA test key active. Add <code>GITHUB_TOKEN</code> to <code>.env</code>{' '}
          to open GitHub issues on submit.
        </p>
      )}

      {errorMsg && <p className="resources-submit-error">{errorMsg}</p>}

      <button type="submit" className="resources-submit-btn" disabled={status === 'loading'}>
        {status === 'loading' ? 'Submitting…' : 'Submit for review'}
      </button>
    </form>
  );
}
