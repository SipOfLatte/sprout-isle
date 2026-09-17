# Sprout Isle

A habit tracker that turns keeping habits into growing a small pixel island.
Health habits grow a grove; work and study habits build a town. Missing a day
never costs you anything. Streak freezes and comeback bonuses help you get
going again.

## Features

- **Habits you can shape:** yes/no or amounts (8 glasses of water), every day,
  chosen weekdays, or N times a week. Edit, pause or delete any time.
- **Game layer:** XP, levels, streaks with freezes, perfect-day and comeback
  bonuses, achievements, and a shop for rewards you set yourself.
- **Insights:** weekly and monthly views with stat tiles, daily completion with a
  7-day rolling mean, a habit × day heatmap, per-habit rates, XP by area, a
  weekday profile and a phi-correlation matrix between habits. Every chart has
  a table view and a CSV export in tidy (long) format for pandas.
- **Private by default:** data lives in your browser's localStorage, with JSON
  backup and restore.

## How the data works

Only raw logs are stored (`logs[date][habitId] = amount`). XP, levels, streaks
and every chart are pure functions over those logs (`src/lib/engine.ts`,
`src/lib/analytics.ts`), so editing a past day recomputes everything
consistently. Both modules are unit tested.

- Completion score gives partial credit: `min(amount / target, 1)`.
- Weekly quotas are scaled to the part of a week inside the period in view.
- Correlations are Pearson's r on binary completion over days both habits were
  due (the phi coefficient), shown only with 14 or more shared days.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173, add ?demo to load 90 days of sample data
npm test
npm run build
```

## Stack

React 19, TypeScript, Vite, d3-scale/d3-shape for chart geometry, zod for
validating stored and imported data. Imports and localStorage are validated
against a schema, CSV exports defuse spreadsheet formulas, and production builds
ship a strict Content Security Policy.
