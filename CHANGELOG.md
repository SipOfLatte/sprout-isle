# Changelog

## 2.4.2 (2026-09-18)

### Changed
- The Calendar button moved from under the week strip into the day header, next to the button that jumps back to today. On phones it shows just the calendar icon so the heading stays on one line.
- On phones, text fields and their buttons (Rename, Connect) share a row instead of the button dropping underneath.
- The island store shows two items per row on phones, which halves the length of the page.
- Small buttons like Show table no longer break onto two lines.

## 2.4.1 (2026-09-17)

### Changed
- The Mood & energy filter now reads All, Mood, Energy, matching All, Health, Work on the Habits view. All comes first and is selected by default.

## 2.4.0 (2026-09-17)

### Added
- A Both option on the Mood & energy view. The habit effects, scatter plot, weekday chart and perfect-days tile then show mood and energy together, in their own colours.

### Changed
- The All, Health and Work filter only appears on the Habits view. Check-ins aren't tied to a part of life, so it did nothing on Mood & energy.
- Numbers use the Tiny5 pixel font, because Pixelify Sans draws 5 almost like an S. Letters still use Pixelify Sans.
- The habit effects summary quotes habit names, so it reads "on days with "In bed by 11:30"" instead of "on days you do in bed by 11:30".

## 2.3.1 (2026-09-17)

### Changed
- Clarified the README, sync guide and this changelog.
- Added comments to every source file explaining what it does, plus notes on the less obvious logic.

## 2.3.0 (2026-09-17)

### Added
- A daily mood and energy check-in on Today. It's two taps from 1 to 5 and either can be skipped. Checking in earns 5 XP and counts as showing up for your streak, and past days show what you logged.
- Your companion comforts you on a low mood day instead of cheering.
- A Mood & energy view in Insights, which has its own address (`#insights/mood`). It shows:
  - average mood and energy against the same point last period, days checked in, and mood on perfect days vs other days
  - daily ratings with 7-day averages
  - how each habit lines up with your rating on the same day and the next, as a difference in averages with a Welch 95% confidence interval
  - a completion vs mood scatter plot with a least-squares line and Pearson's r
  - mood or energy by weekday
- Mood and energy columns in the CSV export.
- Two achievements: Checking in (7 days) and Know thyself (30 days).
- Check-ins in the sample data. Walks and deep work lift mood there, and going to bed on time lifts the next day's energy, and the analysis picks both up.

## 2.2.0 (2026-09-17)

### Added
- A companion pet. You hatch a sprout spirit, fox or frog, and it grows through three stages as you finish habits. It lives on your island and greets you on Today. After a missed day it welcomes you back rather than pointing at the gap.
- Weekly boss battles against six bosses: the Procrastination Slime, Doomscroll Wraith, Snooze Golem, Couch Kraken, Chaos Gremlin and Burnout Ember. HP is based on your last four weeks. Finished habits deal damage by effort, and to-dos and perfect days hit too. A win pays 80 XP, plus a rare item the first time you beat each boss.
- An island store in a new Shop tab, with 19 buildings, decorations, sky items and pets that unlock as you level up. Your real-life rewards moved into the same tab.
- Decorating from the Island page, with eight spots along a new front ledge and three in the sky. Pets you buy move in by themselves.
- Four achievements: Giant slayer, Monster hunter, Decorator and A new friend.

### Changed
- The island has a deeper meadow at the front to make room for decorations.
- The Rewards tab is now called Shop.

## 2.1.0 (2026-09-17)

### Added
- A week strip on Today. Tap any day this week to open it; a small bar under each day shows how much got done.
- A calendar for jumping to any past day, shaded by completion.
- Selecting a day in the Daily completion, Habit grid or XP charts opens that day.
- The day you're viewing is part of the URL, so reloading and the back button keep your place.
- Past days show when a streak freeze was used.

### Changed
- Days more than a week old are read-only, so streaks and XP can't be changed after the fact.
- "X of Y done" counts a times-per-week habit only while its weekly quota is still open, or on a day it was done.

## 2.0.0 (2026-09-17)

### Added
- Weekly quests. Three arrive each week, based on your last four weeks, and pay bonus XP when finished.
- Two quest achievements.
- Optional sync between devices through a secret GitHub Gist. When both sides have changed, the app asks which copy to keep.
- Automatic tests, build and deploy to GitHub Pages on every push to `main`.
- A README with screenshots, a sync guide, this changelog and a license.

### Changed
- The island view is cropped tighter so the island fills the frame.
- On phones, quests appear below today's habits.
- The island name field updates when data is imported or synced.

## 1.0.0 (2026-09-17)

### Added
- Habits that are yes/no or amounts, repeating daily, on chosen weekdays, or a number of times per week. One-off to-dos.
- XP, levels, streaks with freezes, perfect-day and comeback bonuses, achievements and a rewards shop.
- A pixel island that grows with your Health & body and Work & study levels.
- Insights with week and month views, six charts that each have a table view, and CSV export.
- Local storage with JSON backup and restore checked against a schema, plus sample data.
