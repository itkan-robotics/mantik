import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ResourceEntry, ResourceMajor } from '@/lib/resources/schema';
import {
  RESOURCE_MAJOR_LABELS,
  RESOURCE_MINOR_OPTIONS,
  resourceMajorSchema,
} from '@/lib/resources/schema';
import ResourceCard from './ResourceCard';
import ResourceFilters from './ResourceFilters';

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        },
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

const TURNSTILE_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const SUBMIT_ENDPOINT = '/.netlify/functions/submit-resource';

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
  const [selectedMajors, setSelectedMajors] = useState<Set<ResourceMajor>>(parseInitialMajors);
  const [selectedMinors, setSelectedMinors] = useState<Set<string>>(parseInitialMinors);
  const [submitOpen, setSubmitOpen] = useState(false);

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

  return (
    <div className="resources-app">
      <div className="resources-toolbar">
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

      <section className="resources-submit-section">
        <button
          type="button"
          className="resources-submit-toggle"
          aria-expanded={submitOpen}
          onClick={() => setSubmitOpen((o) => !o)}
        >
          {submitOpen ? 'Hide submission form' : 'Submit a resource'}
        </button>
        {submitOpen && (
          <SubmitResourceForm minorOptions={[...RESOURCE_MINOR_OPTIONS]} />
        )}
      </section>
    </div>
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
  const [minor, setMinor] = useState('Other');
  const [minorOther, setMinorOther] = useState('');
  const [contact, setContact] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const siteKey = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY as string | undefined;

  useEffect(() => {
    if (!siteKey || !turnstileRef.current) return;

    let cancelled = false;

    function renderWidget() {
      if (cancelled || !turnstileRef.current || !window.turnstile) return;
      if (widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: siteKey,
        callback: (token) => setTurnstileToken(token),
        'expired-callback': () => setTurnstileToken(''),
        'error-callback': () => setTurnstileToken(''),
      });
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      const script = document.createElement('script');
      script.src = TURNSTILE_SCRIPT;
      script.async = true;
      script.onload = renderWidget;
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  const resolvedMinor = minor === 'Other' ? minorOther.trim() : minor;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    if (!siteKey) {
      setErrorMsg('Submission is not configured on this environment.');
      setStatus('error');
      return;
    }
    if (!turnstileToken) {
      setErrorMsg('Complete the verification challenge first.');
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
          turnstileToken,
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
      setTurnstileToken('');
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current);
      }
    } catch (err) {
      setStatus('error');
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
          Title
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
          Short description
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
          Link (URL or site path)
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
          Section
          <select value={major} onChange={(e) => setMajor(e.target.value as ResourceMajor)}>
            {(Object.keys(RESOURCE_MAJOR_LABELS) as ResourceMajor[]).map((m) => (
              <option key={m} value={m}>
                {RESOURCE_MAJOR_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Topic
          <select value={minor} onChange={(e) => setMinor(e.target.value)}>
            {minorOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>
      </div>

      {minor === 'Other' && (
        <div className="resources-form-row">
          <label>
            Custom topic
            <input
              type="text"
              required
              maxLength={40}
              value={minorOther}
              onChange={(e) => setMinorOther(e.target.value)}
            />
          </label>
        </div>
      )}

      <div className="resources-form-row">
        <label>
          Contact (optional — GitHub username or email)
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
        <div ref={turnstileRef} className="resources-turnstile" />
      ) : (
        <p className="resources-submit-note">
          Submissions require Turnstile keys in the deploy environment.
        </p>
      )}

      {errorMsg && <p className="resources-submit-error">{errorMsg}</p>}

      <button type="submit" className="resources-submit-btn" disabled={status === 'loading'}>
        {status === 'loading' ? 'Submitting…' : 'Submit for review'}
      </button>
    </form>
  );
}
