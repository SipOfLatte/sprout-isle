# Sprout Isle

**A habit tracker where every habit you keep grows a small pixel island.**

Health habits grow a grove, and work and study habits build a town. Missing a day
never takes anything away. Streak freezes and comeback bonuses make it easy to get
going again. Behind the game is a proper analytics page built for looking at your
own behaviour data.

**Live app:** https://sipoflatte.github.io/sprout-isle/
(open the **You** tab and choose **Load sample data** to explore with 90 days of history)

![Today view with the island, level, quests and today's habits](docs/screenshots/today.png)

## Features

### Tracking
- Yes/no habits or amounts (for example 8 glasses of water), with partial progress.
- Schedules: every day, chosen weekdays, or a number of times per week.
- Add, edit, pause and delete habits at any time. Log up to 7 days back.
- Browse any past day from the week strip or the calendar, or by selecting a day in a chart.
- One-off to-dos that also earn XP.

### Game layer
- XP by effort, levels, and a daily streak with freezes (one earned every 7 days, up to 2).
- Perfect-day and comeback bonuses.
- **Weekly quests:** three quests each Monday, sized from your last four weeks.
  The first always targets the habit that has been slipping most.
- **Companion pet:** hatch a sprout spirit, fox or frog that grows through three stages as you finish habits
  and greets you each day. After a missed day it welcomes you back rather than pointing at the gap.
- **Weekly boss battles:** six bosses with HP sized from your recent weeks. Every finished habit deals
  damage by effort, so a partial week still counts. Wins pay XP and rare island items.
- A floating island with 16 landmarks unlocked by area level, and a sky that follows the time of day.
- **Shop:** spend coins on buildings, decorations, sky items and pets, then place them on the island.
  Real-life rewards you define yourself live in the same tab.
- Achievements.

![Island store in the Shop tab](docs/screenshots/shop.png)

### Insights
Week and month views with a single filter row (period, area) that scopes everything:

| Chart | What it shows |
|---|---|
| Stat tiles | Completion, XP, perfect days and habits completed, compared with the same point last period |
| Daily completion | Column per day with a 7-day rolling mean |
| Habit grid | Habit × day heatmap on a sequential scale |
| By habit | Completion rate per habit, sorted |
| XP earned | Stacked columns by area plus bonuses |
| Weekly rhythm | Mean score per weekday over 12 weeks, best day highlighted |
| Habits that move together | Phi-coefficient matrix between habits over 60 days |

Every chart has hover and keyboard tooltips and a **Show table** view.
**Export CSV** produces a tidy long-format file (one row per habit per day) ready for pandas.

![Insights page](docs/screenshots/insights.png)

### Mood & energy
A daily check-in (mood and energy, 1 to 5) feeds a second Insights view:

| Chart | What it shows |
|---|---|
| Stat tiles | Average mood and energy vs the same point last period, check-in days, mood on perfect days vs others |
| Mood and energy | Daily ratings with 7-day averages |
| What lines up with better mood | Difference in average rating on days each habit was done vs skipped, same day and next day, with 95% confidence intervals |
| Completion vs mood | One dot per day, least-squares line and Pearson's r |
| Mood by weekday | Average rating per weekday over 12 weeks |

![Mood and energy insights](docs/screenshots/mood-insights.png)

<p>
  <img src="docs/screenshots/mobile-today.png" alt="Today view on a phone" width="300">
  <img src="docs/screenshots/island.png" alt="Island page" width="520">
</p>

### Sync (optional)
Sync between devices through a secret GitHub Gist in your own account, using a
token that can only access gists. See [docs/SYNC.md](docs/SYNC.md).

## How the data works

Only raw inputs are stored: habit definitions, `logs[date][habitId] = amount`,
to-dos, rewards and the quests generated each week. Everything else (XP, levels,
streaks, quest progress, every chart) is computed from those inputs by pure,
unit-tested functions. Editing a past day therefore updates everything
consistently, with no stored totals to drift out of step.

| Module | Responsibility |
|---|---|
| [`src/lib/engine.ts`](src/lib/engine.ts) | Scheduling, XP, levels, streaks, freezes, bonuses |
| [`src/lib/analytics.ts`](src/lib/analytics.ts) | Period windows, completion scores, rolling mean, weekday profile, correlations, tidy export |
| [`src/lib/quests.ts`](src/lib/quests.ts) | Weekly quest generation and evaluation |
| [`src/lib/wellbeing.ts`](src/lib/wellbeing.ts) | Mood and energy trends, habit effects, completion vs rating |
| [`src/lib/stats.ts`](src/lib/stats.ts) | Welch confidence intervals, Student's t quantiles, least-squares fit |
| [`src/lib/bosses.ts`](src/lib/bosses.ts) | Boss HP sizing, damage, wins and loot |
| [`src/lib/pets.ts`](src/lib/pets.ts) | Companion growth and mood |
| [`src/lib/catalog.ts`](src/lib/catalog.ts) | Store items, boss info and island placement spots |
| [`src/lib/schema.ts`](src/lib/schema.ts) | zod schema for anything read from storage, backups or sync |
| [`src/sync/`](src/sync) | Gist client and sync conflict logic |
| [`src/world/`](src/world) | Pixel sprites and island scene builder |

### Method notes
- **Completion score** gives partial credit: `min(amount / target, 1)`.
- **Weekly quotas** are scaled to the part of a week inside the period being viewed,
  so month edges aren't penalised.
- **Period comparisons** use the same number of elapsed days in the previous period.
- **Correlation** is Pearson's r on binary completion over days both habits were due,
  which for two binary series is the phi coefficient. Pairs need at least 14 shared
  days and some variation, otherwise they show as n/a.
- **Habit effects** compare mean rating on days a habit was done against days it was due but skipped,
  over the last 90 days, using Welch's t interval (unequal variances). Each group needs at least 5 days.
  The next-day version pairs each day's habit with the following day's rating. The interval is checked
  against `scipy.stats.ttest_ind(equal_var=False)` in the tests. These are associations, not causes.
- **Boss HP** is 85% of your average weekly damage over the last four weeks (easy habits hit for 1,
  medium 2, hard 3, to-dos 1, perfect days 2), or 60% of this week's scheduled damage for new players.
- **Quest targets** use the last four weeks: habit quests aim for the recent rate
  plus 20 percentage points, area quests for the recent score plus 10.
- **Chart colours** were checked for colour-vision deficiency separation and contrast
  in both light and dark themes.

## Security and privacy

- Data stays in your browser unless you turn on sync.
- Stored data, imported backups and synced data are validated against a schema with size limits before use.
- CSV exports defuse values that spreadsheets would run as formulas.
- Production builds ship a strict Content Security Policy that only allows connections to the GitHub API.
- The sync token is stored separately from app data, is never included in backups, and is only sent to `api.github.com`.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173 (add ?demo to load sample data)
npm test
npm run build
```

Pushing to `main` runs the tests, builds, and deploys to GitHub Pages through
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

## Stack

React 19, TypeScript, Vite, d3-scale and d3-shape for chart geometry, zod for
validation, Vitest for tests. Fonts are Pixelify Sans and Atkinson Hyperlegible,
self-hosted.

## License

[MIT](LICENSE)
