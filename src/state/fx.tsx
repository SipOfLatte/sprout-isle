// The one showpiece motion: finishing a habit sends a pixel seed into the
// island, where it lands with a small sprout. Also hosts toasts.

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { SEED_TARGET, type SeedKind } from '../world/scene';

interface Seed {
  id: number;
  area: SeedKind;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

interface Toast {
  id: number;
  title: string;
  body?: string;
  undo?: () => void;
}

/** How long a toast with an Undo button stays up. */
export const UNDO_MS = 5000;

interface Fx {
  launchSeed: (from: HTMLElement, area: SeedKind) => void;
  registerIsle: (svg: SVGSVGElement | null) => void;
  landed: { area: SeedKind; id: number } | null;
  toast: (title: string, body?: string) => void;
  /** A toast with an Undo button that stays for UNDO_MS. */
  undoToast: (title: string, undo: () => void, body?: string) => void;
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

  const launchSeed = useCallback((from: HTMLElement, area: SeedKind) => {
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

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const show = useCallback(
    (toast: Omit<Toast, 'id'>, ms: number) => {
      const id = nextId++;
      // Only the latest action can be undone, so a new Undo toast replaces any older one.
      setToasts((t) => [...t.filter((x) => !(toast.undo && x.undo)).slice(-2), { id, ...toast }]);
      setTimeout(() => dismiss(id), ms);
    },
    [dismiss],
  );

  const toast = useCallback((title: string, body?: string) => show({ title, body }, 4200), [show]);
  const undoToast = useCallback((title: string, undo: () => void, body?: string) => show({ title, body, undo }, UNDO_MS), [show]);

  const value = useMemo(() => ({ launchSeed, registerIsle, landed, toast, undoToast }), [launchSeed, registerIsle, landed, toast, undoToast]);

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
          <div className={`toast${t.undo ? ' toast--undo' : ''}`} key={t.id}>
            <div className="toast__text">
              <strong>{t.title}</strong>
              {t.body && <span>{t.body}</span>}
            </div>
            {t.undo && (
              <button
                type="button"
                className="btn btn--tiny"
                onClick={() => {
                  t.undo?.();
                  dismiss(t.id);
                }}
              >
                Undo
              </button>
            )}
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
