import { levelInfo, MAX_FREEZES } from '../lib/engine';
import { useStore } from '../state/store';
import { Icon } from './Icon';

export function PlayerBar() {
  const { progress } = useStore();
  const lvl = levelInfo(progress.totalXp);
  const segments = 20;
  const filled = Math.floor(lvl.fraction * segments);

  return (
    <div className="player">
      <div className="player__level">
        <span className="player__lv">Level {lvl.level}</span>
        <span className="player__xp">
          {lvl.intoLevel} / {lvl.levelSpan} XP
        </span>
      </div>
      <div
        className="xpbar"
        role="progressbar"
        aria-label="Progress to next level"
        aria-valuemin={0}
        aria-valuemax={lvl.levelSpan}
        aria-valuenow={lvl.intoLevel}
      >
        {Array.from({ length: segments }, (_, i) => (
          <span key={i} className={i < filled ? 'on' : ''} />
        ))}
      </div>
      <dl className="player__stats">
        <div>
          <dt>
            <Icon name="flame" size={14} /> Streak
          </dt>
          <dd>
            {progress.streak} {progress.streak === 1 ? 'day' : 'days'}
          </dd>
        </div>
        <div>
          <dt>
            <Icon name="coin" size={14} /> Coins
          </dt>
          <dd>{progress.coins}</dd>
        </div>
        <div title="A freeze covers a missed day so your streak survives. You earn one every 7 streak days.">
          <dt>
            <Icon name="freeze" size={14} /> Freezes
          </dt>
          <dd>
            {progress.freezes} of {MAX_FREEZES}
          </dd>
        </div>
      </dl>
    </div>
  );
}
