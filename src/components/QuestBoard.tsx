import { addDays, diffDays, startOfWeek } from '../lib/dates';
import { evaluateQuest } from '../lib/quests';
import { useStore } from '../state/store';
import { Icon } from './Icon';

export function QuestBoard() {
  const { state, today } = useStore();
  const weekStart = startOfWeek(today);
  const quests = state.quests[weekStart] ?? [];
  const daysLeft = diffDays(today, addDays(weekStart, 6));

  if (quests.length === 0) return null;

  const statuses = quests.map((q) => evaluateQuest(state, q, weekStart, today));
  const done = statuses.filter((s) => s.doneOn).length;

  return (
    <section className="quests" aria-labelledby="quests-title">
      <header className="quests__head">
        <h2 id="quests-title">This week's quests</h2>
        <span className="quests__meta">
          {done === quests.length ? 'All done' : daysLeft === 0 ? 'Last day' : `${daysLeft + 1} days left`}
        </span>
      </header>
      <ul className="quest-list">
        {statuses.map((s) => {
          const fraction = Math.min(1, s.progress / s.target);
          return (
            <li key={s.quest.id} className={`quest${s.doneOn ? ' is-done' : ''}`}>
              <span className="quest__icon" aria-hidden="true">
                <Icon name={s.doneOn ? 'check' : 'star'} size={14} />
              </span>
              <div className="quest__body">
                <span className="quest__title">
                  {s.title} <small>+{s.quest.xp} XP</small>
                </span>
                <div
                  className="quest__bar"
                  role="progressbar"
                  aria-label={s.title}
                  aria-valuemin={0}
                  aria-valuemax={s.target}
                  aria-valuenow={Math.min(s.progress, s.target)}
                >
                  <span style={{ width: `${Math.round(fraction * 100)}%` }} />
                </div>
              </div>
              <span className="quest__reward">
                {s.doneOn ? (
                  'Done'
                ) : (
                  <>
                    {Math.min(s.progress, s.target)}
                    {s.unit}/{s.target}
                    {s.unit}
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="quests__foot">New quests arrive each Monday, sized from your last four weeks.</p>
    </section>
  );
}
