import { useLayoutEffect, useMemo, useRef, useState } from 'react';

interface Props {
  source: string;
  fileLabel: string;
  highlightLine: number;
  backdropCaption?: string;
}

const DEPTH_ANCHOR_RATIO = 0.38;

export default function DiveCodePanel({ source, fileLabel, highlightLine, backdropCaption }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const lineSampleRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState({ lineHeight: 17, anchorY: 100, viewportH: 280 });

  const lines = useMemo(() => source.split(/\r?\n/), [source]);
  const clampedLine = Math.max(1, Math.min(highlightLine, lines.length));

  const measure = () => {
    const viewport = viewportRef.current;
    const sample = lineSampleRef.current;
    if (!viewport || !sample) return;

    const lineHeight = sample.offsetHeight;
    const viewportH = viewport.clientHeight;
    if (viewportH <= 0 || lineHeight <= 0) return;
    const anchorY = viewportH * DEPTH_ANCHOR_RATIO;
    setMetrics({ lineHeight, anchorY, viewportH });
  };

  useLayoutEffect(() => {
    measure();
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(viewport);
    return () => ro.disconnect();
  }, [source, lines.length]);

  const { lineHeight, anchorY, viewportH } = metrics;
  /** Start flush at top (line 1). Only translate up once the active line would pass the depth band. */
  const rawShift = anchorY - (clampedLine - 1) * lineHeight;
  const translateY = Math.min(0, rawShift);
  /** Room to scroll the last lines up through the viewport. */
  const paddingBottom = Math.max(lineHeight * 2, viewportH);

  return (
    <div className="dive-code-panel">
      <div className="dive-code-header">
        <span className="dive-code-filename">
          Backdrop · {backdropCaption ? `${backdropCaption} · ` : ''}{fileLabel}
        </span>
        <span className="dive-code-line-meta">Line {clampedLine} / {lines.length}</span>
      </div>
      <div className="dive-code-viewport" ref={viewportRef}>
        <div className="dive-code-depth-band" aria-hidden="true" />
        <div className="dive-code-scroll">
          <pre
            className="dive-code-pre"
            style={{
              transform: `translateY(${translateY}px)`,
              paddingBottom: `${paddingBottom}px`,
            }}
          >
            {lines.map((line, i) => {
              const lineNo = i + 1;
              const active = lineNo === clampedLine;
              return (
                <div
                  key={lineNo}
                  className={`dive-code-line${active ? ' dive-code-line--active' : ''}`}
                  ref={lineNo === 1 ? lineSampleRef : undefined}
                >
                  <span className="dive-code-gutter">{lineNo}</span>
                  <code className="dive-code-text">{line || ' '}</code>
                </div>
              );
            })}
          </pre>
        </div>
      </div>
    </div>
  );
}
