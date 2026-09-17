# Changelog

## 2.2.0 (2026-09-17)

### Added
- **Companion pet.** Hatch a sprout spirit, fox or frog. It grows through three stages as you finish habits, lives on your island, and greets you on the Today page. After a missed day it welcomes you back instead of pointing at the gap.
- **Weekly boss battles.** Six bosses (the Procrastination Slime, Doomscroll Wraith, Snooze Golem, Couch Kraken, Chaos Gremlin and Burnout Ember). HP is sized from your last four weeks; every finished habit deals damage by effort, and to-dos and perfect days hit too. A win pays 80 XP and a rare item the first time you beat each kind.
- **Island store.** A Shop tab with 19 things to buy (buildings, decorations, sky items and pets), unlocked by level, alongside your real-life rewards.
- **Decorating.** Place buildings and decorations on eight spots along a new front ledge and three spots in the sky, from the Island page. Store pets move in by themselves.
- Four achievements: Giant slayer, Monster hunter, Decorator, A new friend.

### Changed
- The island has a deeper meadow at the front to make room for decorations.
- The Rewards tab is now Shop, with Island store and Real-life rewards sections.

## 2.1.0 (2026-09-17)

### Added
- A week strip on Today: tap any day this week to open it, with a small bar showing how much of it got done.
- A calendar for jumping to any past day, shaded by completion.
- Selecting a day in the Daily completion, Habit grid or XP charts opens that day.
- The viewed day is part of the URL, so reloading and the browser back button keep your place.
- Past days show whether a streak freeze was used.

### Changed
- Days more than a week old open read-only, so streaks and XP can't be changed after the fact.
- "X of Y done" counts a times-per-week habit only while its weekly quota is still open, or on days it was done.

## 2.0.0 (2026-09-17)

### Added
- Weekly quests: three per week, generated from the last four weeks of history, with progress on the Today page and bonus XP when completed.
- Two quest achievements.
- Optional sync between devices through a secret GitHub Gist, with conflict detection and a choose-a-copy prompt.
- Automatic test, build and deploy to GitHub Pages on every push to `main`.
- Documentation: README with screenshots, sync guide, changelog, license.

### Changed
- The island view is cropped tighter so the island fills the frame.
- On phones, quests appear below today's habits.
- The island name field updates when data is imported or synced.

## 1.0.0 (2026-09-17)

### Added
- Habits (yes/no or amounts; daily, chosen weekdays, or times per week) and one-off to-dos.
- XP, levels, streaks with freezes, perfect-day and comeback bonuses, achievements and a rewards shop.
- A pixel island that grows with Health & body and Work & study levels.
- Insights with week and month views, six charts with table views, and CSV export.
- Local storage with schema-validated JSON backup and restore, plus sample data.
