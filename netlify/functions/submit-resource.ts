import type { Handler, HandlerEvent } from '@netlify/functions';
import { z } from 'zod';
import {
  corsAllowOrigin,
  hostnameFromOrigin,
  isAllowedSubmitOrigin,
  RECAPTCHA_VERIFY_URL,
  resolveRecaptchaSecretKey,
  resolveSubmitSource,
  submitPageUrl,
  submitSourceDisplayName,
  submitSourceLabel,
  type SubmitSource,
} from '../../src/lib/resources/submitEnv';

const submitSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(500),
  url: z.string().trim().min(1).max(2048),
  major: z.enum(['java', 'ftc', 'frc', 'comp', 'general']),
  minor: z.string().trim().min(1).max(80),
  submitterContact: z.string().trim().max(120).optional(),
  recaptchaToken: z.string().min(1),
  website: z.string().max(0).optional(),
});

const rateBucket = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 15 * 60 * 1000;

function json(
  statusCode: number,
  body: Record<string, unknown>,
  corsOrigin: string,
) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': corsOrigin,
    },
    body: JSON.stringify(body),
  };
}

function clientIp(event: HandlerEvent): string {
  return (
    event.headers['x-nf-client-connection-ip'] ??
    event.headers['client-ip'] ??
    event.headers['x-forwarded-for']?.split(',')[0]?.trim() ??
    'unknown'
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateBucket.get(ip);
  if (!entry || now > entry.resetAt) {
    rateBucket.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count += 1;
  return true;
}

function validateUrl(raw: string): string | null {
  if (raw.startsWith('/') && !raw.startsWith('//')) {
    if (raw.includes('..') || raw.includes('\\')) return null;
    return raw;
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  return parsed.toString();
}

async function verifyRecaptcha(
  token: string,
  ip: string,
  hostname: string | undefined,
): Promise<boolean> {
  const secret = resolveRecaptchaSecretKey(process.env.RECAPTCHA_SECRET_KEY, {
    netlifyDev: process.env.NETLIFY_DEV === 'true',
    allowTestKeys: process.env.ALLOW_RECAPTCHA_TEST_KEYS === 'true',
    hostname,
  });
  if (!secret) return false;

  const form = new URLSearchParams();
  form.set('secret', secret);
  form.set('response', token);
  if (ip !== 'unknown') form.set('remoteip', ip);

  const res = await fetch(RECAPTCHA_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });

  if (!res.ok) return false;
  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
}

function escapeIssueText(text: string): string {
  return text.replace(/\r/g, '').slice(0, 4000);
}

async function createGitHubIssue(
  payload: z.infer<typeof submitSchema>,
  submitSource: SubmitSource,
  pageUrl: string | undefined,
): Promise<number> {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO ?? 'itkan-robotics/mantik';
  if (!token) throw new Error('missing_github_token');

  const sourceLabel = submitSourceLabel(submitSource);
  const labels = ['resource-submission', 'needs-review', sourceLabel].filter(
    (label): label is string => Boolean(label),
  );

  const body = [
    '## Resource submission',
    '',
    `- **Submitted from:** ${submitSourceDisplayName(submitSource)}`,
    ...(pageUrl ? [`- **Page URL:** ${pageUrl}`] : []),
    `- **Title:** ${payload.title}`,
    `- **URL:** ${payload.url}`,
    `- **Section:** ${payload.major}`,
    `- **Topic:** ${payload.minor}`,
    `- **Contact:** ${payload.submitterContact ?? '_not provided_'}`,
    '',
    '### Description',
    '',
    payload.description,
    '',
    '---',
    '',
    '### Moderation checklist',
    '',
    '- [ ] Link works and is relevant to FIRST programming',
    '- [ ] Description is accurate',
    '- [ ] Add entry to `src/data/resources.json` if approved',
  ].join('\n');

  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'mantik-resources-submit',
    },
    body: JSON.stringify({
      title: `[Resource] ${payload.title}`.slice(0, 256),
      body: escapeIssueText(body),
      labels,
    }),
  });

  if (res.status === 422) {
    const retry = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'mantik-resources-submit',
      },
      body: JSON.stringify({
        title: `[Resource] ${payload.title}`.slice(0, 256),
        body: escapeIssueText(body),
      }),
    });
    if (!retry.ok) {
      console.error('GitHub issue retry failed:', retry.status, await retry.text());
      throw new Error('github_issue_failed');
    }
    const issue = (await retry.json()) as { number: number };
    return issue.number;
  }

  if (!res.ok) {
    const errText = await res.text();
    console.error('GitHub issue failed:', res.status, errText);
    throw new Error('github_issue_failed');
  }

  const issue = (await res.json()) as { number: number };
  return issue.number;
}

export const handler: Handler = async (event) => {
  const origin = event.headers.origin;
  const referer = event.headers.referer;
  const corsOrigin = corsAllowOrigin(origin, referer);
  const requestHostname = hostnameFromOrigin(origin, referer);

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': corsOrigin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed.' }, corsOrigin);
  }

  if (!isAllowedSubmitOrigin(origin, referer)) {
    return json(403, { error: 'Forbidden.' }, corsOrigin);
  }

  const ip = clientIp(event);
  if (!checkRateLimit(ip)) {
    return json(429, { error: 'Too many submissions. Try again later.' }, corsOrigin);
  }

  let body: unknown;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return json(400, { error: 'Invalid JSON.' }, corsOrigin);
  }

  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return json(400, { error: 'Invalid submission.' }, corsOrigin);
  }

  if (parsed.data.website) {
    return json(400, { error: 'Invalid submission.' }, corsOrigin);
  }

  const safeUrl = validateUrl(parsed.data.url);
  if (!safeUrl) {
    return json(400, { error: 'URL must use http or https.' }, corsOrigin);
  }

  const payload = { ...parsed.data, url: safeUrl };

  const recaptchaOk = await verifyRecaptcha(payload.recaptchaToken, ip, requestHostname);
  if (!recaptchaOk) {
    return json(400, { error: 'Verification failed. Try again.' }, corsOrigin);
  }

  const submitSource = resolveSubmitSource(origin, referer);
  const pageUrl = submitPageUrl(origin, referer);

  try {
    const issueNumber = await createGitHubIssue(payload, submitSource, pageUrl);
    return json(200, { ok: true, issue: issueNumber }, corsOrigin);
  } catch (err) {
    console.error('submit-resource error:', err);
    return json(500, { error: 'Could not submit. Try again later.' }, corsOrigin);
  }
};
