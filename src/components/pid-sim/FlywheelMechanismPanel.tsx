import { memo, useEffect, useRef } from 'react';
import { REFERENCE_FLYWHEEL_PLANT } from '@/lib/pid-sim/reference/flywheelReference';
import { motorRotPerSecToWheelRpm } from '@/lib/pid-sim/physics/units/flywheelUnits';
import type { FlywheelPlantConfig } from '@/lib/pid-sim/types';
import type { PidMechanismSim } from '@/lib/pid-sim/physics/simTypes';
import type { FlywheelSim } from '@/lib/pid-sim/physics/flywheelSim';
import { getPidSimPalette, useSiteTheme } from '@/lib/pid-sim/useSiteTheme';

interface Props {
  simRef: React.RefObject<PidMechanismSim | null>;
  setpoint: number;
  highlight?: boolean;
}

function FlywheelMechanismPanel({ simRef, setpoint, highlight }: Props) {
  const siteTheme = useSiteTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const setpointRef = useRef(setpoint);
  const rafRef = useRef<number>(0);

  setpointRef.current = setpoint;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const palette = getPidSimPalette(siteTheme);

      const sim = simRef.current as FlywheelSim | null;
      const plant: FlywheelPlantConfig =
        sim && 'getPlantConfig' in sim
          ? (sim.getPlantConfig() as FlywheelPlantConfig)
          : REFERENCE_FLYWHEEL_PLANT;
      const latest = sim?.getLatest();
      const rpm = latest?.velocity ?? 0;
      const spRpm =
        latest?.setpoint ?? motorRotPerSecToWheelRpm(setpointRef.current, plant);
      const wheelRevs = latest?.position ?? 0;
      const angleRad = wheelRevs * 2 * Math.PI;

      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = container.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.fillStyle = palette.canvasBg;
      ctx.fillRect(0, 0, w, h);

      const cx = w * 0.5;
      const cy = h * 0.48;
      const radius = Math.min(w, h) * 0.28;

      ctx.strokeStyle = palette.gridStroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius + 14, 0, Math.PI * 2);
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angleRad);

      ctx.fillStyle = palette.pivotStroke;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#4a9eff';
      ctx.lineWidth = 5;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * radius * 0.3, Math.sin(a) * radius * 0.3);
        ctx.lineTo(Math.cos(a) * radius * 0.95, Math.sin(a) * radius * 0.95);
        ctx.stroke();
      }

      ctx.restore();

      ctx.fillStyle = palette.labelText;
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = palette.mutedText;
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(`Speed: ${rpm.toFixed(0)} RPM`, 12, 20);
      ctx.fillText(`Setpoint: ${spRpm.toFixed(0)} RPM`, 12, 38);
      ctx.fillText(`Max: ${plant.maxRpm} RPM`, 12, h - 12);
    };

    const schedule = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    };

    const sim = simRef.current;
    const unsub = sim?.subscribe(schedule) ?? (() => {});
    schedule();

    const ro = new ResizeObserver(schedule);
    ro.observe(container);

    return () => {
      unsub();
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [simRef, siteTheme]);

  return (
    <div
      ref={containerRef}
      className={`pid-mechanism-panel ${highlight ? 'highlighted' : ''}`}
    >
      <canvas ref={canvasRef} className="pid-mechanism-canvas" aria-label="Flywheel mechanism view" />
    </div>
  );
}

export default memo(FlywheelMechanismPanel);
