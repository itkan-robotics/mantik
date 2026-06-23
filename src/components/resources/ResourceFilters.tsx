import type { ResourceMajor } from '@/lib/resources/schema';
import { RESOURCE_MAJOR_LABELS } from '@/lib/resources/schema';

interface Props {
  majors: ResourceMajor[];
  minors: string[];
  selectedMajors: Set<ResourceMajor>;
  selectedMinors: Set<string>;
  onToggleMajor: (major: ResourceMajor) => void;
  onToggleMinor: (minor: string) => void;
  onClearFilters: () => void;
}

export default function ResourceFilters({
  majors,
  minors,
  selectedMajors,
  selectedMinors,
  onToggleMajor,
  onToggleMinor,
  onClearFilters,
}: Props) {
  const hasFilters = selectedMajors.size > 0 || selectedMinors.size > 0;

  return (
    <div className="resources-filters">
      <div className="resources-filter-group">
        <span className="resources-filter-label">Section</span>
        <div className="resources-filter-chips">
          {majors.map((major) => (
            <button
              key={major}
              type="button"
              className={`resources-chip ${selectedMajors.has(major) ? 'active' : ''}`}
              onClick={() => onToggleMajor(major)}
            >
              {RESOURCE_MAJOR_LABELS[major]}
            </button>
          ))}
        </div>
      </div>
      <div className="resources-filter-group">
        <span className="resources-filter-label">Topic</span>
        <div className="resources-filter-chips resources-filter-chips-wrap">
          {minors.map((minor) => (
            <button
              key={minor}
              type="button"
              className={`resources-chip ${selectedMinors.has(minor) ? 'active' : ''}`}
              onClick={() => onToggleMinor(minor)}
            >
              {minor}
            </button>
          ))}
        </div>
      </div>
      {hasFilters && (
        <button type="button" className="resources-clear-filters" onClick={onClearFilters}>
          Clear filters
        </button>
      )}
    </div>
  );
}
