// Tournament programme PDF generator for DLPC fixtures.
// Produces a multi-page PDF matching the format of the 9th Lancers Trophy
// programme: cover page, one page per fixture day, then a final rules page.
//
// Usage from DruidsApp.jsx:
//   import { generateTournamentPdf } from './tournamentPdf';
//   await generateTournamentPdf(fixture, fixtureDetails[fixture.id]);

import { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';

// Embed Jost (free Futura-style font) so the programme matches the official
// Futura LT Pro look. Loaded on demand (keeps it out of the initial app bundle).
async function registerJostFonts(doc) {
  try {
    const f = await import('./pdfFonts.js');
    doc.addFileToVFS('Jost-Regular.ttf', f.JOST_REGULAR);
    doc.addFont('Jost-Regular.ttf', 'Jost', 'normal');
    doc.addFileToVFS('Jost-Bold.ttf', f.JOST_BOLD);
    doc.addFont('Jost-Bold.ttf', 'Jost', 'bold');
    doc.addFileToVFS('Jost-Italic.ttf', f.JOST_ITALIC);
    doc.addFont('Jost-Italic.ttf', 'Jost', 'italic');
    doc.addFileToVFS('Jost-BoldItalic.ttf', f.JOST_BOLDITALIC);
    doc.addFont('Jost-BoldItalic.ttf', 'Jost', 'bolditalic');
    doc.setFont('Jost', 'normal');
  } catch (e) {
    // If the font module fails to load, fall back to built-in fonts rather than
    // breaking PDF generation.
    console.warn('Jost font embed failed, using default fonts', e);
  }
}

// Official DLPC crest (embedded so the PDF is fully self-contained, no network
// fetch). This is the light-background variant of public/crest.svg — the
// programme pages are white, so the mallets are club ink rather than white.
// Regenerate from public/crest-dark.svg after any artwork change.
const DLPC_CREST = 'data:image/png;base64,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';

// ── Brand palette (mirrors the app's CSS variables) ──────────────────────
// `BURGUNDY` keeps its name from the source app; for Druids it is the club ink
// that fills the cover band and sets headings apart from the softer body INK.
const BURGUNDY = [27, 25, 25];     // #1B1919 — club ink
const INK      = [34, 34, 34];     // #222222 — body text
const MUTED    = [107, 102, 99];   // #6B6663
const GOLD     = [201, 145, 15];   // #C9910F — gold on white (AA contrast)
const GOLD_LT  = [253, 181, 21];   // #FDB515 — club gold, used on the ink band
const CREAM    = [255, 255, 255];  // #FFFFFF — reversed-out text on the ink band

// ── A4 page geometry (mm) ────────────────────────────────────────────────
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;

// ── Standard club content (matches the example PDF) ──────────────────────
// If captains want different committee names or rules per tournament,
// these can later be moved into fixtureDetails.
// Replace with the club's tournament committee names when confirmed — captains
// can also override this per tournament from the fixture editor.
export const DEFAULT_COMMITTEE = 'DRUIDS LODGE POLO CLUB COMMITTEE';

const RULES = [
  'ALL PLAYERS MUST HAVE A VALID HPA MEMBERSHIP BEFORE PLAYING IN ANY MATCH OR TOURNAMENT',
  'ALL PLAYERS MUST HAVE CORRECT PROTECTIVE EQUIPMENT AS PER CURRENT HPA RULES',
  'TOURNAMENT ENTRY FEES MUST BE AGREED WITHIN YOUR TEAMS AND BE SETTLED BEFORE PLAY COMMENCES — FAILURE TO DO SO COULD INCUR ADDITIONAL CHARGES (UNLESS AGREED IN ADVANCE).',
  'ONCE A TEAM HAS ENTERED THE TOURNAMENT, IT MAY NOT WITHDRAW UNLESS THERE ARE EXCEPTIONAL CIRCUMSTANCES, AND THE TOURNAMENT COMMITTEE AGREES.',
  'DECISIONS OF THE TOURNAMENT COMMITTEE WILL BE FINAL REGARDING ANY DISPUTE.',
  'ONCE THE DRAW HAS BEEN MADE MATCHES CANNOT BE RE-SCHEDULED, EXCEPT AT THE SOLE DISCRETION OF THE TOURNAMENT COMMITTEE.',
  'SPARE PONIES ARE ONLY ALLOWED IN THE DESIGNATED AREAS AT THE CORNER OF THE GROUNDS AND CHANGES ARE NOT PERMITTED IN THE SAFETY ZONES.',
  'ALL LITTER MUST BE TAKEN AWAY WITH YOU, OR DISPOSED OF CORRECTLY, INCLUDING TAPE.',
];

const CLUB_ADDRESS = [
  'DRUIDS LODGE POLO CLUB',
  'DRUIDS LODGE',
  'SALISBURY',
  'WILTSHIRE',
  'SP3 4UN',
  'TEL: 01722 782597',
];

// ── Helpers ──────────────────────────────────────────────────────────────

// Handicap format used in the example PDF: '2', '0', '-2' (no '+' sign).
const fmtHcp = (h) => {
  if (h === null || h === undefined || h === '') return '';
  return ' ' + h;
};

// Normalise unicode dashes (− U+2212, – en dash, — em dash) to ASCII hyphen so
// the standard PDF fonts (WinAnsi) render the tournament handicap level cleanly.
const pdfLevel = (s) => (s || '').replace(/[\u2212\u2013\u2014]/g, '-').trim();

// ── Score helpers ────────────────────────────────────────────────────────
// A result is shown only if at least one team's score has been entered.
const hasResult = (match) =>
  match && (match.scoreA !== null && match.scoreA !== undefined ||
            match.scoreB !== null && match.scoreB !== undefined);

// Chukkas in a match (defaults to 4 when unset) — drives the handicap start.
const matchChukkas = (match) => {
  const n = Number(match && match.chukkas);
  return Number.isFinite(n) && n > 0 ? n : 4;
};

// Goals on handicap (head start) for a team, per HPA rules: the difference in
// team handicaps × chukkas ÷ 6, any fraction counted as half a goal, awarded to
// the lower-handicap team. Mirrors the app's live-scoring / fixture display.
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
  const stored = Number(team && team.handicap);
  return Number.isFinite(stored) ? stored : null;
};

const pdfHeadStart = (match, teamKey) => {
  const hA = teamHandicap(match && match.teamA) || 0;
  const hB = teamHandicap(match && match.teamB) || 0;
  if (hA === hB) return 0;
  const units = Math.abs(hA - hB) * matchChukkas(match);
  const goals = Math.floor(units / 6) + (units % 6 > 0 ? 0.5 : 0);
  return teamKey === (hA < hB ? 'A' : 'B') ? goals : 0;
};

// Format a score, showing a trailing half as ½ (1.5 → "1½", 0.5 → "½").
const fmtScore = (n) => {
  const v = Number(n) || 0;
  const whole = Math.floor(v);
  if (v - whole >= 0.5) return whole === 0 ? '\u00BD' : `${whole}\u00BD`;
  return String(whole);
};

