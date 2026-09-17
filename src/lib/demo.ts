// Dev-only helper behind the ?demo URL flag. Production builds never load it.

import { todayKey } from './dates';
import { sampleState } from './sample';
import { loadState, saveState } from './storage';

/** Seeds sample data only when nothing has been tracked yet. */
export function seedDemo() {
  if (loadState().habits.length === 0) saveState(sampleState(todayKey()));
}
