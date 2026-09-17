import { useEffect, useMemo, useState } from 'react';
import { AREA_LEVEL_BASE, levelInfo } from '../lib/engine';
import { useFx } from '../state/fx';
import { useStore } from '../state/store';
import { buildScene, SEED_TARGET, skyPhase, W } from '../world/scene';

function useHour() {
  const [hour, setHour] = useState(() => new Date().getHours());
  useEffect(() => {
    const id = setInterval(() => setHour(new Date().getHours()), 5 * 60_000);
    return () => clearInterval(id);
  }, []);
  return hour;
}

export function Isle({ variant = 'full', register = false }: { variant?: 'full' | 'banner'; register?: boolean }) {
  const { progress, state } = useStore();
  const { registerIsle, landed } = useFx();
  const hour = useHour();

  const levels = {
    health: levelInfo(progress.areaXp.health, AREA_LEVEL_BASE).level,
    work: levelInfo(progress.areaXp.work, AREA_LEVEL_BASE).level,
  };
  const phase = skyPhase(hour);
  const rects = useMemo(() => buildScene(levels, phase), [levels.health, levels.work, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const viewBox = variant === 'banner' ? `0 20 ${W} 58` : `12 18 136 68`;
  const target = landed ? SEED_TARGET[landed.area] : null;

  return (
    <svg
      ref={register ? registerIsle : undefined}
      className={`isle isle--${variant}`}
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid slice"
      shapeRendering="crispEdges"
      role="img"
      aria-label={`${state.worldName}: health grove at level ${levels.health}, work town at level ${levels.work}, ${phase} sky`}
    >
      {rects.map((r) => (
        <rect key={`${r.x},${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
      ))}
      {target && landed && (
        <g key={landed.id} className="sprout" style={{ transformOrigin: `${target.x}px ${target.y}px` }}>
          <rect x={target.x} y={target.y - 3} width={1} height={3} fill="#3F7A3A" />
          <rect x={target.x - 2} y={target.y - 4} width={2} height={1} fill="#8CCB5E" />
          <rect x={target.x + 1} y={target.y - 5} width={2} height={1} fill="#8CCB5E" />
          <rect x={target.x - 4} y={target.y - 8} width={1} height={1} fill="#FFD166" />
          <rect x={target.x + 4} y={target.y - 9} width={1} height={1} fill="#FFD166" />
          <rect x={target.x} y={target.y - 11} width={1} height={1} fill="#FFFFFF" />
        </g>
      )}
    </svg>
  );
}
