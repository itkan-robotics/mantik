import { useMemo, useState } from 'react';

export interface PublicRepoRow {
  teamName: string;
  teamNumber: number;
  normEpa: number | null;
  language: string;
  linkToCodebases: string;
}

interface DatasetMeta {
  generatedAt: string;
  rowCount: number;
  repoCount: number;
  methodology?: string;
  referenceSpreadsheet?: string;
  chiefDelphiThread?: string;
}

interface Props {
  rows: PublicRepoRow[];
  meta: DatasetMeta;
  csvUrl: string;
}

function repoUrl(slug: string): string {
  if (slug.startsWith('http')) return slug;
  return `https://github.com/${slug}`;
}

export default function Frc2026PublicReposTable({ rows, meta, csvUrl }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const hay = [
        r.teamName,
        String(r.teamNumber),
        r.language,
        r.linkToCodebases,
        r.normEpa != null ? String(r.normEpa) : '',
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [query, rows]);

  const generated = useMemo(() => {
    try {
      return new Date(meta.generatedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return meta.generatedAt;
    }
  }, [meta.generatedAt]);

  return (
    <div className="frc-repos-table-wrap">
      <div className="frc-repos-toolbar">
        <label className="frc-repos-search">
          <span className="visually-hidden">Search teams</span>
          <input
            className="frc-repos-search-input"
            type="search"
            placeholder="Search team, number, language, repo…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </label>
        <a className="frc-repos-download" href={csvUrl} download>
          Download CSV
        </a>
      </div>
      <p className="frc-repos-meta">
        {filtered.length} of {meta.rowCount} teams · {meta.repoCount} repos indexed · Updated{' '}
        {generated}
      </p>
      <div className="frc-repos-scroll" tabIndex={0}>
        <table className="frc-repos-table">
          <thead>
            <tr>
              <th scope="col">Team Name</th>
              <th scope="col" className="frc-repos-th--num">Team Number</th>
              <th scope="col" className="frc-repos-th--num">Norm EPA</th>
              <th scope="col">Language</th>
              <th scope="col">Link to codebase</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const slug = r.linkToCodebases.trim();
              return (
                <tr key={r.teamNumber}>
                  <td className="frc-repos-cell frc-repos-cell--text">{r.teamName}</td>
                  <td className="frc-repos-cell frc-repos-cell--num">{r.teamNumber}</td>
                  <td className="frc-repos-cell frc-repos-cell--num">
                    {r.normEpa != null ? Math.round(r.normEpa) : ''}
                  </td>
                  <td className="frc-repos-cell frc-repos-cell--text">{r.language || ''}</td>
                  <td className="frc-repos-cell frc-repos-cell--links">
                    {slug ? (
                      <a href={repoUrl(slug)} rel="noopener noreferrer" target="_blank">
                        {slug}
                      </a>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
