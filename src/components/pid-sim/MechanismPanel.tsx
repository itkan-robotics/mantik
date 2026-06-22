import { memo, useEffect, useRef } from 'react';
import { REFERENCE_PLANT } from '@/lib/pid-sim/reference/elevatorReference';
import { motorRotationsToHeightM } from '@/lib/pid-sim/physics/units/encoderUnits';
import type { PlantConfig } from '@/lib/pid-sim/types';
import type { ElevatorSim } from '@/lib/pid-sim/physics/elevatorSim';

interface Props {
  simRef: React.RefObject<ElevatorSim | null>;
  setpoint: number;
  highlight?: boolean;
}

function MechanismPanel({ simRef, setpoint, highlight }: Props) {
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

      const sim = simRef.current;
      const plant: PlantConfig = sim?.getPlantConfig() ?? REFERENCE_PLANT;
      const latest = sim?.getLatest();
      const pos = latest?.position ?? plant.startHeightM;
      const sp =
        latest?.setpoint ??
        motorRotationsToHeightM(setpointRef.current, plant);

      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = container.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.fillStyle = '#141414';
      ctx.fillRect(0, 0, w, h);

      const margin = 48;
      const shaftLeft = w * 0.28;
      const shaftRight = w * 0.42;
      const floorY = h - margin;
      const topY = margin;
      const travelH = floorY - topY;
      const scale = travelH / plant.maxHeightM;

      ctx.strokeStyle = '#666';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(shaftLeft, floorY);
      ctx.lineTo(shaftLeft, topY);
      ctx.moveTo(shaftRight, floorY);
      ctx.lineTo(shaftRight, topY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(shaftLeft - 10, topY);
      ctx.lineTo(shaftRight + 10, topY);
      ctx.stroke();

      const limit0Y = floorY;
      const limitMaxY = floorY - plant.maxHeightM * scale;
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(shaftLeft - 30, limit0Y);
      ctx.lineTo(shaftRight + 80, limit0Y);
      ctx.moveTo(shaftLeft - 30, limitMaxY);
      ctx.lineTo(shaftRight + 80, limitMaxY);
      ctx.stroke();
      ctx.setLineDash([]);

      const spY = floorY - sp * scale;
      ctx.strokeStyle = '#ff8c42';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(shaftLeft - 40, spY);
      ctx.lineTo(shaftRight + 100, spY);
      ctx.stroke();
      ctx.setLineDash([]);

      const carriageY = floorY - pos * scale;
      const carriageW = shaftRight - shaftLeft + 24;
      ctx.fillStyle = '#4a9eff';
      ctx.fillRect(shaftLeft - 12, carriageY - 14, carriageW, 28);
      ctx.strokeStyle = '#2d6cb5';
      ctx.lineWidth = 2;
      ctx.strokeRect(shaftLeft - 12, carriageY - 14, carriageW, 28);

      ctx.strokeStyle = '#aaa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo((shaftLeft + shaftRight) / 2, topY);
      ctx.lineTo((shaftLeft + shaftRight) / 2, carriageY - 14);
      ctx.stroke();

      ctx.fillStyle = '#ccc';
      ctx.font = '12px JetBrains Mono, monospace';
      ctx.fillText('0 m', shaftRight + 16, limit0Y + 4);
      ctx.fillText(`${plant.maxHeightM} m`, shaftRight + 16, limitMaxY + 4);
      ctx.fillText(`pos ${pos.toFixed(2)} m`, shaftRight + 16, carriageY);
      ctx.fillStyle = '#ff8c42';
      ctx.fillText(`set ${sp.toFixed(2)} m`, shaftRight + 16, spY - 8);

      ctx.fillStyle = '#888';
      ctx.font = '11px Cairo, sans-serif';
      ctx.fillText('Blue = carriage', margin, topY - 8);
      ctx.fillStyle = '#ff8c42';
      ctx.fillText('Orange dashed = setpoint', margin + 120, topY - 8);
    };

    const scheduleDraw = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    const ro = new ResizeObserver(scheduleDraw);
    ro.observe(container);

    const sim = simRef.current;
    const unsub = sim?.subscribe(scheduleDraw);

    return () => {
      ro.disconnect();
      unsub?.();
      cancelAnimationFrame(rafRef.current);
    };
  }, [simRef, setpoint]);

  return (
    <div className={`pid-mechanism-panel ${highlight ? 'highlighted' : ''}`}>
      <div className="pid-panel-header pid-subpanel-header">
        <span>Mechanism</span>
        <span className="pid-panel-sub">Elevator · side view</span>
      </div>
      <div ref={containerRef} className="pid-mechanism-viewport">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

export default memo(MechanismPanel);
