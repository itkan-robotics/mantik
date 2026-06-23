import type { ResourceEntry } from '@/lib/resources/schema';
import { RESOURCE_MAJOR_LABELS } from '@/lib/resources/schema';

interface Props {
  resource: ResourceEntry;
}

function isExternal(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

export default function ResourceCard({ resource }: Props) {
  const external = isExternal(resource.url);

  return (
    <a
      href={resource.url}
      className="resources-card"
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
    >
      <span className="resources-card-title">
        {resource.title}
        {external && (
          <span className="resources-card-external" aria-hidden="true">
            ↗
          </span>
        )}
      </span>
      <span className="resources-card-description">{resource.description}</span>
      <span className="resources-card-tags">
        <span className="resources-tag resources-tag-major">
          {RESOURCE_MAJOR_LABELS[resource.major]}
        </span>
        <span className="resources-tag">{resource.minor}</span>
        {resource.tags?.slice(0, 2).map((tag) => (
          <span key={tag} className="resources-tag resources-tag-muted">
            {tag}
          </span>
        ))}
      </span>
    </a>
  );
}
