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
const BURGUNDY = [35, 31, 32];     // #231F20 — club ink
const INK      = [34, 34, 34];     // #222222 — body text
const MUTED    = [107, 102, 99];   // #6B6663
const GOLD     = [201, 145, 15];   // #C9910F — gold on white (AA contrast)
const GOLD_LT  = [251, 180, 21];   // #FBB415 — club gold, used on the ink band
const CREAM    = [255, 255, 255];  // #FFFFFF — reversed-out text on the ink band

// ── A4 page geometry (mm) ────────────────────────────────────────────────
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;

// Shared with the app UI. These live in a dependency-free leaf module so that
// the club component — which uses both on every render — can import them without
// dragging jsPDF and this whole generator into the eager bundle. Re-exported
// here so existing importers of tournamentPdf keep working unchanged.
export { DEFAULT_COMMITTEE, teamHandicap } from './pdfShared';
import { DEFAULT_COMMITTEE, teamHandicap } from './pdfShared';
import { headStartFor } from './handicap';

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
// (teamHandicap itself now lives in ./pdfShared — see the re-export above.)

const pdfHeadStart = (match, teamKey) => headStartFor(match, teamKey, teamHandicap);

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
// Pair each day number in a fixture's date string with the month it belongs to,
// scanning left to right: numbers accumulate until a month name is reached, and
// that month claims them. Handles "Sat 2 & Sun 3 May" (one month) as well as
// "Thu 30 July - Sun 2 August" (two), which a plain number-scan gets wrong by
// stamping every date with the fixture's own month.
const datePartsOf = (fixture) => {
  const tokens = String(fixture.date || '').match(/\d{1,2}|[A-Za-z]+/g) || [];
  const out = [];
  let pending = [];
  tokens.forEach((t) => {
    if (/^\d+$/.test(t)) { pending.push(Number(t)); return; }
    const mi = ALL_MONTHS_PDF.findIndex(m => m.toLowerCase() === t.toLowerCase());
    if (mi >= 0) {
      pending.forEach(n => out.push({ day: n, month: ALL_MONTHS_PDF[mi] }));
      pending = [];
    }
  });
  // Trailing numbers with no month after them fall back to the fixture's month.
  pending.forEach(n => out.push({ day: n, month: fixture.month }));
  return out.filter(p => p.day >= 1 && p.day <= 31);
};

const ALL_MONTHS_PDF = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const buildDateSubtitle = (fixture) => {
  const parts = datePartsOf(fixture);
  if (!parts.length) return `${fixture.month} 2026`;
  const first = parts[0], last = parts[parts.length - 1];
  if (parts.length === 1) return `${ordinal(first.day)} ${first.month} 2026`;
  // Same month: "2nd & 3rd May 2026". Different: "30th July & 2nd August 2026".
  if (first.month === last.month) {
    return `${ordinal(first.day)} & ${ordinal(last.day)} ${first.month} 2026`;
  }
  return `${ordinal(first.day)} ${first.month} & ${ordinal(last.day)} ${last.month} 2026`;
};

const ensureLeadingThe = (s) => /^the\b/i.test(s) ? s : 'The ' + s;

// One date for a single day, e.g. "17th June 2026" — taken from the day's
// dateLabel (weekday stripped) with the year from the fixture.
const daySingleDate = (day, fixture) => {
  const label = ((day && day.dateLabel) || '').trim();
  const year = (buildDateSubtitle(fixture).match(/\b(20\d\d)\b/) || [])[1] || '2026';
  // Allow an ordinal suffix: \b(\d{1,2})\b never matches "31" in "31st",
  // because there is no word boundary before the "st". Without this the
  // parse silently fails and the fallback below appends the year to the end
  // of the whole label — so "Friday 31st July - Beach Polo" came out as
  // "31st July - Beach Polo 2026".
  const num = label.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/i);
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

// Retained but no longer called: the programme now opens directly on the
// matches. Kept so a cover can be reinstated (e.g. behind an option) without
// rebuilding the layout, along with the fixture.titleLines feature it drives.
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
  if (match.commentator) officials++;
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
    if (m.commentator) lines.push(`COMMENTATOR: ${m.commentator.toUpperCase()}`);
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
const CK_B_BG = [35, 31, 32],    CK_B_TX = [255, 255, 255]; // Black team
const CK_W_BG = [255, 255, 255], CK_W_TX = [35, 31, 32];    // White team
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

  // Officials — umpires, commentator, goal judges, timekeeper
  const officials = [];
  if (match.umpires) officials.push(`UMPIRES: ${match.umpires.toUpperCase()}`);
  if (match.commentator) officials.push(`COMMENTATOR: ${match.commentator.toUpperCase()}`);
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

  // No cover page: the programme opens straight onto the first day's matches.
  // jsPDF starts with one blank page, so the first section draws onto it rather
  // than calling addPage() — `firstPage` tracks that across the branches below.
  let firstPage = true;
  const nextPage = () => { if (firstPage) { firstPage = false; } else { doc.addPage(); } };

  // Team sheets by division — a standalone handout for divisional tournaments.
  // Teams only, no running order, since divisions cut across the time-ordered draw.
  if (opts.divisionSheets) {
    const divDays = days.filter(d => teamsByDivision(d.matches).length);
    if (!divDays.length) {
      throw new Error('No divisions set yet. Put a division (e.g. I, II, III) on each match in captain mode first.');
    }
    divDays.forEach((day) => {
      nextPage();
      drawDivisionsPage(doc, fixture, day);
    });
    nextPage();
    drawRulesPage(doc, opts.committee);
    const tp = sanitizeFilename(ensureLeadingThe(fixture.name));
    const dp = sanitizeFilename((opts.filenameDate || subtitle).replace(/ 2026$/, ''));
    await deliverPdf(doc, `${tp}_${dp}_Teams.pdf`);
    return;
  }

  // Optional results summary (all games, winners highlighted, no chukkas) — page 2.
  if (opts.resultsSummary) {
    nextPage();
    drawResultsSummaryPage(doc, fixture, days);
  }

  // One page per day
  days.forEach((day) => {
    nextPage();
    drawDayPage(doc, fixture, subtitle, day, chukkaByDow, hideChukkas);
  });

  // Rules page
  nextPage();
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
