// The one showpiece motion: finishing a habit sends a pixel seed into the
// island, where it lands with a small sprout. Also hosts toasts.

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Area } from '../lib/types';
import { SEED_TARGET } from '../world/scene';

interface Seed {
  id: number;
  area: Area;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

interface Toast {
  id: number;
  title: string;
  body?: string;
}

interface Fx {
  launchSeed: (from: HTMLElement, area: Area) => void;
  registerIsle: (svg: SVGSVGElement | null) => void;
  landed: { area: Area; id: number } | null;
  toast: (title: string, body?: string) => void;
}

const FxContext = createContext<Fx | null>(null);

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let nextId = 1;

export function FxProvider({ children }: { children: ReactNode }) {
  const isleRef = useRef<SVGSVGElement | null>(null);
  const [seeds, setSeeds] = useState<Seed[]>([]);
  const [landed, setLanded] = useState<Fx['landed']>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const registerIsle = useCallback((svg: SVGSVGElement | null) => {
    isleRef.current = svg;
  }, []);

  const launchSeed = useCallback((from: HTMLElement, area: Area) => {
    const svg = isleRef.current;
    const id = nextId++;
    if (!svg || prefersReducedMotion()) {
      setLanded({ area, id });
      return;
    }
    const box = svg.getBoundingClientRect();
    const vb = svg.viewBox.baseVal;
    // The isle uses "slice", so work out the rendered scale and offset.
    const scale = Math.max(box.width / vb.width, box.height / vb.height);
    const offX = (box.width - vb.width * scale) / 2;
    const offY = (box.height - vb.height * scale) / 2;
    const target = SEED_TARGET[area];
    const to = { x: box.left + offX + (target.x - vb.x) * scale, y: box.top + offY + (target.y - vb.y) * scale };
    const fromBox = from.getBoundingClientRect();
    const start = { x: fromBox.left + fromBox.width / 2, y: fromBox.top + fromBox.height / 2 };
    const visible = to.y > -40 && to.y < window.innerHeight + 40;
    if (!visible) {
      setLanded({ area, id });
      return;
    }
    setSeeds((s) => [...s, { id, area, from: start, to }]);
  }, []);

  const onSeedDone = useCallback((seed: Seed) => {
    setSeeds((s) => s.filter((x) => x.id !== seed.id));
    setLanded({ area: seed.area, id: seed.id });
  }, []);

  const toast = useCallback((title: string, body?: string) => {
    const id = nextId++;
    setToasts((t) => [...t.slice(-2), { id, title, body }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const value = useMemo(() => ({ launchSeed, registerIsle, landed, toast }), [launchSeed, registerIsle, landed, toast]);

  return (
    <FxContext.Provider value={value}>
      {children}
      <div className="fx-layer" aria-hidden="true">
        {seeds.map((s) => (
          <SeedSprite key={s.id} seed={s} onDone={onSeedDone} />
        ))}
      </div>
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div className="toast" key={t.id}>
            <strong>{t.title}</strong>
            {t.body && <span>{t.body}</span>}
          </div>
        ))}
      </div>
    </FxContext.Provider>
  );
}

function SeedSprite({ seed, onDone }: { seed: Seed; onDone: (s: Seed) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { from, to } = seed;
    const lift = Math.min(160, Math.abs(from.y - to.y) * 0.5 + 60);
    const frames = Array.from({ length: 11 }, (_, i) => {
      const t = i / 10;
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t - Math.sin(Math.PI * t) * lift;
      return { transform: `translate(${x}px, ${y}px) scale(${1 - t * 0.35})`, offset: t };
    });
    const anim = el.animate(frames, { duration: 720, easing: 'cubic-bezier(.45,.05,.55,.95)', fill: 'forwards' });
    anim.onfinish = () => onDone(seed);
    return () => anim.cancel();
  }, [seed, onDone]);
  return <div ref={ref} className={`seed seed--${seed.area}`} />;
}

export function useFx(): Fx {
  const fx = useContext(FxContext);
  if (!fx) throw new Error('useFx must be used inside FxProvider');
  return fx;
}