// Handicap-adjusted score for a team (raw goals scored + head start).
const pdfScore = (match, teamKey) =>
  fmtScore((Number(teamKey === 'A' ? (match && match.scoreA) : (match && match.scoreB)) || 0) + pdfHeadStart(match, teamKey));

// Small "N CHUKKAS" line shown under each match heading.
const chukkaLabel = (match) => { const n = matchChukkas(match); return `${n} CHUKKA${n === 1 ? '' : 'S'}`; };

// Heading text for a match: "14:45 MEN'S CLUB CHALLENGE III" (time + title).
// pdfLevel() normalises any unicode minus/dash in the label (e.g. "−2 to 0
// Goal") to an ASCII hyphen so the standard PDF font renders it.
const timeLineOf = (m) =>
  pdfLevel(`${m.time || ''}${m.label ? ' ' + m.label.toUpperCase() : ''}`);

// Heading for a match / block. A "team list only" block drops the time — which
// is typically a placeholder like "TBC" that only exists to keep the matches
// grouped together — and keeps just the label, if one is given.
const headOf = (m) =>
  m.teamListOnly ? pdfLevel(m.label ? m.label.toUpperCase() : '') : timeLineOf(m);

// Shrink the font size until `text` fits within `maxW` (mm), so long centred
// titles never spill past the margins. Leaves the chosen size set on `doc`.
const fitFont = (doc, text, baseSize, maxW, minSize = 9) => {
  let s = baseSize;
  doc.setFontSize(s);
  while (s > minSize && doc.getTextWidth(text) > maxW) { s -= 0.5; doc.setFontSize(s); }
  return s;
};

// Add ordinal suffix: 30 → '30th', 1 → '1st'.
const ordinal = (n) => {
  const lasttwo = n % 100;
  if (lasttwo >= 11 && lasttwo <= 13) return n + 'th';
  switch (n % 10) {
    case 1: return n + 'st';
    case 2: return n + 'nd';
    case 3: return n + 'rd';
    default: return n + 'th';
  }
};

// 'Sat 30 & Sun 31 May' + month 'May' → '30th & 31st May 2026'
const buildDateSubtitle = (fixture) => {
  const nums = (fixture.date.match(/\b\d{1,2}\b/g) || []).map(Number);
  if (!nums.length) return `${fixture.month} 2026`;
  const ordinals = nums.map(ordinal);
  if (ordinals.length === 1) return `${ordinals[0]} ${fixture.month} 2026`;
  return `${ordinals[0]} & ${ordinals[ordinals.length - 1]} ${fixture.month} 2026`;
};

const ensureLeadingThe = (s) => /^the\b/i.test(s) ? s : 'The ' + s;

// One date for a single day, e.g. "17th June 2026" — taken from the day's
// dateLabel (weekday stripped) with the year from the fixture.
const daySingleDate = (day, fixture) => {
  const label = ((day && day.dateLabel) || '').trim();
  const year = (buildDateSubtitle(fixture).match(/\b(20\d\d)\b/) || [])[1] || '2026';
  const num = label.match(/\b(\d{1,2})\b/);
  const mon = label.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i);
  if (num && mon) {
    const m = mon[1].charAt(0).toUpperCase() + mon[1].slice(1).toLowerCase();
    return `${ordinal(Number(num[1]))} ${m} ${year}`;
  }
  const s = label.replace(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b[\s,]*/i, '');
  return year && !s.includes(year) ? `${s} ${year}`.trim() : s;
};

const sanitizeFilename = (s) =>
  s.replace(/[^a-zA-Z0-9 &.-]/g, '').replace(/\s+/g, '_').slice(0, 80);

// ── Crest placement ────────────────────────────────────────
// Places the official club crest (square) centred at (cx, cy) at the given size.
function drawCrest(doc, cx, cy, size) {
  const half = size / 2;
  try {
    doc.addImage(DLPC_CREST, 'PNG', cx - half, cy - half, size, size, undefined, 'FAST');
  } catch (e) {
    // Fallback: simple ink badge if the image fails to decode for any reason.
    doc.setFillColor(...BURGUNDY);
    doc.roundedRect(cx - half, cy - half, size, size, size * 0.09, size * 0.09, 'F');
    doc.setFont('Jost', 'italic');
    doc.setFontSize(size * 2.83 * 0.18);
    doc.setTextColor(...GOLD_LT);
    doc.text('DLPC', cx, cy + size * 0.05, { align: 'center' });
    doc.setTextColor(...INK);
  }
}

// Underline a centred line of text. Pass the text, its centre x, and baseline y.
function underlineCentered(doc, text, cx, baselineY, gap = 0.8) {
  const w = doc.getTextWidth(text);
  doc.setLineWidth(0.25);
  doc.line(cx - w / 2, baselineY + gap, cx + w / 2, baselineY + gap);
}

// ── Page builders ────────────────────────────────────────────────────────

function drawCoverPage(doc, fixture, subtitle) {
  // Crest large, near upper third
  drawCrest(doc, PAGE_W / 2, 95, 90);

  // Title stacked: "The" / "<name>" — italic, ink colour, large
  doc.setFont('Jost', 'bolditalic');
  doc.setTextColor(...INK);

  // Captain-entered cover title lines (up to 5) override the auto layout below,
  // so the front page can read exactly as typed, e.g. "The" / "QRH V KRH" /
  // "Gulf War" / "Anniversary" / "Match". Empty lines are ignored.
  const customTitle = (fixture.titleLines || [])
    .map((s) => (s == null ? '' : String(s).trim()))
    .filter(Boolean)
    .slice(0, 5);
  if (customTitle.length) {
    const maxW = PAGE_W - 2 * MARGIN;
    // Shrink the font until the widest line fits the page width…
    let size = 48;
    customTitle.forEach((l) => { size = Math.min(size, fitFont(doc, l, 48, maxW, 16)); });
    let gap = size * 0.46;
    const levelReserve = (fixture.level && fixture.level.trim()) ? 18 : 4;
    const bandTop = 150, bandBot = 260;
    // …and until the whole stack (plus the level line) fits the vertical band.
    while (size > 16 && bandTop + (customTitle.length - 1) * gap + levelReserve > bandBot) {
      size -= 1;
      gap = size * 0.46;
    }
    doc.setFontSize(size);
    const blockH = (customTitle.length - 1) * gap;
    let yy = bandTop + Math.max(0, ((bandBot - levelReserve - bandTop) - blockH) / 2) + size * 0.30;
    customTitle.forEach((line, idx) => {
      doc.text(line, PAGE_W / 2, yy, { align: 'center' });
      if (idx < customTitle.length - 1) yy += gap;
    });
    if (fixture.level && fixture.level.trim()) {
      doc.setFont('Jost', 'italic');
      doc.setFontSize(22);
      doc.setTextColor(...BURGUNDY);
      doc.text(pdfLevel(fixture.level), PAGE_W / 2, yy + 16, { align: 'center' });
    }
    return;
  }

  const fullTitle = ensureLeadingThe(fixture.name);
  // Split on whitespace and chunk so each line fits within page width.
  // Strategy: render "The" alone on its own line, then the rest as 1–2 lines
  // by greedy width filling. Mirrors the look of the example.
  const words = fullTitle.split(/\s+/);
  const first = words[0]; // 'The'
  const restWords = words.slice(1);

  doc.setFontSize(48);
  let y = 190;
  doc.text(first, PAGE_W / 2, y, { align: 'center' });
  y += 24;

  // Greedy line-break the remaining words
  const maxLineWidthMm = PAGE_W - 2 * MARGIN;
  const lines = [];
  let current = '';
  restWords.forEach((w) => {
    const trial = current ? current + ' ' + w : w;
    if (doc.getTextWidth(trial) > maxLineWidthMm && current) {
      lines.push(current);
      current = w;
    } else {
      current = trial;
    }
  });
  if (current) lines.push(current);

  lines.forEach((line) => {
    doc.text(line, PAGE_W / 2, y, { align: 'center' });
    y += 22;
  });

  // Tournament handicap level (e.g. "−4 to 0 Goal")
  if (fixture.level && fixture.level.trim()) {
    doc.setFont('Jost', 'italic');
    doc.setFontSize(22);
    doc.setTextColor(...BURGUNDY);
    doc.text(pdfLevel(fixture.level), PAGE_W / 2, y + 1, { align: 'center' });
  }
}

