import { useState } from 'react';
import { Decorate, SlotMarkers } from '../components/Decorate';
import { Icon } from '../components/Icon';
import { Isle } from '../components/Isle';
import { AREA_LEVEL_BASE, levelInfo } from '../lib/engine';
import { AREA_LABEL, type Area } from '../lib/types';
import { useStore } from '../state/store';
import { LANDMARKS } from '../world/scene';

export function WorldPage() {
  const { state, progress } = useStore();
  const [showSpots, setShowSpots] = useState(false);

  return (
    <div className="world-page">
      <header className="page-head">
        <h1>{state.worldName}</h1>
      </header>
      <div className="world-frame">
        <Isle variant="full" register />
        {showSpots && <SlotMarkers />}
      </div>

      <Decorate showSpots={showSpots} onToggleSpots={() => setShowSpots((s) => !s)} />

      <div className="areas">
        {(['health', 'work'] as Area[]).map((area) => {
          const info = levelInfo(progress.areaXp[area], AREA_LEVEL_BASE);
          const marks = LANDMARKS.filter((l) => l.area === area);
          const next = marks.find((l) => l.level > info.level);
          return (
            <section key={area} className={`area-card area-card--${area}`} aria-labelledby={`area-${area}`}>
              <header>
                <h2 id={`area-${area}`}>
                  <Icon name={area === 'health' ? 'leaf' : 'book'} size={14} />
                  {area === 'health' ? 'The grove' : 'The town'}
                </h2>
                <span className="area-card__level">Level {info.level}</span>
              </header>
              <p className="muted">
                Grown by {AREA_LABEL[area].toLowerCase()} habits. {progress.areaXp[area].toLocaleString()} XP so far.
              </p>
              <div className="meter" role="progressbar" aria-label={`${AREA_LABEL[area]} progress to next level`} aria-valuemin={0} aria-valuemax={info.levelSpan} aria-valuenow={info.intoLevel}>
                <span style={{ width: `${Math.round(info.fraction * 100)}%` }} />
              </div>
              <p className="area-card__next">
                {next ? `${info.levelSpan - info.intoLevel} XP until ${next.name.toLowerCase()} appears` : 'Fully grown. Every habit still counts toward your level.'}
              </p>
              <ol className="landmarks">
                {marks.map((l) => {
                  const unlocked = info.level >= l.level;
                  return (
                    <li key={l.name} className={unlocked ? 'is-unlocked' : ''}>
                      <span className="landmarks__level">Lv {l.level}</span>
                      {unlocked ? l.name : 'Not grown yet'}
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}
