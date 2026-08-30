// Goals on handicap — the head start the lower-handicap team is given.
//
// Grass and arena are different rules, and the app now carries both.
//
// GRASS — HPA Rules & Regulations. The handicap difference is multiplied by the
// chukkas to be played and divided by 6, the number of chukkas a grass handicap
// is based on. Any fraction counts as half a goal.
//
// ARENA — HPA Arena Polo Year Book, Rule 17(b):
//   "In all matches played under handicap conditions the higher handicapped
//    team shall concede to the lower handicapped team the difference in the
//    handicaps multiplied by two."
// Flat ×2. It is NOT scaled by the number of chukkas, and not divided by
// anything — an arena handicap is already based on a four-chukka game
// (Rule 17(a)), so there is no pro-rating to do.
//
// Which rule a match uses follows the day's Ground: pick Arena and the arena
// rule applies, with no separate switch to remember.
//
// The flag still lives ON THE MATCH rather than being read from the ground every
// time a score is drawn, and it is set by normaliseHandicapRules() below when a
// fixture is loaded or saved. Two reasons. A match that already has a recorded
// result is left alone — results were entered against whatever the app computed
// at the time, some hand-corrected to reach the right answer, and re-deriving
// would silently restate them. And because the value is fixed on the record,
// live scoring and the printed programme cannot drift apart mid-match.

export const matchChukkas = (match) => {
  const n = Number(match && match.chukkas);
  return Number.isFinite(n) && n > 0 ? n : 4; // matches default to 4 chukkas
};

export const isArenaGround = (ground) =>
  String(ground || '').trim().toLowerCase().includes('arena');

// The head start in goals, and which team gets it. `teamHandicap` is passed in
// so this module stays free of the PDF/app helpers that provide it.
export function headStartGoals(match, teamHandicapFn) {
  const hA = teamHandicapFn(match && match.teamA) || 0;
  const hB = teamHandicapFn(match && match.teamB) || 0;
  if (hA === hB) return { goals: 0, team: null };

  // A continuation carries the score forward from an earlier day, and that
  // score already includes the head start awarded then. Awarding it again here
  // would hand the lower team the same goals twice.
  if (match && match.continuation) return { goals: 0, team: null };

  const diff = Math.abs(hA - hB);
  const lower = hA < hB ? 'A' : 'B';

  if (match && match.arenaHandicap) {
    return { goals: diff * 2, team: lower };
  }

  const units = diff * matchChukkas(match);
  const goals = Math.floor(units / 6) + (units % 6 > 0 ? 0.5 : 0);
  return { goals, team: lower };
}

// The head start for one side — 0 for the higher-handicap team.
export function headStartFor(match, teamKey, teamHandicapFn) {
  const { goals, team } = headStartGoals(match, teamHandicapFn);
  return team === teamKey ? goals : 0;
}

// Set each match's handicap rule from the ground of the day it is played on.
//
// Skips any match that already has a score: that result was reached under the
// rule in force when it was entered, and changing the rule underneath it would
// restate a finished match. Everything else — including fixtures already in the
// diary but not yet played — picks up the right rule with no captain action.
//
// Returns a new object only if something changed, so callers can avoid a
// pointless write.
export function normaliseHandicapRules(details) {
  let changed = false;
  const out = {};
  for (const [fid, det] of Object.entries(details || {})) {
    const days = (det && det.days) || [];
    const nextDays = days.map((day) => {
      const arena = isArenaGround(day && day.ground);
      const matches = (day && day.matches) || [];
      const nextMatches = matches.map((m) => {
        const scored = m && (m.scoreA != null || m.scoreB != null);
        if (scored || !!m.arenaHandicap === arena) return m;
        changed = true;
        return { ...m, arenaHandicap: arena };
      });
      return changed ? { ...day, matches: nextMatches } : day;
    });
    out[fid] = changed ? { ...det, days: nextDays } : det;
  }
  return changed ? out : details;
}
