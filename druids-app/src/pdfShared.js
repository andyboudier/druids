// Small, dependency-free values shared between the PDF generator and the app UI.
//
// These live here rather than in tournamentPdf.js because the club component
// uses both on every render. Importing them from tournamentPdf.js statically
// pulled jsPDF and the whole ~450 kB generator into the eager bundle, so the app
// could not paint until the print code had downloaded and parsed. Keeping them
// in a leaf module with no imports lets the generator itself load on demand.

// ── Standard club content (matches the example PDF) ──────────────────────
// If captains want different committee names or rules per tournament,
// these can later be moved into fixtureDetails.
// Replace with the club's tournament committee names when confirmed — captains
// can also override this per tournament from the fixture editor.
export const DEFAULT_COMMITTEE = 'DRUIDS LODGE POLO CLUB COMMITTEE';

// A team's handicap is the sum of its players' handicaps, but only ever four are
// counted — a listed 5th player (substitute) never inflates it.
//   1. If shirt numbers are given, they exactly identify who's on the field
//      (standard polo positions 1–4): the four lowest-numbered players count,
//      so an unnumbered or higher-numbered substitute is excluded regardless of
//      handicap.
//   2. Otherwise, fall back to the four highest handicaps (drop the lowest).
// Falls back to the stored team.handicap when no player handicaps are given.
export const teamHandicap = (team) => {
  const players = (team && team.players) || [];
  const hcp = (p) => {
    const raw = p && p.handicap;
    if (raw == null || raw === '') return null; // Number(null) is 0 — treat blank as unset
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };
  const numbered = players
    .map(p => ({ p, no: parseInt(p && p.shirtNo, 10) }))
    .filter(x => Number.isFinite(x.no) && x.no >= 1);
  let counted;
  if (numbered.length >= 4) {
    counted = numbered.sort((a, b) => a.no - b.no).slice(0, 4).map(x => x.p); // shirts 1–4
  } else {
    counted = [...players].sort((a, b) => (hcp(b) ?? -Infinity) - (hcp(a) ?? -Infinity)).slice(0, 4);
  }
  const hs = counted.map(hcp).filter(n => n != null);
  if (hs.length) return hs.reduce((s, n) => s + n, 0);
  // Number(null) is 0, so an unset stored handicap has to be screened out
  // before the conversion — otherwise a team with no handicaps prints as "0".
  const rawStored = team && team.handicap;
  if (rawStored == null || rawStored === '') return null;
  const stored = Number(rawStored);
  return Number.isFinite(stored) ? stored : null;
};