// Vertical height (mm) a match block consumes. Mirrors the y-advances in
// drawMatch exactly, so drawDayPage can space matches evenly down the page.
function measureMatch(match, hideChukkas) {
  let h = 0;
  if (headOf(match)) h += 7;                               // time / label line
  if (!hideChukkas && !match.teamListOnly) h += 5;          // chukka count line
  if (!match.teamListOnly) h += 5;                          // "TEAM A V TEAM B"
  if (hasResult(match)) h += 6;    // result score
  let officials = 0;
  if (match.umpires) officials++;
  if (match.goalJudges) officials++;
  if (match.timekeeper) officials++;
  h += officials ? officials * 5 + 2 : 2;
  h += 5;                          // team headers
  const rows = Math.max(
    (match.teamA?.players || []).length,
    (match.teamB?.players || []).length,
  );
  h += rows * 4.6;                 // player rows
  return h;
}

// Distinct officials lines across a set of matches (deduped, first seen wins).
function uniqueOfficials(matches) {
  const out = [];
  const seen = new Set();
  matches.forEach((m) => {
    const lines = [];
    if (m.umpires) lines.push(`UMPIRES: ${m.umpires.toUpperCase()}`);
    if (m.goalJudges) lines.push(`GOAL JUDGES: ${m.goalJudges.toUpperCase()}`);
    if (m.timekeeper) lines.push(`TIMEKEEPER: ${m.timekeeper.toUpperCase()}`);
    lines.forEach((l) => { if (!seen.has(l)) { seen.add(l); out.push(l); } });
  });
  return out;
}

// Distinct teams across a set of matches, by name (first occurrence wins).
function uniqueTeams(matches) {
  const out = [];
  const seen = new Set();
  matches.forEach((m) => {
    [m.teamA, m.teamB].forEach((t) => {
      if (!t || !t.name) return;
      const k = t.name.trim().toUpperCase();
      if (seen.has(k)) return;
      seen.add(k);
      out.push(t);
    });
  });
  return out;
}

// Height (mm) of a group: a lone match is just measureMatch; a multi-match
// group prints one heading, the pairing lines, shared officials, then each
// distinct team's roster two-per-row. Mirrors drawGroup exactly.
function measureGroup(g, hideChukkas) {
  if (g.matches.length === 1) return measureMatch(g.matches[0], hideChukkas);
  const teamListOnly = g.matches.some(m => m.teamListOnly);
  let h = 0;
  const head = teamListOnly ? headOf({ ...g.matches[0], teamListOnly: true }) : g.head;
  if (head) h += 7;                            // shared time + title
  if (!hideChukkas && !teamListOnly) h += 5;    // chukka count line
  if (!teamListOnly) {
    h += g.matches.length * 6;                 // one pairing line per match
    h += 1;                                     // pad below pairings
  }
  const offs = uniqueOfficials(g.matches);
  h += offs.length ? offs.length * 5 + 2 : 2;   // officials
  const teams = uniqueTeams(g.matches);
  for (let i = 0; i < teams.length; i += 2) {
    const a = teams[i], b = teams[i + 1];
    h += 5;                                      // team header line
    const rows = Math.max((a?.players || []).length, (b?.players || []).length);
    h += rows * 4.6;                             // player rows
    h += 5;                                      // gap after the row of teams
  }
  return h;
}

