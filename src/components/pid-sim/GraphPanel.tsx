import { memo, useEffect, useRef } from 'react';
import type { ElevatorSim } from '@/lib/pid-sim/physics/elevatorSim';

interface Props {
  simRef: React.RefObject<ElevatorSim | null>;
  paused: boolean;
  onPausedChange: (paused: boolean) => void;
  windowSeconds?: number;
  highlight?: boolean;
}

function GraphPanel({
  simRef,
  paused,
  onPausedChange,
  windowSeconds = 2,
  highlight = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<import('uplot').default | null>(null);
  const pausedRef = useRef(paused);
  const windowRef = useRef(windowSeconds);
  const rafRef = useRef<number>(0);
  const timeBuf = useRef<Float64Array>(new Float64Array(0));
  const posBuf = useRef<Float64Array>(new Float64Array(0));
  const spBuf = useRef<Float64Array>(new Float64Array(0));
  const velBuf = useRef<Float64Array>(new Float64Array(0));

  pausedRef.current = paused;
  windowRef.current = windowSeconds;

  useEffect(() => {
    let destroyed = false;

    async function initChart() {
      const uPlot = (await import('uplot')).default;
      await import('uplot/dist/uPlot.min.css');

      if (destroyed || !containerRef.current) return;

      const width = containerRef.current.clientWidth || 400;
      const height = 220;

      chartRef.current?.destroy();

      chartRef.current = new uPlot(
        {
          width,
          height,
          series: [
            {},
            { label: 'Position', stroke: '#4a9eff', width: 2 },
            { label: 'Setpoint', stroke: '#ff8c42', width: 2, dash: [6, 4] },
            { label: 'Velocity', stroke: '#4ade80', width: 1.5 },
          ],
          axes: [
            { stroke: '#888', grid: { stroke: '#333' } },
            { stroke: '#888', grid: { stroke: '#333' }, label: 'm / m/s' },
          ],
          scales: { x: { time: false } },
          cursor: { drag: { x: true, y: false } },
        },
        [[], [], [], []],
        containerRef.current,
      );
    }

    initChart();

    const onResize = () => {
      if (chartRef.current && containerRef.current) {
        chartRef.current.setSize({
          width: containerRef.current.clientWidth,
          height: 220,
        });
      }
    };
    window.addEventListener('resize', onResize);

    return () => {
      destroyed = true;
      window.removeEventListener('resize', onResize);
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const sim = simRef.current;
    if (!sim) return;

    const updateChart = () => {
      const chart = chartRef.current;
      if (!chart || pausedRef.current) return;

      const samples = sim.getSamples();
      if (samples.length === 0) return;

      const latest = samples[samples.length - 1]!;
      const cutoff = latest.time - windowRef.current;
      let start = 0;
      while (start < samples.length && samples[start]!.time < cutoff) start += 1;
      const count = samples.length - start;
      if (count === 0) return;

      if (timeBuf.current.length < count) {
        timeBuf.current = new Float64Array(count);
        posBuf.current = new Float64Array(count);
        spBuf.current = new Float64Array(count);
        velBuf.current = new Float64Array(count);
      }

      for (let i = 0; i < count; i++) {
        const s = samples[start + i]!;
        timeBuf.current[i] = s.time;
        posBuf.current[i] = s.position;
        spBuf.current[i] = s.setpoint;
        velBuf.current[i] = s.velocity;
      }

      chart.setData([
        timeBuf.current.subarray(0, count),
        posBuf.current.subarray(0, count),
        spBuf.current.subarray(0, count),
        velBuf.current.subarray(0, count),
      ]);
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateChart);
    };

    const unsub = sim.subscribe(scheduleUpdate);
    scheduleUpdate();

    return () => {
      unsub();
      cancelAnimationFrame(rafRef.current);
    };
  }, [simRef]);

  return (
    <div className={`pid-graph-panel ${highlight ? 'highlighted' : ''}`}>
      <div className="pid-panel-header pid-subpanel-header">
        <span>TraceView</span>
        <div className="pid-scope-toolbar">
          <button type="button" className="pid-scope-btn" onClick={() => onPausedChange(!paused)}>
            {paused ? 'Play' : 'Pause'}
          </button>
          <span className="pid-panel-sub">{windowSeconds}s window</span>
        </div>
      </div>
      <div ref={containerRef} className="pid-chart-container" />
    </div>
  );
}

export default memo(GraphPanel);
