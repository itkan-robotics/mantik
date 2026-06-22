import { memo, useEffect, useRef } from 'react';
import { REFERENCE_ARM_PLANT } from '@/lib/pid-sim/reference/armReference';
import { angleDegToMotorRotations } from '@/lib/pid-sim/physics/units/armUnits';
import type { ArmPlantConfig } from '@/lib/pid-sim/types';
import type { PidMechanismSim } from '@/lib/pid-sim/physics/simTypes';
import type { ArmSim } from '@/lib/pid-sim/physics/armSim';
import { getPidSimPalette, useSiteTheme } from '@/lib/pid-sim/useSiteTheme';

interface Props {
  simRef: React.RefObject<PidMechanismSim | null>;
  setpoint: number;
  highlight?: boolean;
}

function ArmMechanismPanel({ simRef, setpoint, highlight }: Props) {
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

      const sim = simRef.current as ArmSim | null;
      const plant: ArmPlantConfig =
        sim && 'getPlantConfig' in sim
          ? (sim.getPlantConfig() as ArmPlantConfig)
          : REFERENCE_ARM_PLANT;
      const latest = sim?.getLatest();
      const posDeg = latest?.position ?? plant.startAngleDeg;
      const spDeg =
        latest?.setpoint ??
        (setpointRef.current * 360) / plant.gearRatio;

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

      const pivotX = w * 0.35;
      const pivotY = h * 0.55;
      const armLen = Math.min(w, h) * 0.38;

      const toRad = (deg: number) => (deg * Math.PI) / 180;

      const drawArc = (deg: number, color: string, dash: number[] = []) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash(dash);
        ctx.beginPath();
        ctx.arc(pivotX, pivotY, armLen, -toRad(deg), 0, deg > 0);
        ctx.stroke();
        ctx.setLineDash([]);
      };

      drawArc(plant.hardMinDeg, palette.pivotStroke);
      drawArc(plant.hardMaxDeg, palette.pivotStroke);
      drawArc(plant.softMinDeg, '#e55', [5, 4]);
      drawArc(plant.softMaxDeg, '#e55', [5, 4]);

      ctx.strokeStyle = palette.pivotStroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pivotX - armLen - 20, pivotY);
      ctx.lineTo(pivotX + armLen + 40, pivotY);
      ctx.stroke();

      const armEnd = (deg: number) => ({
        x: pivotX + armLen * Math.cos(toRad(deg)),
        y: pivotY - armLen * Math.sin(toRad(deg)),
      });

      const end = armEnd(posDeg);
      const sp = armEnd(spDeg);

      ctx.strokeStyle = palette.shaftStroke;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(pivotX, pivotY);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      ctx.fillStyle = '#ff8c42';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#4a9eff';
      ctx.beginPath();
      ctx.arc(end.x, end.y, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = palette.labelText;
      ctx.beginPath();
      ctx.arc(pivotX, pivotY, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = palette.mutedText;
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(`Angle: ${posDeg.toFixed(1)}°`, 12, 20);
      ctx.fillText(`Setpoint: ${spDeg.toFixed(1)}°`, 12, 38);
      ctx.fillText(`Soft: ${plant.softMinDeg}° to ${plant.softMaxDeg}°`, 12, h - 12);
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
      <canvas ref={canvasRef} className="pid-mechanism-canvas" aria-label="Arm mechanism view" />
    </div>
  );
}

export default memo(ArmMechanismPanel);
