# Domain Rules Reference

The polo / HPA rules the app implements, and where each lives in code. This is the
doc to read before changing anything that touches handicaps, head starts,
scheduling, or scores — get these wrong and the printed programme or the live
scoreboard will be wrong.

Line numbers are indicative (the file moves as it's edited); the function names are
the reliable anchors. All code is in `src/`.

---

## 1. HPA head-start (handicap advantage)

When two teams have different aggregate handicaps, the lower-handicap team is
awarded a head start in goals before play. The formula:

```
units = |handicapA − handicapB| × chukkas
headStart = floor(units / 6) + (units mod 6 > 0 ? 0.5 : 0)
```

- Awarded to the **lower-handicap** team; the higher-handicap team gets `0`.
- `chukkas` defaults to **4** when a match's `chukkas` field is unset or invalid.
- The `÷ 6` reflects the HPA convention that a full handicap difference is spread
  over 6 chukkas; any leftover part-goal rounds **up to half a goal**.

Worked example: a 2-goal difference over 4 chukkas → `units = 8`,
`floor(8/6) = 1`, remainder `2 > 0` → `+0.5`, so **1½ goals** to the lower team.

**Implemented in two mirrored copies — keep them in step:**

- `liveHeadStart(match, teamKey)` in `DruidsApp.jsx` (~line 2893), with
  `matchChukkas(match)` (~2889) supplying the default-4.
- `pdfHeadStart(match, teamKey)` in `tournamentPdf.js` (~line 132), with its own
  `matchChukkas` (~89).

Both compute `Math.floor(units / 6) + (units % 6 > 0 ? 0.5 : 0)` where
`units = |hA − hB| × chukkas`. This is arithmetically identical to
`floor(|hA − hB| × chukkas / 6) + …`. If you change one, change the other, or the
live screen and the programme will disagree.

Halves are rendered by `fmtHalf` (app) / `fmtScore` (PDF) as e.g. `1½`.

---

## 2. Team handicap — and the shirt-number rule

The single source of truth is **`teamHandicap(team)`**, exported from
`tournamentPdf.js` (~line 109) and imported into `DruidsApp.jsx` (top of file).
Both the live screen and the PDF call the same function, so they always agree.

A team's handicap is the **sum of the handicaps of the four counted players**. Which
four are counted depends on shirt numbers:

- **If ≥ 4 players carry a numeric shirt number ≥ 1:** the **four LOWEST shirt
  numbers** are counted — polo positions 1, 2, 3, 4. This is deliberate: a 5th
  player or substitute is excluded **regardless of their handicap**. Do not
  "helpfully" count the four highest handicaps instead — that is wrong for this app.
- **If fewer than 4 players carry a shirt number:** it falls back to the four
  **highest** handicaps (a best-effort estimate when numbers aren't assigned yet).
- If no player handicaps are present at all, it falls back to the team's stored
  `team.handicap` value.

```js
// tournamentPdf.js, inside teamHandicap()
if (numbered.length >= 4) {
  counted = numbered.sort((a, b) => a.no - b.no).slice(0, 4).map(x => x.p); // shirts 1–4
} else {
  counted = [...players].sort((a, b) => (hcp(b) ?? -Inf) - (hcp(a) ?? -Inf)).slice(0, 4);
}
return counted.map(hcp).filter(n => n != null).reduce((s, n) => s + n, 0);
```

> **Printed totals can be typos.** When a source programme prints a team total that
> disagrees with the player sum, **the player sum wins** — flag the mismatch rather
> than trusting the printed number.

> Not to be confused with: a plain `hsum = players.reduce(...)` used for
> **chukka-draw team balancing** (all players in a pick-up chukka, not a fixture).
> That is a different calculation for a different purpose.

---

## 3. Which score is shown where

There are three renderings of a match score. Getting them straight matters:

| Surface | Shows | Code |
|---|---|---|
| Captain's live **+/− control** | The **raw** stored `scoreA` / `scoreB` (unadjusted) | `DruidsApp.jsx` ~6570, edited via `bumpTeamScore` |
| **Fixture view** display | Raw score **+ head start** | `liveDisplayScore` (`DruidsApp.jsx` ~2909) |
| **PDF** programme | Raw score **+ head start** | `pdfScore` (`tournamentPdf.js` ~150) |

So the **PDF mirrors the fixture-view display** — both add the head start using the
same formula. The **raw, unadjusted** `scoreA` / `scoreB` totals surface only on the
captain's +/− scoring control (where the captain is entering actual goals scored).

```js
// DruidsApp.jsx
const liveDisplayScore = (match, teamKey) =>
  fmtHalf((Number(teamKey === 'A' ? match.scoreA : match.scoreB) || 0)
          + liveHeadStart(match, teamKey));

// tournamentPdf.js
const pdfScore = (match, teamKey) =>
  fmtScore((Number(match['score' + teamKey]) || 0) + pdfHeadStart(match, teamKey));
```

The fixture view also prints a note such as "incl. +½ on handicap to …" so viewers
know the displayed figure includes the head start.

> Note: an earlier internal note described the PDF as mirroring the *raw*
> `scoreA`/`scoreB` and the live-scoring screen as head-start-adjusted. The code is
> the other way round, as tabulated above — the live +/− control is the raw one.

---

## 4. Chukka scheduling — `buildSchedule(players, startMin)`

The draw generator in `DruidsApp.jsx` (~line 498). Constants: `CHUKKA_INTERVAL_MIN
= 15`, `SLOTS_PER_CHUKKA = 8` (4-a-side ⇒ 8 slots), `MIN_PLAYERS_PER_CHUKKA = 4`.
Its job is to honour every booking, respect availability, enforce a 4-a-side format,
spread each player's chukkas across the evening, and keep rest gaps.

Algorithm, in order:

1. **Priority order.** VIP players first, then regulars, roster order preserved as
   the scheduling priority. Every rostered player is placed.
2. **Number of chukkas.** `numChukkas = max(1, ceil(totalRequested / 8),
   maxIndividualRequest)`, then reduced only while a chukka would fall below
   4-a-side, to avoid 1v1 / 2v1 chukkas.
3. **Availability windows.** `availableFrom` → earliest chukka index;
   `availableTo` → latest. A player is only placed inside their
   `[from, to]` window. Requests are capped to what the window and the total
   chukka count allow (VIPs are never capped below their request for capacity).
4. **Placement & spread.** Greedily fill the **least-loaded** available chukka each
   pass, never exceeding 8 players (the 4-a-side cap). This naturally spreads a
   player's chukkas across the evening.
5. **Rest gaps / no-consecutive.** A player flagged `noConsecutive` is placed with a
   minimum step of 2 chukkas so they are never back-to-back. There is **no**
   adjacent fallback — such a player is left short rather than seated in
   consecutive chukkas.
6. **Redistribution.** While any chukka is below 4 players, move a movable non-VIP
   from the most-loaded chukka into it, respecting the no-consecutive constraint.
7. **Team assignment with fixed bib colours.** The first four roster players are
   seeded to alternating colours (even index → White/B, odd → Blue/A). Each chukka
   is split into `teamA` / `teamB`, players sorted by handicap, placed to keep their
   fixed colour where possible, else to balance team size, else to balance the
   team-handicap sum.
8. **Lopsided-team rebalance** (`rebalanceChukkaTeams`, ~line 470): for any chukka
   whose team-handicap gap exceeds `MAX_OK_TEAM_DIFF = 2`, repeatedly swap the one
   A/B pair that most reduces the gap.

Returns `{ chukkas, numChukkas, totalSlots, unplaced, capped, reduced }` — the
extra fields let the UI tell the captain who couldn't be fully placed and why.

---

## 5. `importMatchDetails` — pasting a tournament draw

`DruidsApp.jsx` (~line 2675). The captain pastes a JSON block with a `matches`
array; the function:

- **Matches fixtures case-insensitively by name:**
  `f.name.trim().toLowerCase() === fxName.toLowerCase()`. No existing fixture? It
  creates an ad-hoc one (`id = 'adhoc-' + slug`, `adhoc: true`).
- **Merges days by `dateLabel`:** existing days are keyed by `dateLabel` in a `Map`,
  and each incoming day **overwrites** the day with the same label. Days are then
  re-sorted by `dayOrder` (which parses the month name + day number out of
  `dateLabel`).

So re-importing a day replaces that day's matches wholesale; importing a new day
adds it in calendar order.

---

## 6. Divisions — real field vs the label trick

Two genuinely different mechanisms; don't conflate them.

**Proper `division` field (use this for divisions).** Each match has an optional
`division` text field (edited on the fixtures tab, placeholder "Div"). In
`tournamentPdf.js`:

- `teamsByDivision(matches)` (~616) groups distinct teams by
  `(m.division || '').trim()`, **ignoring the programme time order**. This is
  deliberate: divisional draws interleave divisions across the running order, so
  the division sheets collect teams across the whole day regardless of position.
- `divisionRank` / `divisionHeading` sort and label divisions so they read
  DIVISION I, II, III… The "Team sheets by division" button is gated on at least one
  match having a non-empty `division`.

**The consecutive-match label trick (a different feature).** For round-robin / team-
list blocks, `tournamentPdf.js` (~828) merges **consecutive** matches that share the
same time + label into one printed block so the heading prints once. This grouping
is **positional** — it only works when the matches are adjacent in the running
order.

> Rule of thumb: to model a division, set the `division` field. The label-adjacency
> trick is not a division system and breaks the moment matches from the same
> division are not next to each other.

---

## Verifying changes

Do **not** grep raw PDF output to check a formula — `½` and `–` encode as WinAnsi
bytes and UTF-8 substring search is unreliable. Instead import the real functions
into a throwaway Node script:

```js
import { teamHandicap } from '../src/tournamentPdf.js';
// build a fake team of players with { handicap, shirtNo } and assert the sum
```

Reproduce the head start by hand from the formula in §1 and compare against
`liveHeadStart` / `pdfHeadStart` for a few handicap-difference / chukka-count pairs.
</content>