// Header for the overflow/continuation pages of a day that has too many
// matches to fit on one page. Uses the same crest size/position as the day and
// rules pages so every page from page 2 onwards has an identical logo.
function drawContinuationHeader(doc, fixture, day) {
  drawCrest(doc, PAGE_W / 2, 35, 38);
  let y = 65;
  doc.setFont('Jost', 'bolditalic');
  doc.setFontSize(20);
  doc.setTextColor(...INK);
  doc.text(ensureLeadingThe(fixture.name), PAGE_W / 2, y, { align: 'center' });
  y += 8;
  doc.setFont('Jost', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text(`${daySingleDate(day, fixture)} (CONTINUED)`.trim().toUpperCase(), PAGE_W / 2, y, { align: 'center' });
  doc.setTextColor(...INK);
  return y + 9;
}

// Parse a prizegiving time label ("15:00", "3pm", "3.30pm") to minutes, for ordering.
function pgTime(raw) {
  if (!raw || typeof raw !== 'string') return 1e9;
  const m = raw.trim().toLowerCase().match(/(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?/);
  if (!m) return 1e9;
  let h = parseInt(m[1], 10); const mn = m[2] ? parseInt(m[2], 10) : 0; const ap = m[3];
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  return h * 60 + mn;
}

// Day-of-week (0=Sun … 6=Sat) from a label like "Saturday 30th May".
const DOW_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
function dowOfLabel(label) {
  if (!label) return -1;
  return DOW_NAMES.indexOf(String(label).trim().toLowerCase().split(/\s+/)[0]);
}

// Chukka draw grid colours (mirror the on-screen Table view).
const CK_B_BG = [27, 25, 25],    CK_B_TX = [255, 255, 255]; // Black team
const CK_W_BG = [255, 255, 255], CK_W_TX = [27, 25, 25];    // White team
const CK_LINE = [212, 200, 168];
const CK_ALT  = [249, 245, 236];
const fmtHcpCk = (h) => (h > 0 ? `+${h}` : `${h || 0}`);

// Distinct players in a schedule (rows of the grid), ordered by handicap desc,
// with a count of how many chukkas each is in. Derived from the chukka teams.
function chukkaPlayers(schedule) {
  const m = new Map();
  (schedule.chukkas || []).forEach((ck) => {
    [...(ck.teamA || []), ...(ck.teamB || [])].forEach((p) => {
      if (!m.has(p.id)) m.set(p.id, { id: p.id, name: p.name, handicap: p.handicap || 0, count: 0 });
      m.get(p.id).count += 1;
    });
  });
  return [...m.values()].sort((a, b) => b.handicap - a.handicap);
}

function measureChukkaTable(schedule) {
  const rows = chukkaPlayers(schedule).length;
  return 13 /* heading + ground */ + 7 /* grid header */ + rows * 5.2 + 5.5 /* footer */;
}

// Draw the chukka draw grid (players x chukka-times, B = Blue, W = White) as a
// full-width block, slotted into the day's timeline at its throw-in time.
function drawChukkaTable(doc, schedule, startY, ground) {
  const chukkas = schedule.chukkas || [];
  const players = chukkaPlayers(schedule);
  let y = startY;

  // Heading line — "11:00 CHUKKAS" — same look as a match time heading.
  const head = `${chukkas[0] && chukkas[0].time ? chukkas[0].time + ' ' : ''}CHUKKAS`;
  doc.setFont('Jost', 'bolditalic');
  doc.setTextColor(...INK);
  fitFont(doc, head, 15, PAGE_W - 2 * MARGIN);
  doc.text(head, PAGE_W / 2, y, { align: 'center' });
  underlineCentered(doc, head, PAGE_W / 2, y);
  y += 6;

  // Where + how many.
  doc.setFont('Jost', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const sub = `${ground ? ground.toUpperCase() + ' \u00b7 ' : ''}${chukkas.length} CHUKKA${chukkas.length === 1 ? '' : 'S'}`;
  doc.text(sub, PAGE_W / 2, y, { align: 'center' });
  doc.setTextColor(...INK);
  y += 6;

  // Geometry.
  const x0 = MARGIN, totalW = PAGE_W - 2 * MARGIN;
  const nameW = 38, hcpW = 10, cW = 10;
  const ckW = Math.max(7, (totalW - nameW - hcpW - cW) / Math.max(1, chukkas.length));
  const cx = [x0, x0 + nameW, x0 + nameW + hcpW, x0 + nameW + hcpW + cW];
  const ckX = (i) => cx[3] + i * ckW;
  const gridHeadH = 7, rowH = 5.2, footH = 5.5;

  const cell = (x, w, h, text, fill, txt, align = 'center', bold = true, size = 8) => {
    if (fill) { doc.setFillColor(...fill); doc.rect(x, y, w, h, 'F'); }
    doc.setLineWidth(0.1); doc.setDrawColor(...CK_LINE); doc.rect(x, y, w, h, 'S');
    if (text !== '' && text != null) {
      doc.setFont('Jost', bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      doc.setTextColor(...(txt || INK));
      const tx = align === 'left' ? x + 1.6 : x + w / 2;
      doc.text(String(text), tx, y + h / 2 + size * 0.12, { align });
    }
  };

  // Header row.
  cell(cx[0], nameW, gridHeadH, 'NAME', BURGUNDY, CREAM, 'left');
  cell(cx[1], hcpW, gridHeadH, 'HCP', BURGUNDY, CREAM);
  cell(cx[2], cW, gridHeadH, 'C', BURGUNDY, CREAM);
  chukkas.forEach((ck, i) => cell(ckX(i), ckW, gridHeadH, ck.time, BURGUNDY, CREAM, 'center', true, ckW < 12 ? 6.5 : 8));
  y += gridHeadH;

  // Player rows.
  players.forEach((p, ri) => {
    const altBg = ri % 2 === 1 ? CK_ALT : [255, 255, 255];
    cell(cx[0], nameW, rowH, p.name, altBg, INK, 'left', false, 7.5);
    cell(cx[1], hcpW, rowH, fmtHcpCk(p.handicap), [255, 255, 255], INK, 'center', false, 7.5);
    cell(cx[2], cW, rowH, String(p.count), [255, 255, 255], INK, 'center', false, 7.5);
    chukkas.forEach((ck, i) => {
      const inA = (ck.teamA || []).some((q) => q.id === p.id);
      const inB = (ck.teamB || []).some((q) => q.id === p.id);
      if (inA) cell(ckX(i), ckW, rowH, 'B', CK_B_BG, CK_B_TX, 'center', true, 8);
      else if (inB) cell(ckX(i), ckW, rowH, 'W', CK_W_BG, CK_W_TX, 'center', true, 8);
      else cell(ckX(i), ckW, rowH, '', [255, 255, 255]);
    });
    y += rowH;
  });

  // Footer — player counts per chukka.
  cell(cx[0], nameW + hcpW + cW, footH, 'PLAYERS', [255, 255, 255], MUTED, 'right', true, 7);
  chukkas.forEach((ck, i) => cell(ckX(i), ckW, footH, `${(ck.teamA || []).length}v${(ck.teamB || []).length}`, [255, 255, 255], INK, 'center', true, ckW < 12 ? 6.5 : 7.5));
  y += footH;

  return y;
}

// Results summary page(s): every game across the given days with the winning
// team's name highlighted, and no chukka information. Flows onto extra pages if
// there are a lot of games. Scores are the handicap-adjusted finals (matching the
// fixtures view); unplayed games show "v" with no winner.
function drawResultsSummaryPage(doc, fixture, days) {
  const bottomY = PAGE_H - 22;
  const header = (continued) => {
    drawCrest(doc, PAGE_W / 2, 35, 38);
    let yy = 65;
    doc.setFont('Jost', 'bolditalic');
    doc.setFontSize(20);
    doc.setTextColor(...INK);
    doc.text(ensureLeadingThe(fixture.name), PAGE_W / 2, yy, { align: 'center' });
    yy += 9;
    doc.setFont('Jost', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...BURGUNDY);
    doc.text(continued ? 'RESULTS (CONTINUED)' : 'RESULTS', PAGE_W / 2, yy, { align: 'center' });
    doc.setTextColor(...INK);
    return yy + 11;
  };
  let y = header(false);
  const need = (h) => { if (y + h > bottomY) { doc.addPage(); y = header(true); } };

  (days || []).forEach((day) => {
    const games = day.matches || [];
    if (!games.length) return;

    // Day heading
    need(13);
    doc.setFont('Jost', 'bolditalic');
    doc.setFontSize(14);
    doc.setTextColor(...INK);
    const dlabel = daySingleDate(day, fixture) || day.dateLabel || '';
    doc.text(dlabel, PAGE_W / 2, y, { align: 'center' });
    underlineCentered(doc, dlabel, PAGE_W / 2, y);
    y += 9;

    games.forEach((m) => {
      need(13);
      const aName = (m.teamA?.name || 'TBC').toUpperCase();
      const bName = (m.teamB?.name || 'TBC').toUpperCase();
      const played = hasResult(m);
      const sa = played ? pdfScore(m, 'A') : null;
      const sb = played ? pdfScore(m, 'B') : null;
      const aWin = played && Number(sa) > Number(sb);
      const bWin = played && Number(sb) > Number(sa);

      // Competition + time caption
      const cap = `${m.time ? m.time + '  ' : ''}${(m.label || '').toUpperCase()}`.trim();
      if (cap) {
        doc.setFont('Jost', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        doc.text(cap, PAGE_W / 2, y, { align: 'center' });
        y += 4.6;
      }

      // Teams + score — winner's name in club ink, score centred
      const cx = PAGE_W / 2;
      const scoreText = played ? `${sa} \u2013 ${sb}` : 'v';
      doc.setFont('Jost', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(...INK);
      const scoreW = doc.getTextWidth(scoreText);
      doc.text(scoreText, cx, y, { align: 'center' });
      doc.setTextColor(...(aWin ? BURGUNDY : INK));
      doc.text(aName, cx - scoreW / 2 - 4, y, { align: 'right' });
      doc.setTextColor(...(bWin ? BURGUNDY : INK));
      doc.text(bName, cx + scoreW / 2 + 4, y, { align: 'left' });
      doc.setTextColor(...INK);
      y += 8;
    });
    y += 3;
  });
}

// ── Team sheets by division ──────────────────────────────────────────────
// Larger tournaments are drawn into divisions, but the running order is set
// by when each team can get there, so matches from different divisions are
// interleaved and can't be grouped by their position in the list. Each match
// therefore carries a `division` label; here we collect the distinct teams per
// division and print a team sheet, leaving the programme's time order alone.

const ROMAN_VALS = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
// Sort key for a division label: "2" / "Div 2" → 2, "II" / "Division II" → 2,
// so divisions always read I, II, III … whatever order the matches are in.
function divisionRank(label) {
  const s = String(label || '').trim().toUpperCase();
  const num = s.match(/\d+/);
  if (num) return parseInt(num[0], 10);
  const rom = s.match(/\b[IVXLCDM]+\b/);
  if (rom) {
    let total = 0;
    for (let i = 0; i < rom[0].length; i++) {
      const v = ROMAN_VALS[rom[0][i]], nx = ROMAN_VALS[rom[0][i + 1]];
      total += (nx && v < nx) ? -v : v;
    }
    return total;
  }
  return Number.MAX_SAFE_INTEGER; // unnumbered divisions sort last, then A–Z
}

// Distinct teams per division across a day's matches, divisions in rank order.
function teamsByDivision(matches) {
  const map = new Map();
  (matches || []).forEach((m) => {
    const d = (m.division || '').trim();
    if (!d) return;
    if (!map.has(d)) map.set(d, { label: d, teams: [], seen: new Set() });
    const g = map.get(d);
    [m.teamA, m.teamB].forEach((t) => {
      if (!t || !t.name) return;
      const k = t.name.trim().toUpperCase();
      if (g.seen.has(k)) return;
      g.seen.add(k);
      g.teams.push(t);
    });
  });
  return [...map.values()].sort((a, b) =>
    divisionRank(a.label) - divisionRank(b.label) || a.label.localeCompare(b.label));
}

// Columns for n teams: a pair sits 2 across, a four as 2x2, otherwise up to 3.
const colsForTeams = (n) => n <= 2 ? Math.max(1, n) : n === 4 ? 2 : 3;

// Heading for a division: a bare numeral is spelled out ("I" → "DIVISION I",
// "2" → "DIVISION 2"); anything wordier is printed as typed ("PLATE", "NOVICE").
const divisionHeading = (label) => {
  const s = String(label || '').trim();
  return /^(\d+|[IVXLCDM]+)$/i.test(s) ? `DIVISION ${s.toUpperCase()}` : s.toUpperCase();
};

function drawDivisionsPage(doc, fixture, day) {
  let divisions = teamsByDivision(day.matches);
  // A team sheet with no divisions set is simply one unheaded list of the teams.
  if (!divisions.length) {
    const teams = uniqueTeams(day.matches || []);
    if (!teams.length) return;
    divisions = [{ label: '', teams }];
  }
  const bottomY = PAGE_H - 22;

  const header = (continued) => {
    drawCrest(doc, PAGE_W / 2, 35, 38);
    let yy = 65;
    doc.setFont('Jost', 'bolditalic');
    doc.setTextColor(...INK);
    const nm = ensureLeadingThe(fixture.name);
    fitFont(doc, nm, 20, PAGE_W - 2 * MARGIN);
    doc.text(nm, PAGE_W / 2, yy, { align: 'center' });
    yy += 9;
    if (fixture.level) {
      doc.setFont('Jost', 'italic');
      doc.setFontSize(14);
      doc.setTextColor(...BURGUNDY);
      doc.text(pdfLevel(fixture.level), PAGE_W / 2, yy, { align: 'center' });
      yy += 8;
    }
    const oneDate = daySingleDate(day, fixture);
    if (oneDate) {
      doc.setFont('Jost', 'bolditalic');
      doc.setFontSize(18);
      doc.setTextColor(...INK);
      doc.text(continued ? `${oneDate} (CONTINUED)` : oneDate, PAGE_W / 2, yy, { align: 'center' });
      yy += 9;
    }
    if (day.ground) {
      doc.setFont('Jost', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(...INK);
      doc.text(day.ground.toUpperCase(), PAGE_W / 2, yy, { align: 'center' });
      yy += 8;
    }
    return yy + 4;
  };
  let y = header(false);

  const measureDiv = (d) => {
    const cols = colsForTeams(d.teams.length);
    let h = divisionHeading(d.label) ? 9 : 0;
    for (let i = 0; i < d.teams.length; i += cols) {
      const row = d.teams.slice(i, i + cols);
      h += 5 + Math.max(...row.map(t => (t.players || []).length), 0) * 4.6 + 6;
    }
    return h + 4;
  };

  const nameLine = (t) => `${t.name.toUpperCase()}${fmtHcp(teamHandicap(t))}`;
  const playerLine = (p) => `${(p.name || '').toUpperCase()}${fmtHcp(p.handicap)}`;

  divisions.forEach((d) => {
    if (y + measureDiv(d) > bottomY) { doc.addPage(); y = header(true); }

    const dl = divisionHeading(d.label);
    if (dl) {
      doc.setFont('Jost', 'bolditalic');
      doc.setFontSize(14);
      doc.setTextColor(...INK);
      doc.text(dl, PAGE_W / 2, y, { align: 'center' });
      underlineCentered(doc, dl, PAGE_W / 2, y);
      y += 9;
    }

    const cols = colsForTeams(d.teams.length);
    const colW = (PAGE_W - 2 * MARGIN) / cols;
    // One type size per division so every column matches, shrunk until the
    // longest name fits its column (e.g. "HONOURABLE ARTILLERY COMPANY").
    const fitAll = (lines, style, base) => {
      doc.setFont('Jost', style);
      let s = base;
      while (s > 6 && lines.some(l => { doc.setFontSize(s); return doc.getTextWidth(l) > colW - 4; })) s -= 0.5;
      return s;
    };
    const tSize = fitAll(d.teams.map(nameLine), 'bold', 11);
    const pSize = fitAll(d.teams.flatMap(t => (t.players || []).map(playerLine)), 'normal', 10);

    for (let i = 0; i < d.teams.length; i += cols) {
      const row = d.teams.slice(i, i + cols);
      // A short final row is centred rather than left-hanging.
      const pad = row.length < cols ? (colW * (cols - row.length)) / 2 : 0;
      const cxs = row.map((_, j) => MARGIN + pad + colW * (j + 0.5));

      doc.setFont('Jost', 'bold');
      doc.setFontSize(tSize);
      doc.setTextColor(...INK);
      row.forEach((t, j) => doc.text(nameLine(t), cxs[j], y, { align: 'center' }));
      y += 5;

      doc.setFont('Jost', 'normal');
      doc.setFontSize(pSize);
      const rows = Math.max(...row.map(t => (t.players || []).length), 0);
      for (let r = 0; r < rows; r++) {
        row.forEach((t, j) => {
          const p = (t.players || [])[r];
          if (p && p.name) doc.text(playerLine(p), cxs[j], y, { align: 'center' });
        });
        y += 4.6;
      }
      y += 6;
    }
    y += 4;
  });

  // Prizegivings last — the draw may be TBC but the presentation time isn't.
  [day.prizegiving, day.prizegiving2, day.prizegiving3]
    .filter(Boolean)
    .sort((a, b) => pgTime(typeof a === 'string' ? a : '') - pgTime(typeof b === 'string' ? b : ''))
    .forEach((pg) => {
      if (y + 12 > bottomY) { doc.addPage(); y = header(true); }
      doc.setFont('Jost', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(...INK);
      const label = (typeof pg === 'string' && pg.trim()) ? `${pg.trim()} \u00B7 PRIZEGIVING` : 'PRIZEGIVING';
      doc.text(label, PAGE_W / 2, y + 5, { align: 'center' });
      underlineCentered(doc, label, PAGE_W / 2, y + 5);
      y += 14;
    });

  // Officials for the day, deduped (e.g. "UMPIRES: A. SMITH & B. JONES")
  const offs = uniqueOfficials(day.matches || []);
  if (offs.length) {
    if (y + offs.length * 5 > bottomY) { doc.addPage(); y = header(true); }
    doc.setFont('Jost', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    offs.forEach((l) => { doc.text(l, PAGE_W / 2, y, { align: 'center' }); y += 5; });
    doc.setTextColor(...INK);
  }
}

function drawDayPage(doc, fixture, subtitle, day, chukkaByDow, hideChukkas) {
  // A day whose draw isn't out yet prints as a team sheet instead of a running
  // order: teams and line-ups grouped into divisions, no times, prizegiving last.
  if (day.teamSheet) return drawDivisionsPage(doc, fixture, day);
  // Logo top-centre
  drawCrest(doc, PAGE_W / 2, 35, 38);

  let y = 65;

  // Header: tournament name, level, the single date for this day, then ground —
  // each on its own line.
  doc.setFont('Jost', 'bolditalic');
  fitFont(doc, ensureLeadingThe(fixture.name), 26, PAGE_W - 2 * MARGIN);
  doc.setTextColor(...INK);
  doc.text(ensureLeadingThe(fixture.name), PAGE_W / 2, y, { align: 'center' });
  y += 10;

  // Level (e.g. "2 Goal")
  if (fixture.level && fixture.level.trim()) {
    doc.setFont('Jost', 'italic');
    doc.setFontSize(15);
    doc.setTextColor(...BURGUNDY);
    doc.text(pdfLevel(fixture.level), PAGE_W / 2, y, { align: 'center' });
    y += 8;
  }

  // Single date for this day (e.g. "17th June 2026") — bold + larger
  const oneDate = daySingleDate(day, fixture);
  if (oneDate) {
    doc.setFont('Jost', 'bolditalic');
    doc.setFontSize(20);
    doc.setTextColor(...INK);
    doc.text(oneDate, PAGE_W / 2, y, { align: 'center' });
    y += 10;
  }

  // Ground (e.g. "MAIN GROUND")
  if (day.ground) {
    doc.setFont('Jost', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...INK);
    doc.text(day.ground.toUpperCase(), PAGE_W / 2, y, { align: 'center' });
    y += 9;
  }

  // Group consecutive matches that share the SAME time and title into one block
  // (e.g. a round-robin), so the time + match title print only once.
  const groups = [];
  (day.matches || []).forEach((m) => {
    const t = (m.time || '').trim();
    const key = t ? `${t}__${(m.label || '').trim().toUpperCase()}` : null;
    const last = groups[groups.length - 1];
    // A match flagged to start on a new page always begins its own block, so the
    // forced break lands before it even if it shares a time + title with the prior.
    if (key && last && last.key === key && !m.pageBreakBefore) last.matches.push(m);
    else groups.push({ key, head: timeLineOf(m), matches: [m] });
  });

  // Merge match groups and prizegivings into one timeline, ordered by time of day,
  // so the programme reads top-to-bottom in time order (e.g. game, prizegiving,
  // games, prizegiving) — matching the on-screen Fixtures view.
  const items = [];
  groups.forEach((g, i) => items.push({ kind: 'group', t: pgTime(g.matches[0] && g.matches[0].time), ord: i, g }));
  [day.prizegiving, day.prizegiving2, day.prizegiving3].forEach((pg, i) => {
    if (pg) items.push({ kind: 'prize', t: pgTime(typeof pg === 'string' ? pg : ''), ord: 1000 + i, pg });
  });
  // Chukka draw scheduled on this day (matched by weekday) → slot it by throw-in time.
  const ckEntry = !hideChukkas && chukkaByDow && chukkaByDow[dowOfLabel(day.dateLabel)];
  if (ckEntry && ckEntry.schedule && (ckEntry.schedule.chukkas || []).length) {
    const ckSch = ckEntry.schedule;
    const ckT = typeof ckEntry.throwInMin === 'number'
      ? ckEntry.throwInMin
      : pgTime(ckSch.chukkas[0] && ckSch.chukkas[0].time);
    items.push({ kind: 'chukka', t: ckT, ord: 500, schedule: ckSch });
  }
  items.sort((a, b) => a.t !== b.t ? a.t - b.t : a.ord - b.ord);

  const PRIZE_H = 9;
  const measureItem = (it) =>
    it.kind === 'prize' ? PRIZE_H
    : it.kind === 'chukka' ? measureChukkaTable(it.schedule)
    : measureGroup(it.g, hideChukkas);
  const drawItem = (d, it, my) => {
    if (it.kind === 'chukka') return drawChukkaTable(d, it.schedule, my, day.ground);
    if (it.kind !== 'prize') return drawGroup(d, it.g, my, hideChukkas);
    d.setFont('Jost', 'bold');
    d.setFontSize(13);
    d.setTextColor(...INK);
    const label = (typeof it.pg === 'string' && it.pg.trim())
      ? `${it.pg.trim()} · PRIZEGIVING`
      : 'PRIZEGIVING';
    d.text(label, PAGE_W / 2, my + 5, { align: 'center' });
    underlineCentered(d, label, PAGE_W / 2, my + 5);
    return my + PRIZE_H;
  };

  // Lay out one session (a run of items) down a page: if it fits, space evenly so
  // the page fills nicely; if not, flow top-to-bottom onto continuation pages so
  // later items are never lost.
  const flowSegment = (segItems, startY) => {
    if (!segItems.length) return;
    const bottomY = PAGE_H - 22;
    const sumH = segItems.reduce((acc, it) => acc + measureItem(it), 0);
    if ((bottomY - startY) >= sumH) {
      const leftover = (bottomY - startY) - sumH;
      const gap = leftover > 0 ? leftover / (segItems.length + 1) : 6;
      let my = startY + gap;
      segItems.forEach((it) => {
        my = drawItem(doc, it, my);
        my += gap;
      });
    } else {
      let my = startY + 4;
      let firstOnPage = true;
      segItems.forEach((it) => {
        const ih = measureItem(it);
        if (!firstOnPage && my + ih > bottomY) {
          doc.addPage();
          my = drawContinuationHeader(doc, fixture, day);
          firstOnPage = true;
        }
        my = drawItem(doc, it, my);
        my += 8;
        firstOnPage = false;
      });
    }
  };

  if (items.length) {
    const pgCount = (day.prizegiving ? 1 : 0) + (day.prizegiving2 ? 1 : 0) + (day.prizegiving3 ? 1 : 0);
    const splitAfterPrize = pgCount >= 2;
    // A match can be flagged (via the editor tick box) to start on a fresh page.
    const breaksBefore = (it) =>
      it.kind === 'group' && it.g.matches[0] && it.g.matches[0].pageBreakBefore;
    // Build sessions: a new page begins before any flagged match, and — when the
    // day has more than one prizegiving — after each prizegiving. With no flags
    // and at most one prizegiving this stays a single session (prior behaviour).
    const segments = [];
    let cur = [];
    items.forEach((it, idx) => {
      const newPage = idx > 0 && (
        breaksBefore(it) ||
        (splitAfterPrize && items[idx - 1].kind === 'prize')
      );
      if (newPage && cur.length) { segments.push(cur); cur = []; }
      cur.push(it);
    });
    if (cur.length) segments.push(cur);
    segments.forEach((seg, si) => {
      let sy = y;
      if (si > 0) { doc.addPage(); sy = drawContinuationHeader(doc, fixture, day); }
      flowSegment(seg, sy);
    });
  }
}

function drawMatch(doc, match, startY, hideChukkas) {
  let y = startY;

  // Time (+ optional label) — italic bold, underlined, normalised + width-fitted
  doc.setFont('Jost', 'bolditalic');
  doc.setTextColor(...INK);
  const timeLine = headOf(match);
  if (timeLine) {
    fitFont(doc, timeLine, 15, PAGE_W - 2 * MARGIN);
    doc.text(timeLine, PAGE_W / 2, y, { align: 'center' });
    underlineCentered(doc, timeLine, PAGE_W / 2, y);
    y += 7;
  }

  // Chukka count
  if (!hideChukkas && !match.teamListOnly) {
    doc.setFont('Jost', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(chukkaLabel(match), PAGE_W / 2, y, { align: 'center' });
    doc.setTextColor(...INK);
    y += 5;
  }

  // "TEAM A V TEAM B"
  const aName = (match.teamA?.name || 'TBC').toUpperCase();
  const bName = (match.teamB?.name || 'TBC').toUpperCase();
  if (!match.teamListOnly) {
    doc.setFont('Jost', 'bold');
    doc.setFontSize(13);
    doc.text(`${aName} V ${bName}`, PAGE_W / 2, y, { align: 'center' });
    y += 5;
  }

  // Result — only once a score is entered. Shows the handicap-adjusted score
  // (goals scored + handicap head start), matching the app's fixture display.
  if (hasResult(match)) {
    doc.setFont('Jost', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...BURGUNDY);
    doc.text(`${pdfScore(match, 'A')} \u2013 ${pdfScore(match, 'B')}`, PAGE_W / 2, y, { align: 'center' });
    doc.setTextColor(...INK);
    y += 6;
  }

  // Officials — umpires, goal judges, timekeeper
  const officials = [];
  if (match.umpires) officials.push(`UMPIRES: ${match.umpires.toUpperCase()}`);
  if (match.goalJudges) officials.push(`GOAL JUDGES: ${match.goalJudges.toUpperCase()}`);
  if (match.timekeeper) officials.push(`TIMEKEEPER: ${match.timekeeper.toUpperCase()}`);
  if (officials.length) {
    doc.setFont('Jost', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    officials.forEach((line) => { doc.text(line, PAGE_W / 2, y, { align: 'center' }); y += 5; });
    y += 2;
  } else {
    y += 2;
  }

  // Two-column team blocks
  doc.setTextColor(...INK);
  const colW = (PAGE_W - 2 * MARGIN) / 2;
  const colAx = MARGIN + colW / 2;
  const colBx = MARGIN + colW + colW / 2;

  // Team headers (name + handicap, bold)
  doc.setFont('Jost', 'bold');
  doc.setFontSize(11);
  const headerA = `${aName}${fmtHcp(teamHandicap(match.teamA))}`;
  const headerB = `${bName}${fmtHcp(teamHandicap(match.teamB))}`;
  doc.text(headerA, colAx, y, { align: 'center' });
  doc.text(headerB, colBx, y, { align: 'center' });
  y += 5;

  // Player rows
  doc.setFont('Jost', 'normal');
  doc.setFontSize(10);
  const playersA = match.teamA?.players || [];
  const playersB = match.teamB?.players || [];
  const rows = Math.max(playersA.length, playersB.length);
  for (let i = 0; i < rows; i++) {
    const pa = playersA[i];
    const pb = playersB[i];
    if (pa?.name) doc.text(`${pa.name.toUpperCase()}${fmtHcp(pa.handicap)}`, colAx, y, { align: 'center' });
    if (pb?.name) doc.text(`${pb.name.toUpperCase()}${fmtHcp(pb.handicap)}`, colBx, y, { align: 'center' });
    y += 4.6;
  }

  return y;
}

// Draw a group of matches. A single match defers to drawMatch. A multi-match
// group (same time + title) prints the heading once, then the pairing lines,
// shared officials, and each distinct team's roster two-per-row (a lone team
// is centred) — matching the printed round-robin layout.
function drawGroup(doc, g, startY, hideChukkas) {
  if (g.matches.length === 1) return drawMatch(doc, g.matches[0], startY, hideChukkas);
  // "Team list only": print the block as a straight list of teams and players,
  // dropping the "A V B" pairing lines. Useful for a big round-robin where the
  // draw is still TBC and the point of the page is who's in which team.
  const teamListOnly = g.matches.some(m => m.teamListOnly);
  let y = startY;

  // Shared time + title (once), italic bold + underlined, width-fitted
  const head = teamListOnly ? headOf({ ...g.matches[0], teamListOnly: true }) : g.head;
  if (head) {
    doc.setFont('Jost', 'bolditalic');
    doc.setTextColor(...INK);
    fitFont(doc, head, 15, PAGE_W - 2 * MARGIN);
    doc.text(head, PAGE_W / 2, y, { align: 'center' });
    underlineCentered(doc, head, PAGE_W / 2, y);
    y += 7;
  }

  // Chukka count (one line for the whole round-robin block)
  if (!hideChukkas && !teamListOnly) {
    doc.setFont('Jost', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(chukkaLabel(g.matches[0]), PAGE_W / 2, y, { align: 'center' });
    doc.setTextColor(...INK);
    y += 5;
  }

  // Pairing lines: "TEAM A V TEAM B" (with handicap-adjusted score once played)
  if (!teamListOnly) {
    doc.setFont('Jost', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...INK);
    g.matches.forEach((m) => {
      const a = (m.teamA?.name || 'TBC').toUpperCase();
      const b = (m.teamB?.name || 'TBC').toUpperCase();
      let line = `${a} V ${b}`;
      if (hasResult(m)) line += `  ${pdfScore(m, 'A')} \u2013 ${pdfScore(m, 'B')}`;
      doc.text(line, PAGE_W / 2, y, { align: 'center' });
      y += 6;
    });
    y += 1;
  }

  // Officials, deduped across the block
  const offs = uniqueOfficials(g.matches);
  if (offs.length) {
    doc.setFont('Jost', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    offs.forEach((line) => { doc.text(line, PAGE_W / 2, y, { align: 'center' }); y += 5; });
    y += 2;
  } else {
    y += 2;
  }

  // Distinct team rosters, two per row (a lone final team is centred)
  doc.setTextColor(...INK);
  const colW = (PAGE_W - 2 * MARGIN) / 2;
  const colAx = MARGIN + colW / 2;
  const colBx = MARGIN + colW + colW / 2;
  const teams = uniqueTeams(g.matches);
  for (let i = 0; i < teams.length; i += 2) {
    const a = teams[i], b = teams[i + 1];
    const ax = b ? colAx : PAGE_W / 2;

    doc.setFont('Jost', 'bold');
    doc.setFontSize(11);
    doc.text(`${a.name.toUpperCase()}${fmtHcp(teamHandicap(a))}`, ax, y, { align: 'center' });
    if (b) doc.text(`${b.name.toUpperCase()}${fmtHcp(teamHandicap(b))}`, colBx, y, { align: 'center' });
    y += 5;

    doc.setFont('Jost', 'normal');
    doc.setFontSize(10);
    const pa = a.players || [];
    const pb = (b && b.players) || [];
    const rows = Math.max(pa.length, pb.length);
    for (let r = 0; r < rows; r++) {
      if (pa[r]?.name) doc.text(`${pa[r].name.toUpperCase()}${fmtHcp(pa[r].handicap)}`, ax, y, { align: 'center' });
      if (b && pb[r]?.name) doc.text(`${pb[r].name.toUpperCase()}${fmtHcp(pb[r].handicap)}`, colBx, y, { align: 'center' });
      y += 4.6;
    }
    y += 5;
  }

  return y;
}

function drawRulesPage(doc, committee) {
  drawCrest(doc, PAGE_W / 2, 35, 38);

  let y = 70;

  // Section header: Tournament Committee
  doc.setFont('Jost', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...INK);
  doc.text('TOURNAMENT COMMITTEE', PAGE_W / 2, y, { align: 'center' });
  underlineCentered(doc, 'TOURNAMENT COMMITTEE', PAGE_W / 2, y);
  y += 10;

  doc.setFont('Jost', 'normal');
  doc.setFontSize(11);
  // Captain-editable. Wrap onto extra centred lines if the list is long.
  const names = (committee && String(committee).trim()) ? String(committee).trim().toUpperCase() : DEFAULT_COMMITTEE;
  const lines = doc.splitTextToSize(names, PAGE_W - MARGIN * 2);
  lines.forEach((ln, i) => doc.text(ln, PAGE_W / 2, y + i * 5.5, { align: 'center' }));
  y += (lines.length - 1) * 5.5 + 16;

  // Section header: Tournament Rules
  doc.setFont('Jost', 'bold');
  doc.setFontSize(15);
  doc.text('TOURNAMENT RULES', PAGE_W / 2, y, { align: 'center' });
  underlineCentered(doc, 'TOURNAMENT RULES', PAGE_W / 2, y);
  y += 12;

  // Rules — centred, with text wrapping for long ones
  doc.setFont('Jost', 'normal');
  doc.setFontSize(9.5);
  const maxRuleWidth = PAGE_W - 2 * MARGIN - 10;
  RULES.forEach((rule) => {
    const lines = doc.splitTextToSize(rule, maxRuleWidth);
    lines.forEach((line) => {
      doc.text(line, PAGE_W / 2, y, { align: 'center' });
      y += 4.6;
    });
    y += 4;
  });

  // Club address — bottom
  doc.setFont('Jost', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  let ay = PAGE_H - 45;
  CLUB_ADDRESS.forEach((line) => {
    doc.text(line, PAGE_W / 2, ay, { align: 'center' });
    ay += 5;
  });
}

// ── Public entry point ───────────────────────────────────────────────────

export async function generateTournamentPdf(fixture, detail, chukkaByDow = {}, opts = {}) {
  // opts: { days, subtitle, filenameDate } — lets callers print a single day or a
  // custom subset (per-day programmes) while the default prints the whole event.
  const days = opts.days || (detail && detail.days);
  if (!days || !Array.isArray(days) || days.length === 0) {
    throw new Error('No match details to print. Add days and matches in captain mode first.');
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  await registerJostFonts(doc);
  const subtitle = opts.subtitle || buildDateSubtitle(fixture);
  const hideChukkas = !!opts.hideChukkas;

  // Cover
  drawCoverPage(doc, fixture, subtitle);

  // Team sheets by division — a standalone handout for divisional tournaments.
  // Teams only, no running order, since divisions cut across the time-ordered draw.
  if (opts.divisionSheets) {
    const divDays = days.filter(d => teamsByDivision(d.matches).length);
    if (!divDays.length) {
      throw new Error('No divisions set yet. Put a division (e.g. I, II, III) on each match in captain mode first.');
    }
    divDays.forEach((day) => {
      doc.addPage();
      drawDivisionsPage(doc, fixture, day);
    });
    doc.addPage();
    drawRulesPage(doc, opts.committee);
    const tp = sanitizeFilename(ensureLeadingThe(fixture.name));
    const dp = sanitizeFilename((opts.filenameDate || subtitle).replace(/ 2026$/, ''));
    await deliverPdf(doc, `${tp}_${dp}_Teams.pdf`);
    return;
  }

  // Optional results summary (all games, winners highlighted, no chukkas) — page 2.
  if (opts.resultsSummary) {
    doc.addPage();
    drawResultsSummaryPage(doc, fixture, days);
  }

  // One page per day
  days.forEach((day) => {
    doc.addPage();
    drawDayPage(doc, fixture, subtitle, day, chukkaByDow, hideChukkas);
  });

  // Rules page
  doc.addPage();
  drawRulesPage(doc, opts.committee);

  // Filename: "The_9th_Lancer_Trophy_30th_&_31st_May.pdf"
  const titlePart = sanitizeFilename(ensureLeadingThe(fixture.name));
  const datePart  = sanitizeFilename((opts.filenameDate || subtitle).replace(/ 2026$/, ''));
  await deliverPdf(doc, `${titlePart}_${datePart}.pdf`);
}

// Deliver the finished PDF to the user. In a browser this is a normal download.
// In the native app (Capacitor/WKWebView) jsPDF's doc.save() silently fails —
// WKWebView ignores the <a download> click it relies on — so instead we hand
// the file to the OS share sheet via the Web Share API (Save to Files, AirDrop,
// Mail, …). Web behaviour is left exactly as before.
async function deliverPdf(doc, filename) {
  const isNative = !!(Capacitor && typeof Capacitor.isNativePlatform === 'function' && Capacitor.isNativePlatform());
  if (isNative) {
    try {
      const blob = doc.output('blob');
      const file = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: filename }); } catch (e) { /* user cancelled */ }
        return;
      }
    } catch (e) { /* fall through to the plain download below */ }
  }

  // Browser (desktop or mobile web): normal download — unchanged.
  doc.save(filename);
}
