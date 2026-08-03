import React, { useState, useEffect, useRef } from 'react';
import { generateTournamentPdf, DEFAULT_COMMITTEE, teamHandicap } from './tournamentPdf';
import { startLiveScore, updateLiveScore, endLiveScore } from './liveScoreActivity';
import FixtureBoard from './FixtureBoard';
import ChukkaBoard from './ChukkaBoard';

// The desktop fixture board takes over above this width. Below it the app is
// exactly as it always was — the phone layout is not touched by any of this.
const DESKTOP_MIN_WIDTH = 1024;
const useIsDesktop = () => {
  const query = `(min-width: ${DESKTOP_MIN_WIDTH}px)`;
  const [wide, setWide] = React.useState(
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false));
  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const on = (e) => setWide(e.matches);
    setWide(mq.matches);
    // addEventListener is unavailable on MediaQueryList in older WebViews.
    if (mq.addEventListener) { mq.addEventListener('change', on); return () => mq.removeEventListener('change', on); }
    mq.addListener(on); return () => mq.removeListener(on);
  }, [query]);
  return wide;
};

// 2026 Druids Lodge Polo Club fixtures.
//
// April–August is transcribed from the club's printed Summer 2026 Fixture Card.
// September and October follow the club's published *amended* autumn list, which
// supersedes the September block on the printed card (the card ran tournaments
// Thu–Sun; the amended autumn fixtures are Saturday & Sunday only).
const FIXTURES_2026 = [
  { id: 'apr-16',    month: 'April',     date: 'Thu 16 April',              name: 'First Club Chukkas', level: 'Season opens' },
  { id: 'apr-26',    month: 'April',     date: 'Sun 26 April',              name: 'Druids Polo Game', level: '' },

  { id: 'may-2',     month: 'May',       date: 'Sat 2 & Sun 3 May',         name: 'Aspiga Trophy', level: '2 Goal' },
  { id: 'may-7',     month: 'May',       date: 'Thu 7 – Sun 10 May',        name: 'Spring Trophy', level: '3 Goal' },
  { id: 'may-14',    month: 'May',       date: 'Thu 14 – Sun 17 May',       name: 'May Cup', level: '4 & 0 Goal' },
  { id: 'may-23',    month: 'May',       date: 'Sat 23 May',                name: 'Spring League Starts', level: '' },
  { id: 'may-24',    month: 'May',       date: 'Sun 24 May',                name: 'Druids Polo Game', level: '' },

  { id: 'jun-4',     month: 'June',      date: 'Thu 4 – Sun 7 June',        name: 'India Trophy', level: '6 & 0 Goal' },
  { id: 'jun-11',    month: 'June',      date: 'Thu 11 – Sun 14 June',      name: 'June Trophy', level: '2 Goal' },
  { id: 'jun-18',    month: 'June',      date: 'Thu 18 – Sun 21 June',      name: 'Midsummer Trophy', level: 'League Finals' },
  { id: 'jun-25',    month: 'June',      date: 'Thu 25 – Sun 28 June',      name: 'Stonehenge Trophy & Balaclava Trophy', level: '6 & 2 Goal' },
  { id: 'jun-26',    month: 'June',      date: 'Fri 26 & Sat 27 June',      name: 'Stonehenge Polo Festival', level: 'Club event day' },

  { id: 'jul-2',     month: 'July',      date: 'Thu 2 – Sun 5 July',        name: 'Polo Art Trophy', level: '2 Goal' },
  { id: 'jul-9',     month: 'July',      date: 'Thu 9 – Sun 12 July',       name: 'Harvest Cup', level: '2 Goal' },
  { id: 'jul-18',    month: 'July',      date: 'Sat 18 July',               name: 'Summer League Starts', level: '' },
  { id: 'jul-23',    month: 'July',      date: 'Thu 23 – Sun 26 July',      name: 'Druids Rose Bowl', level: '4 Goal VL & 0 Goal' },
  { id: 'jul-30',    month: 'July',      date: 'Thu 30 July – Sun 2 August', name: 'Whippet Trophy', level: '6 & 2 Goal' },

  { id: 'aug-6',     month: 'August',    date: 'Thu 6 – Sun 9 August',      name: 'White Horse Trophy', level: '2 Goal' },
  { id: 'aug-13',    month: 'August',    date: 'Thu 13 – Sun 16 August',    name: 'Salisbury Cup', level: 'League Finals' },
  { id: 'aug-20',    month: 'August',    date: 'Thu 20 – Sun 23 August',    name: 'Seriously Cool Challenge', level: '4 Goal' },
  { id: 'aug-27',    month: 'August',    date: 'Thu 27 – Sun 30 August',    name: 'Picnic Polo · Forest Edge Rose Bowl', level: '8 & 2 Goal' },
  { id: 'aug-30',    month: 'August',    date: 'Sun 30 August',             name: 'Picnic Polo Sunday', level: 'Club event day' },

  { id: 'sep-3',     month: 'September', date: 'Thu 3 September',           name: 'Chukkas Resume', level: 'After the August interval' },
  { id: 'sep-5',     month: 'September', date: 'Sat 5 & Sun 6 September',   name: 'Aspiga Trophy', level: '2 Goal' },
  { id: 'sep-12',    month: 'September', date: 'Sat 12 & Sun 13 September', name: 'Seriously Cool Challenge', level: '4 Goal' },
  { id: 'sep-19',    month: 'September', date: 'Sat 19 & Sun 20 September', name: 'Salisbury Cup', level: '0 Goal' },
  { id: 'sep-26',    month: 'September', date: 'Sat 26 & Sun 27 September', name: 'Emerson Trophy', level: '2 Goal' },

  { id: 'oct-3',     month: 'October',   date: 'Sat 3 & Sun 4 October',     name: 'Forest Edge Rose Bowl', level: '0 Goal' },
  { id: 'oct-10',    month: 'October',   date: 'Sat 10 & Sun 11 October',   name: 'Druids Rose Bowl', level: '2 Goal' },
  { id: 'oct-17',    month: 'October',   date: 'Sat 17 & Sun 18 October',   name: 'Clock Tower Trophy', level: 'Open' },
];

const MONTHS_ORDER = ['April', 'May', 'June', 'July', 'August', 'September', 'October'];
const ALL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// Parse a day label like "Saturday 30th May" (year 2026 implied; explicit year honoured)
// into a sortable timestamp so date dropdowns can be ordered chronologically.
const dayLabelTime = (label) => {
  if (!label) return -Infinity;
  const l = String(label).toLowerCase();
  const dayM = l.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
  const day = dayM ? parseInt(dayM[1], 10) : 1;
  const mi = ALL_MONTHS.findIndex(m => l.includes(m.toLowerCase()));
  const yrM = l.match(/\b(20\d{2})\b/);
  return new Date(yrM ? parseInt(yrM[1], 10) : 2026, mi >= 0 ? mi : 0, day).getTime();
};
const HANDICAP_OPTIONS = [-2, -1, 0, 1, 2, 3, 4];
// Team (aggregate) handicaps run higher than individual player handicaps — up to 12-goal.
const TEAM_HANDICAP_OPTIONS = [-8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// 2026 pricing inputs for the payment screen, taken from the club's printed
// Summer 2026 price list. Pony hire is the per-chukka base. The club's second
// tier is Student/Alumni rather than a civilian/military split, so the flat
// per-chukka discount below is what a student pays under the standard rate.
const STUDENT_DISCOUNT_PER_CHUKKA = 10;
const PONY_HIRE_2026 = { club: 100, league: 120, match: 120 };

// 2026 coaching/lesson rates (group rates are per person). Subsidy pots apply to
// LESSONS (not chukkas). Students and alumni pay the student rate.
// "POA" items (coach for away games, pony training) are quoted by the office and
// are deliberately not listed here.
const LESSON_TYPES_2026 = [
  { id: 'intro',           label: 'Introduction to Polo',                  std: 130, student: 57.50 },
  { id: 'lesson-1hr',      label: '1hr Lesson',                            std: 165, student: 130 },
  { id: 'semi-private',    label: 'Semi-Private Lesson (2–3 people, pp)',  std: 125, student: 110 },
  { id: 'inst-chukka',     label: 'Instructional Chukka',                  std: 105, student: 64.50 },
  { id: 'inst-chukka-own', label: 'Instructional Chukka · Own Pony',       std: 75,  student: 64.50 },
  { id: 'alumni-chukka',   label: 'Alumni Instructional Chukka',           std: 80,  student: 80 },
];
const lessonById = (id) => LESSON_TYPES_2026.find(l => l.id === id) || LESSON_TYPES_2026[0];

// 2026 tournament team entry fees (per team) and the per-player league fee.
const TOURNAMENT_ENTRY_2026 = {
  member: [
    { id: 'm-team',   label: 'Tournament entry per team',              fee: 600 },
    { id: 'm-picnic', label: 'Tournament entry per team (Picnic Day)', fee: 750 },
  ],
  nonmember: [
    { id: 'n-team',   label: 'Tournament entry per team',              fee: 600 },
    { id: 'n-picnic', label: 'Tournament entry per team (Picnic Day)', fee: 750 },
    { id: 'n-charge', label: 'Non-member charge (per player)',         fee: 150 },
  ],
  student: [
    { id: 'stu-league', label: 'DPG League per player', fee: 360 },
  ],
};
const ENTRY_CATEGORY_LABEL = { member: 'Members', nonmember: 'Non-Members', student: 'Students' };
const entryOptions = (cat) => TOURNAMENT_ENTRY_2026[cat] || [];
const entryOptionById = (cat, id) => entryOptions(cat).find(o => o.id === id) || null;

// 2026 membership categories from the club's summer price list.
// `chukkasIncluded` drives the booking branch: included → added straight to the
// roster; not included (or no membership) → sent to checkout to pay per chukka.
const MEMBERSHIP_TYPES_2026 = [
  { id: 'none',          label: 'No membership · pays per chukka',        chukkasIncluded: false },
  { id: 'full',          label: 'Full membership (incl chukka fees)',     chukkasIncluded: true },
  { id: 'family',        label: 'Further Family Member',                  chukkasIncluded: true },
  { id: 'student-full',  label: 'Full Student Membership (U23)',          chukkasIncluded: true,  student: true },
  { id: 'excl-chukkas',  label: 'Membership excluding chukka fees',       chukkasIncluded: false },
  // Categories on the club's member list that the printed price card does not
  // cover. `chukkasIncluded: false` is a deliberately cautious default: it sends
  // the booking to checkout, where the captain sees the charge and can waive it.
  // Setting it true instead would silently skip the fee — an invisible error
  // rather than a visible one. Flip these once the club confirms the terms.
  { id: 'chukka-umpire', label: 'Chukka & Umpire',                        chukkasIncluded: false },
  { id: 'u18',           label: '18 and Under',                           chukkasIncluded: false },
  { id: 'pony-club',     label: 'Pony Club',                              chukkasIncluded: false },
];
const membershipById = (id) => MEMBERSHIP_TYPES_2026.find(m => m.id === id) || MEMBERSHIP_TYPES_2026[0];

// A player accumulates live-match goals while a game is scored. Whenever a team
// or squad is reused — pulled into another fixture/match, copied to another
// day, or remembered in the teams directory — strip those goals so last match's
// score never carries over. Keeps only name + handicap, dropping empty rows.
const cleanSquad = (players) => (players || [])
  .filter(p => p && (p.name || '').trim())
  .map(p => ({ name: p.name, handicap: p.handicap ?? null }));
// Same, but keeps a blank slot that has a named player below it. Used while a
// squad is being edited: dropping an interior blank would shift every shirt
// number under it up by one as soon as a name was cleared.
const trimSquad = (players) => {
  const rows = (players || []).map(p => ({ name: (p && p.name) || '', handicap: (p && p.handicap) ?? null }));
  let last = -1;
  rows.forEach((p, i) => { if (p.name.trim()) last = i; });
  return rows.slice(0, last + 1);
};
// Players listed per team in a tournament match. Four on the field, but a fifth
// can be named (substitute / shared mount). The PDF sizes itself off the actual
// player count, so nothing else needs to change.
const MAX_MATCH_PLAYERS = 5;
// Club chukka times from the Druids fixture card:
// "Saturday & Sunday 11:00am, Thursday 5:30pm".
const CHUKKA_START_MIN_THU = 17 * 60 + 30;   // 17:30 — Thursday default
const CHUKKA_START_MIN_SAT = 11 * 60;        // 11:00 — Saturday default
const CHUKKA_START_MIN_SUN = 11 * 60;        // 11:00 — Sunday default
const CHUKKA_INTERVAL_MIN = 15;
const SLOTS_PER_CHUKKA = 8; // target size for chukka-count calculation; teams may be uneven
const MIN_PLAYERS_PER_CHUKKA = 4; // target minimum; redistribution will move players to honour this where possible

// Day configuration. Each day key gets its own roster, schedule, week stamp,
// and configurable throw-in time stored independently in Firestore.
// Each chukka day. Optional gates (unused at Druids today, kept so a day can be
// restricted later without re-plumbing):
//   maxHandicap — nobody above this handicap may sign up
//   maxChukkas  — cap on chukkas bookable per player
//   fixedChukkas— every player plays exactly this many; the chukkas field is locked
//   instructional — hides options that don't apply to a fixed teaching session
//   blurb       — one-line description shown on the day menu
const DAY_CONFIG = {
  thu: { key: 'thu', label: 'Thu',  fullLabel: 'Thursday',   short: 'Thu', dow: 4, eveningPrev: 'Wednesday', defaultStartMin: CHUKKA_START_MIN_THU, tabLabel: 'Thu Chukkas', blurb: 'Open to all handicaps' },
  sat: { key: 'sat', label: 'Sat',  fullLabel: 'Saturday',   short: 'Sat', dow: 6, eveningPrev: 'Friday',    defaultStartMin: CHUKKA_START_MIN_SAT, tabLabel: 'Sat Chukkas', blurb: 'Open to all handicaps' },
  sun: { key: 'sun', label: 'Sun',  fullLabel: 'Sunday',     short: 'Sun', dow: 0, eveningPrev: 'Saturday',  defaultStartMin: CHUKKA_START_MIN_SUN, tabLabel: 'Sun Chukkas', blurb: 'Open to all handicaps' },
};
const DAY_KEYS = ['thu', 'sat', 'sun'];
// Arena is played 3v3 — `generate` passes a 6-slot cap when it is the ground.
const GROUND_OPTIONS = ['Main Ground', 'Second Ground', 'Arena'];

// ── Club shop (preview) ──────────────────────────────────────────────────
// Captain-only for now. Checkout is stubbed until Stripe is wired up: each
// product carries an optional stripePriceId to hand to Stripe Checkout later.
// Images live in /public/shop/. Prices are in whole pence to avoid float drift.
// Empty until the club decides what to stock — the shop tab renders an empty
// state rather than a placeholder product.
const SHOP_PRODUCTS = [];
const fmtPence = (p) => `£${(p / 100).toFixed(2)}`;

// ── Remember where the user last was ─────────────────────────────────────
// A refresh — including an app/WebView reload mid-match — would otherwise drop
// the user back on the home tab and lose their live-score selection. We stash
// the current tab + live-match selection in localStorage and restore it on
// load, but only if it's recent, so the app still opens fresh the next day.
const VIEW_STATE_KEY = 'dlpc-view';
const VIEW_STATE_MAX_AGE_MS = 12 * 60 * 60 * 1000; // 12 hours
const CAPTAIN_ONLY_TABS = ['shop', 'players', 'teams'];
const readViewState = () => {
  try {
    const raw = localStorage.getItem(VIEW_STATE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || typeof s.ts !== 'number' || Date.now() - s.ts > VIEW_STATE_MAX_AGE_MS) return null;
    return s;
  } catch (e) { return null; }
};


// Parse a fixture's date string into a { start, end } Date range (year 2026).
// Handles: 'Sat 30 & Sun 31 May', 'Mon 25 May', 'Thu 30 July - Sun 2 August'.
//
// Each day number takes the month that follows it in the string, falling back to
// the fixture's own month. Stamping fx.month onto every number breaks any
// fixture crossing a month boundary: the Whippet Trophy ('Thu 30 July - Sun 2
// August') came out as 30 July -> 2 *July*, an end 28 days before the start, so
// isTournamentActive() could never be true for it.
const parseFixtureDateRange = (fx) => {
  const monthMap = { January:0, February:1, March:2, April:3, May:4, June:5, July:6, August:7, September:8, October:9, November:10, December:11 };
  const fallback = monthMap[fx.month];
  if (fallback === undefined) return null;
  const tokens = String(fx.date || '').match(/\d{1,2}|[A-Za-z]+/g) || [];
  const parts = [];
  let pending = [];
  tokens.forEach((t) => {
    if (/^\d+$/.test(t)) { pending.push(parseInt(t, 10)); return; }
    const key = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
    if (monthMap[key] !== undefined) {
      pending.forEach(n => parts.push({ day: n, month: monthMap[key] }));
      pending = [];
    }
  });
  pending.forEach(n => parts.push({ day: n, month: fallback }));
  const valid = parts.filter(p => p.day >= 1 && p.day <= 31);
  if (!valid.length) return null;
  const a = valid[0], b = valid[valid.length - 1];
  const start = new Date(2026, a.month, a.day, 0, 0, 0, 0);
  // A fixture running December into January ends in the following year.
  const end = new Date(b.month < a.month ? 2027 : 2026, b.month, b.day, 23, 59, 59, 999);
  return { start, end };
};

// Registering interest closes at the end of the day before the fixture starts.
// Returns null when the date cannot be parsed, in which case interest stays open
// rather than shutting members out because of an unrecognised date string.
const interestClosesAt = (fx) => {
  const range = parseFixtureDateRange(fx);
  if (!range) return null;
  const d = new Date(range.start);
  d.setDate(d.getDate() - 1);
  d.setHours(23, 59, 59, 999);
  return d;
};
const isInterestClosed = (fx) => {
  const at = interestClosesAt(fx);
  return at ? Date.now() > at.getTime() : false;
};

// A fixture's programme reaches members only once a captain publishes it, so the
// draw can be built in peace. Captains always see it, published or not.
const isProgrammePublished = (det) => !!(det && det.published);
const isTournamentActive = (fx) => {
  const range = parseFixtureDateRange(fx);
  if (!range) return false;
  const now = new Date();
  return now >= range.start && now <= range.end;
};

// Derive the individual days a fixture spans from its date string, so a team
// can field a (possibly different) squad on each one.
//   'Sat 18 & Sun 19 April' → [{key:'sat', label:'Saturday 18 April'}, {key:'sun', label:'Sunday 19 April'}]
//   'Mon 25 May'            → [{key:'mon', label:'Monday 25 May'}]
const WEEKDAY_FULL = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
const fixtureDays = (fx) => {
  const segs = (fx?.date || '').split('&').map(s => s.trim());
  const seen = {};
  const out = [];
  segs.forEach(seg => {
    const m = seg.match(/(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2})/i);
    if (!m) return;
    const base = m[1].toLowerCase();
    // Keep keys unique even in the rare case a fixture repeats a weekday.
    const key = seen[base] ? `${base}${m[2]}` : base;
    seen[base] = true;
    out.push({ key, label: `${WEEKDAY_FULL[base]} ${m[2]} ${fx.month}` });
  });
  if (out.length === 0) out.push({ key: 'day', label: fx?.date || 'Match day' });
  return out;
};

// Format minutes-since-midnight as HH:MM
const fmtTime = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
};

// Parse HH:MM string back to minutes
const parseTime = (str) => {
  if (!str || typeof str !== 'string') return null;
  const m = str.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
};

// --- Native local notifications (iOS app only; completely inert on the web) ---
// Reached through the Capacitor runtime global so the web/Vercel build needs no
// extra dependency and is unaffected. On iOS the LocalNotifications plugin is
// injected here once @capacitor/local-notifications is installed and synced.
const CapBridge = (typeof window !== 'undefined' && window.Capacitor) ? window.Capacitor : null;
const isNativeApp = !!(CapBridge && typeof CapBridge.isNativePlatform === 'function' && CapBridge.isNativePlatform());
const LocalNotifications = (CapBridge && CapBridge.Plugins) ? CapBridge.Plugins.LocalNotifications : null;
const REMINDER_ID_BASE = 7000; // ids 7000-7999 reserved for chukka reminders

// Example rosters for testing the app
// Format handicap for display (using proper minus sign for negatives)
const fmtH = (h) => h < 0 ? `−${Math.abs(h)}` : `${h}`;

// Shirt colours a team can play in on the live scoreboard (captain-set).
const TEAM_COLOURS = [
  { key: 'blue',   name: 'Blue',   hex: '#2f5c99', text: '#ffffff' },
  { key: 'white',  name: 'White',  hex: '#f4f1ea', text: '#231F20' },
  { key: 'red',    name: 'Red',    hex: '#a5322b', text: '#ffffff' },
  { key: 'green',  name: 'Green',  hex: '#3f6b47', text: '#ffffff' },
  { key: 'yellow', name: 'Yellow', hex: '#e0b83a', text: '#231F20' },
  { key: 'pink',   name: 'Pink',   hex: '#d97a94', text: '#ffffff' },
  { key: 'navy',   name: 'Navy',   hex: '#1e2f4d', text: '#ffffff' },
  { key: 'black',  name: 'Black',  hex: '#2a2a2a', text: '#ffffff' },
  { key: 'orange', name: 'Orange', hex: '#d1762e', text: '#ffffff' },
  { key: 'purple', name: 'Purple', hex: '#6b4a86', text: '#ffffff' },
];
const teamColour = (key) => TEAM_COLOURS.find(c => c.key === key) || null;
const SCORE_GOLD = '#c9a24b';
const ordinalUpper = (n) => {
  const s = ['TH', 'ST', 'ND', 'RD'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// Time for chukka index (0-based), given the day's throw-in start time (in minutes since midnight)
const chukkaTime = (idx, startMin) => {
  const total = startMin + idx * CHUKKA_INTERVAL_MIN;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}:${m.toString().padStart(2, '0')}`;
};

// Even out the two teams in each chukka by total player handicap. Because every
// player is kept on one shirt colour all evening (and the first four are seeded
// onto fixed alternating colours), a chukka can end up lopsided — all the strong
// players on one colour, e.g. -6 vs +4. For any chukka whose team handicaps
// differ by more than MAX_OK_TEAM_DIFF, swap the single pair that most reduces
// the gap, repeating until it's within tolerance or no swap helps. The first
// four are NOT exempt — they get moved like anyone else when balance needs it.
// Well-balanced chukkas are left untouched (everyone keeps their usual bib); a
// lopsided chukka just has two players switch bibs for that one chukka. Team
// sums are recomputed from the players first, so this also repairs draws that
// were generated before this balancing existed.
const MAX_OK_TEAM_DIFF = 2;
function rebalanceChukkaTeams(chukkas) {
  (chukkas || []).forEach(ck => {
    if (!ck || !Array.isArray(ck.teamA) || !Array.isArray(ck.teamB)) return;
    const hsum = (team) => team.reduce((s, p) => s + (Number(p.handicap) || 0), 0);
    ck.sumA = hsum(ck.teamA);
    ck.sumB = hsum(ck.teamB);
    let guard = (ck.teamA.length + ck.teamB.length) * (ck.teamA.length + ck.teamB.length) + 4;
    while (Math.abs(ck.sumA - ck.sumB) > MAX_OK_TEAM_DIFF && guard-- > 0) {
      let best = null, bestAbs = Math.abs(ck.sumA - ck.sumB);
      for (const a of ck.teamA) {
        for (const b of ck.teamB) {
          const ha = Number(a.handicap) || 0, hb = Number(b.handicap) || 0;
          const newSumA = ck.sumA - ha + hb;
          const newSumB = ck.sumB - hb + ha;
          const newAbs = Math.abs(newSumA - newSumB);
          if (newAbs < bestAbs) { bestAbs = newAbs; best = { a, b, newSumA, newSumB }; }
        }
      }
      if (!best) break;
      ck.teamA = ck.teamA.filter(p => p.id !== best.a.id); ck.teamA.push(best.b);
      ck.teamB = ck.teamB.filter(p => p.id !== best.b.id); ck.teamB.push(best.a);
      ck.sumA = best.newSumA; ck.sumB = best.newSumB;
    }
  });
  return chukkas;
}

// Build a full evening schedule from the roster
function buildSchedule(players, startMin, maxPerTeam = 4) {
if (players.length === 0) return null;

// Per-chukka slot cap = teams of at most `maxPerTeam` a side (4 on grass, 3 in
// the arena). Shadows the module default within this function so all the sizing
// and fill logic below respects it: capping a chukka at 2×maxPerTeam makes the
// team split (ceil(n/2)) come out at maxPerTeam per side.
const SLOTS_PER_CHUKKA = Math.max(2, maxPerTeam) * 2;

// Separate VIP players (played first, never reduced below requested count)
// from regular players. Within each group, order is preserved (roster order
// = scheduling priority; earlier in list = first pick of chukkas).
const vipPlayers = players.filter(p => p.vip);
const regularPlayers = players.filter(p => !p.vip);
const ordered = [...vipPlayers, ...regularPlayers];

const totalRequested = ordered.reduce((s, p) => s + p.chukkas, 0);
const maxIndividual = ordered.length ? Math.max(...ordered.map(p => p.chukkas)) : 1;
// Start from the capacity- and keenest-request-driven size, then shrink only
// if there aren't enough player-slots to fill every chukka to a valid format
// (>=4 players = 2v2). effTotalSlots(K) caps each player's slots at K, so it
// reflects the slots actually available at that chukka count. This keeps
// everyone's requested count wherever the bodies allow it, and trims chukkas
// (capping the keenest, reported below) only when needed to avoid sub-format
// (1v1 / 2v1) chukkas.
let numChukkas = Math.max(1, Math.ceil(totalRequested / SLOTS_PER_CHUKKA), maxIndividual);
const effTotalSlots = (K) => ordered.reduce((s, p) => s + Math.min(p.chukkas, K), 0);
while (numChukkas > 1 && effTotalSlots(numChukkas) < MIN_PLAYERS_PER_CHUKKA * numChukkas) {
  numChukkas--;
}

// Each chukka has a strict cap of SLOTS_PER_CHUKKA (= 8 = 4 per team)
const chukkaPlayers = Array.from({ length: numChukkas }, () => []);

const assignments = new Map();
const capped = []; // wanted more chukkas than the evening has at all
const reduced = []; // got fewer chukkas than wanted due to capacity

// Helper: place one pass of chukkas for a player given a minimum step size.
// Returns the list of chukka indices placed, updating chukkaPlayers and
// chukkaPlayers in place. No per-chukka hard cap — uneven teams are allowed.
const placePlayer = (player, wantedCount, availableIdx, availableToIdx, minStep) => {
  const placed = [];

  if (minStep <= 1) {
    // Regular players: spread across the least-loaded chukkas so the load is
    // even and as many people as possible get their full requested count.
    while (placed.length < wantedCount) {
      let bestC = -1, bestLoad = Infinity;
      for (let c = availableIdx; c <= availableToIdx; c++) {
        if (chukkaPlayers[c].length >= SLOTS_PER_CHUKKA) continue; // never exceed 4v4
        if (placed.includes(c)) continue;
        if (chukkaPlayers[c].length < bestLoad) { bestLoad = chukkaPlayers[c].length; bestC = c; }
      }
      if (bestC === -1) break;
      placed.push(bestC);
      chukkaPlayers[bestC].push(player);
    }
    return placed.sort((a, b) => a - b);
  }

  // No-consecutive players: keep an every-other-chukka rhythm — a preferred gap
  // of exactly minStep (= 2) — so they're never back-to-back AND never stranded
  // (e.g. first chukka then nothing until the last). Pick the start phase
  // (odd/even) that's less loaded and can fit the most, then step by 2, only
  // widening the gap past a full chukka.
  const phaseScore = (start) => {
    let load = 0, fit = 0, last = -Infinity;
    for (let c = start; c <= availableToIdx && fit < wantedCount; c++) {
      if (c - last < minStep) continue;
      if (chukkaPlayers[c].length >= SLOTS_PER_CHUKKA) continue;
      load += chukkaPlayers[c].length; fit++; last = c;
    }
    // Heavily prefer phases that fit more of the requested chukkas, then lighter load.
    return (wantedCount - fit) * 1000 + load;
  };
  let cursor = availableIdx;
  if (availableIdx + 1 <= availableToIdx && phaseScore(availableIdx + 1) < phaseScore(availableIdx)) {
    cursor = availableIdx + 1;
  }
  while (placed.length < wantedCount && cursor <= availableToIdx) {
    // earliest non-full slot at/after the cursor that keeps the >=2 gap
    let c = cursor;
    while (c <= availableToIdx && (
      chukkaPlayers[c].length >= SLOTS_PER_CHUKKA ||
      (placed.length && c - placed[placed.length - 1] < minStep)
    )) c++;
    if (c > availableToIdx) break;
    placed.push(c);
    chukkaPlayers[c].push(player);
    cursor = c + minStep; // prefer the next slot exactly 2 chukkas later
  }
  return placed.sort((a, b) => a - b);
};

ordered.forEach(player => {
  const wantedRaw = player.chukkas;

  let availableIdx = 0;
  if (player.availableFrom) {
    const targetMin = parseTime(player.availableFrom);
    if (targetMin !== null) {
      availableIdx = Math.max(0, Math.ceil((targetMin - startMin) / CHUKKA_INTERVAL_MIN));
    }
  }
  let availableToIdx = numChukkas - 1;
  if (player.availableTo) {
    const targetMin = parseTime(player.availableTo);
    if (targetMin !== null) {
      const idx = Math.floor((targetMin - startMin) / CHUKKA_INTERVAL_MIN);
      availableToIdx = Math.min(numChukkas - 1, idx);
    }
  }
  const availableCount = Math.max(0, availableToIdx - availableIdx + 1);

  // Cap by total chukkas in the schedule
  const cappedWanted = Math.min(wantedRaw, numChukkas);
  if (cappedWanted < wantedRaw) {
    capped.push({ player, requested: wantedRaw, given: cappedWanted });
  }
  // For VIP players, never reduce below their requested count due to capacity;
  // they have already been placed first so they should always get their slots
  // (subject only to the total-chukka cap above and their availability window).
  const wanted = Math.min(cappedWanted, availableCount);

  // noConsecutive players require a gap of at least 1 chukka between
  // assignments (so they are never in back-to-back chukkas). All other
  // players use a step of 1 (adjacent slots are fine).
  const minStep = player.noConsecutive ? 2 : 1;
  let myChukkas = placePlayer(player, wanted, availableIdx, availableToIdx, minStep);

  // Intentionally NO adjacent-slot fallback for noConsecutive players: if the
  // gap-preserving pass can't fit every requested chukka (capacity pressure),
  // we leave them short — reported below — rather than break the
  // no-back-to-back rule by seating them in consecutive chukkas.

  if (myChukkas.length < cappedWanted && !player.vip) {
    reduced.push({ player, requested: cappedWanted, given: myChukkas.length });
  } else if (myChukkas.length < cappedWanted && player.vip) {
    // VIP shortfall still reported but labelled distinctly in the UI
    reduced.push({ player, requested: cappedWanted, given: myChukkas.length });
  }

  assignments.set(player.id, myChukkas.sort((a, b) => a - b));
});

// Redistribution pass — balance player counts across chukkas.
// Any chukka with more players than the thinnest one is a valid donor
// (4→3 is fine — uneven teams let more people play). VIP players are never moved.
let safety = numChukkas * SLOTS_PER_CHUKKA * 2;
while (safety-- > 0) {
  // Find the chukka with the fewest players (below MIN_PLAYERS_PER_CHUKKA)
  let underIdx = -1, underCount = MIN_PLAYERS_PER_CHUKKA;
  for (let i = 0; i < numChukkas; i++) {
    if (chukkaPlayers[i].length < underCount) {
      underIdx = i;
      underCount = chukkaPlayers[i].length;
    }
  }
  if (underIdx === -1) break;

  // Find the donor: most-loaded chukka that has strictly more players than underIdx
  let bestSrcIdx = -1, bestPlayer = null, bestSrcCount = underCount;
  for (let s = 0; s < numChukkas; s++) {
    if (s === underIdx) continue;
    if (chukkaPlayers[s].length <= bestSrcCount) continue;
    const movable = chukkaPlayers[s].find(p =>
      !p.vip &&
      !chukkaPlayers[underIdx].some(q => q.id === p.id) &&
      // Don't move a no-consecutive player into a chukka next to one they're
      // already in — that would create the back-to-back we're avoiding.
      !(p.noConsecutive && (
        (underIdx > 0 && chukkaPlayers[underIdx - 1].some(q => q.id === p.id)) ||
        (underIdx < numChukkas - 1 && chukkaPlayers[underIdx + 1].some(q => q.id === p.id))
      ))
    );
    if (movable) {
      bestSrcIdx = s;
      bestPlayer = movable;
      bestSrcCount = chukkaPlayers[s].length;
    }
  }
  if (bestSrcIdx === -1) break;

  chukkaPlayers[bestSrcIdx] = chukkaPlayers[bestSrcIdx].filter(p => p.id !== bestPlayer.id);
  chukkaPlayers[underIdx].push(bestPlayer);
}

// Build each chukka with balanced teams. Teams may be uneven (e.g. 4v3) when
// player counts are odd — that is acceptable and preferred over leaving people out.
// Build each chukka's teams while keeping every player on ONE shirt colour for
// the whole evening, so nobody has to keep swapping bibs. A player's colour
// (teamA = Blue, teamB = White) is fixed the first time they appear and reused
// in every later chukka. Per-chukka size caps keep the teams within one player
// of each other; a player is only moved off their colour when their side is
// full (unavoidable for a playable game), and that becomes their colour from
// then on. New players fill the lighter side, balancing size then handicap.
const playerColor = new Map(); // id -> 'A' | 'B'

// Seed the first four players (roster order) onto alternating shirt colours so
// they're always split across the two teams, whichever chukka they're in:
// 1st White, 2nd Blue, 3rd White, 4th Blue. (teamA = Blue = 'A', teamB = White
// = 'B'.) They're seated before anyone else in each chukka so they keep these
// colours; everyone else is coloured by the balancing algorithm below.
const fixedColorIds = new Set();
players.slice(0, 4).forEach((p, i) => {
  playerColor.set(p.id, i % 2 === 0 ? 'B' : 'A'); // even index → White(B), odd → Blue(A)
  fixedColorIds.add(p.id);
});

const chukkas = chukkaPlayers.map((inChukka, c) => {
  const n = inChukka.length;
  const capA = Math.ceil(n / 2);
  const capB = n - capA;
  const sorted = [...inChukka].sort((a, b) => b.handicap - a.handicap);

  const teamA = [], teamB = [];
  let sumA = 0, sumB = 0;
  const addA = (p) => { teamA.push(p); sumA += p.handicap; playerColor.set(p.id, 'A'); };
  const addB = (p) => { teamB.push(p); sumB += p.handicap; playerColor.set(p.id, 'B'); };

  const place = (p) => {
    const want = playerColor.get(p.id);
    const roomA = teamA.length < capA;
    const roomB = teamB.length < capB;
    let col;
    if (want === 'A' && roomA) col = 'A';            // keep their shirt
    else if (want === 'B' && roomB) col = 'B';       // keep their shirt
    else if (roomA && !roomB) col = 'A';             // only one side has room
    else if (roomB && !roomA) col = 'B';
    else if (teamA.length !== teamB.length) col = teamA.length < teamB.length ? 'A' : 'B'; // balance size
    else col = sumA <= sumB ? 'A' : 'B';             // balance handicap
    (col === 'A' ? addA : addB)(p);
  };

  // Fixed first-four seated first (so they always keep their colour), then
  // other returning players (honour their colour), then newcomers (balance).
  sorted.filter(p => fixedColorIds.has(p.id)).forEach(place);
  sorted.filter(p => !fixedColorIds.has(p.id) && playerColor.has(p.id)).forEach(place);
  sorted.filter(p => !playerColor.has(p.id)).forEach(place);

  return {
    idx: c,
    number: c + 1,
    time: chukkaTime(c, startMin),
    isEarly: c < numChukkas / 2,
    teamA, teamB, sumA, sumB,
    playerCount: n,
  };
});

// Even out the teams in any lopsided chukka (see rebalanceChukkaTeams).
rebalanceChukkaTeams(chukkas);

return { chukkas, numChukkas, totalSlots: totalRequested, unplaced: [], capped, reduced };
}

export default function DruidsApp() {
  // Restore where the user last was so a refresh doesn't bounce them home.
  // Read once on mount (null if absent or older than the max age).
  const [restoredView] = useState(readViewState);

  // Top-level tabs: 'chukkas' | 'fixtures' | 'live' | 'shop' | 'players' | 'teams'.
  // The chukka days now live on their own menu inside the 'chukkas' tab.
  const [activeTab, setActiveTab] = useState(() => {
    const tab = restoredView && restoredView.activeTab;
    if (!tab) return 'chukkas';
    // Don't restore a captain-only tab unless the captain flag is present.
    let isCaptain = false;
    try { isCaptain = sessionStorage.getItem('dlpc-captain') === '1'; } catch (e) {}
    if (CAPTAIN_ONLY_TABS.includes(tab) && !isCaptain) return 'chukkas';
    return tab;
  });
  // Which chukka day is being viewed/booked within the Chukkas tab.
  const [activeDay, setActiveDay] = useState(() =>
    (restoredView && DAY_KEYS.includes(restoredView.activeDay)) ? restoredView.activeDay : 'sat');
  // Shop: selected variant per product (e.g. mallet length). Pre-Stripe placeholder.
  const [shopOptions, setShopOptions] = useState({});
  // Tournament committee printed on the programme rules page. Captain-editable
  // in Fixtures, shared across devices. Empty = fall back to the built-in list.
  const [committee, setCommittee] = useState('');
  const [committeeDraft, setCommitteeDraft] = useState(null); // local buffer while typing

  // Per-day chukkas state — rosters, schedules, throw-in times all keyed by day.
  // Built from DAY_KEYS so adding a day can't miss an initialiser.
  const [rosters, setRosters] = useState(() => Object.fromEntries(DAY_KEYS.map(k => [k, []])));
  const [schedules, setSchedules] = useState(() => Object.fromEntries(DAY_KEYS.map(k => [k, null])));
  const [throwInMins, setThrowInMins] = useState(() => Object.fromEntries(DAY_KEYS.map(k => [k, DAY_CONFIG[k].defaultStartMin])));
  // Which ground each day's chukkas are played on — captain-selectable from
  // GROUND_OPTIONS, persisted per day, shown on the chukka table and exports.
  const [grounds, setGrounds] = useState(() => Object.fromEntries(DAY_KEYS.map(k => [k, ''])));
  // Captain can manually close sign-ups for a day (e.g. when it's full), on top
  // of the automatic time-based cutoff. Persisted per day and synced.
  const [manualClosed, setManualClosed] = useState(() => Object.fromEntries(DAY_KEYS.map(k => [k, false])));
  // The draw stays hidden from members until the captain publishes it, so they
  // only see it when it's ready. Persisted per day and synced.
  const [drawPublished, setDrawPublished] = useState(() => Object.fromEntries(DAY_KEYS.map(k => [k, false])));

  // Form state (shared across days — the form belongs to whichever day is active)
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [handicap, setHandicap] = useState('');
  const [chukkas, setChukkas] = useState('');
  // Transient "name copied" hint for the HPA look-up link ('' | 'signup' | 'editor').
  const [hpaCopied, setHpaCopied] = useState('');
  // Copy a player's name to the clipboard so it can be pasted straight into the
  // HPA member search. The HPA search is a Sport:80 Vue widget with no URL
  // parameter to pre-fill the name, so copy-then-paste is the reliable route;
  // the link still opens the search even if the clipboard write is blocked.
  const copyNameForHpa = (playerName, ctx) => {
    const n = (playerName || '').trim();
    if (!n) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(n);
      }
      setHpaCopied(ctx);
      setTimeout(() => setHpaCopied(''), 4000);
    } catch (e) {
      /* clipboard unavailable — the link still opens the HPA search */
    }
  };
  // Player's earliest available start time (HH:MM string matching one of the
  // first four chukka start times for the active day). Empty string means
  // "available from throw-in" — the default.
  const [availableFrom, setAvailableFrom] = useState('');
  // Player's latest available chukka — HH:MM string matching the START time
  // of the last chukka they can play (INCLUSIVE). Empty string means
  // "available until the end of the evening" — the default.
  const [availableTo, setAvailableTo] = useState('');
const [vip, setVip] = useState(false);
const [noConsecutive, setNoConsecutive] = useState(false);
const [ponyHire, setPonyHire] = useState(false);  // signup: needs to hire a pony (affects price) — off by default
  const [error, setError] = useState('');
  const [bookingMsg, setBookingMsg] = useState('');   // post-signup cost confirmation
  const [dueMethod, setDueMethod] = useState({});      // per-due payment-method picker in Checkout

  // Throw-in time editor (captain mode)
  const [throwInEditing, setThrowInEditing] = useState(false);
  const [throwInInput, setThrowInInput] = useState('');

  const activeDayConfig = DAY_CONFIG[activeDay];

  // Convenience accessors so the existing component code can keep using
  // `players`, `schedule`, etc. without knowing about the day dimension.
  const players = rosters[activeDay];
  const schedule = schedules[activeDay];
  const throwInMin = throwInMins[activeDay];
  const ground = grounds[activeDay];

  // Handicap gate (Friday instructional = beginners only). Returns a reason
  // string when the handicap is too high for the day, otherwise ''.
  const handicapBlockReason = (h, dayKey = activeDay) => {
    const cfg = DAY_CONFIG[dayKey];
    if (cfg.maxHandicap == null || h === '' || h == null) return '';
    const n = typeof h === 'number' ? h : parseInt(h, 10);
    if (isNaN(n) || n <= cfg.maxHandicap) return '';
    return `${cfg.fullLabel} sessions are for beginners only — handicap ${fmtH(cfg.maxHandicap)} and below. Please book onto Thursday, Saturday or Sunday chukkas instead.`;
  };
  // Max chukkas bookable on a day (Friday: 2, in a one-hour session)
  const maxChukkasFor = (dayKey = activeDay) => DAY_CONFIG[dayKey].maxChukkas || 8;
  // Days where everyone plays a set number of chukkas (Friday instructional: 2).
  const fixedChukkasFor = (dayKey = activeDay) => DAY_CONFIG[dayKey].fixedChukkas || null;

  // Keep the booking form in step with the selected day: on a fixed-length
  // session the chukkas box is locked to that number, and options that don't
  // apply to a short teaching session are cleared.
  useEffect(() => {
    const fixed = fixedChukkasFor(activeDay);
    setChukkas(fixed ? String(fixed) : '');
    if (DAY_CONFIG[activeDay].instructional) setNoConsecutive(false);
  }, [activeDay]); // eslint-disable-line react-hooks/exhaustive-deps

  // Setters that update only the active day's slice
  const setPlayers = (next) => setRosters(prev => ({
    ...prev,
    [activeDay]: typeof next === 'function' ? next(prev[activeDay]) : next,
  }));
  const setSchedule = (next) => setSchedules(prev => ({
    ...prev,
    [activeDay]: typeof next === 'function' ? next(prev[activeDay]) : next,
  }));

  // WhatsApp group settings
  const [waLink, setWaLink] = useState('');
  const [waEditing, setWaEditing] = useState(false);
  const [waInput, setWaInput] = useState('');

  // Members directory — remembers handicap/mobile/availability per name across weeks
  const [members, setMembers] = useState({});
  // Player database — captain-curated records, richer than the members autofill
  // cache. Synced under 'players'. Named playerDb to avoid clashing with the
  // existing roster `players` accessor. Carries student + subsidies[] so the
  // upcoming payment screen can attach subsidy pricing.
  const [playerDb, setPlayerDb] = useState([]);
  const [playerEditor, setPlayerEditor] = useState(null); // null | draft record being added/edited
  const [playerSearch, setPlayerSearch] = useState('');
  const [pdbError, setPdbError] = useState('');
  // Subsidies — captain-managed pots that fund per-chukka discounts for student
  // players. Synced under 'subsidies'. playersView toggles the Players tab between
  // the player list and subsidy management.
  const [subsidies, setSubsidies] = useState([]);
  const [subsidyEditor, setSubsidyEditor] = useState(null); // null | draft
  const [subError, setSubError] = useState('');
  const [playersView, setPlayersView] = useState('players'); // 'players' | 'subsidies' | 'checkout'
  const [transactions, setTransactions] = useState([]);
  const [checkout, setCheckout] = useState({ playerId: '', day: 'sat', chukkas: '4', ponyLevel: 'club', method: 'cash', note: '' });
  const [coError, setCoError] = useState('');
  const [lesson, setLesson] = useState({ playerId: '', lessonId: 'ind-1hr', method: 'cash', note: '' });
  const [lessonError, setLessonError] = useState('');
  const [teamReg, setTeamReg] = useState({ fixtureId: '', team: '', contact: '', mobile: '', category: 'member', optionId: 'm-6-2', method: 'transfer', note: '' });
  const [teamRegError, setTeamRegError] = useState('');

  // Fixtures state
  const [interest, setInterest] = useState({}); // { [fixtureId]: [{ id, name, handicap, mobile?, email? }] }
  const [expandedId, setExpandedId] = useState(null);
  const [fName, setFName] = useState('');
  const [fHandicap, setFHandicap] = useState('');
  const [fMobile, setFMobile] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fError, setFError] = useState('');
  const [fixtureDetails, setFixtureDetails] = useState({});
  const [teamsDb, setTeamsDb] = useState({}); // { [teamNameLower]: { name, handicap, players: [{name, handicap}] } }

  // Tournament team sign-ups — a team enters a fixture and can field a
  // different squad per day (e.g. Sat line-up ≠ Sun line-up by availability).
  // { [fixtureId]: [{ id, team, handicap, contact?, mobile?, perDay, days: { [dayKey]: [{name, handicap}] } }] }
  const [teamSignups, setTeamSignups] = useState({});
  const [tName, setTName] = useState('');
  const [tHandicap, setTHandicap] = useState('');
  const [tContact, setTContact] = useState('');
  const [tMobile, setTMobile] = useState('');
  const [tPerDay, setTPerDay] = useState(false);
  const [tSquads, setTSquads] = useState({}); // working draft: { [dayKey]: [{name, handicap}] }
  const [tError, setTError] = useState('');
  const [showTeamForm, setShowTeamForm] = useState(false);

  // Captain-editable fixtures list — seeded from the built-in 2026 list, then
  // persisted so captains can add ad hoc fixtures, edit details, and change the
  // handicap level. Stored under 'fixtures' and synced across devices.
  const [fixtures, setFixtures] = useState(FIXTURES_2026);
  // True once the Firestore 'fixtures' doc has been read at least once. Until then
  // we must not persist the built-in seed — doing so would resurrect deleted
  // fixtures (and wipe ad hoc ones) for everyone.
  const fixturesLoadedRef = useRef(false);
  const [fixtureEditor, setFixtureEditor] = useState(null); // null | { id?, month, date, name, level }
  const [trophyDraft, setTrophyDraft] = useState({}); // fxId -> in-progress "trophy looked after by" text, persisted on blur
  const [editingDetailsId, setEditingDetailsId] = useState(null);
  const isDesktop = useIsDesktop();
  const [boardFixtureId, setBoardFixtureId] = useState(null); // fixture open on the desktop board
  const [chukkaBoardOpen, setChukkaBoardOpen] = useState(false); // desktop chukka board
  const [showBackups, setShowBackups] = useState(false);
  const [backups, setBackups] = useState([]);
  const backupTimerRef = useRef(null);
  // Roster snapshots (chukka rosters) — separate from the fixture-details backups.
  const [showRosterBackups, setShowRosterBackups] = useState(false);
  const [rosterBackups, setRosterBackups] = useState([]);
  const rosterBackupTimerRef = useRef(null);
  const autoClearDoneRef = useRef(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importMsg, setImportMsg] = useState('');

  // Manual schedule editing
  const [activePlayer, setActivePlayer] = useState(null); // { chukkaIdx, playerId } | null
  const [addingTo, setAddingTo] = useState(null);          // chukkaIdx where "+ Add" picker is open
  const [editingAvailId, setEditingAvailId] = useState(null); // player id whose avail window is being edited
  const [scheduleView, setScheduleView] = useState('cards'); // 'cards' | 'table'
  const [confirmModal, setConfirmModal] = useState(null);   // { title, message, confirmLabel, onConfirm } | null
  const [captainMode, setCaptainMode] = useState(() => {
    try { return sessionStorage.getItem('dlpc-captain') === '1'; } catch (e) { return false; }
  });

  // What members are allowed to see. A fixture's match details stay private
  // until the captain publishes them, so a draw can be built without going live.
  // Captains always see everything.
  const visibleFixtureDetails = captainMode
    ? fixtureDetails
    : Object.fromEntries(Object.entries(fixtureDetails).filter(([fid]) =>
        fixtures.some(f => f.id === fid && f.detailsPublished)));
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [liveFixtureId, setLiveFixtureId] = useState(() => (restoredView && restoredView.liveFixtureId) || null);
  const [liveDayId, setLiveDayId] = useState(() => (restoredView && restoredView.liveDayId) || null);
  const [liveMatchId, setLiveMatchId] = useState(() => (restoredView && restoredView.liveMatchId) || null);
  const [liveDate, setLiveDate] = useState(() => (restoredView && restoredView.liveDate) || null);
  // Live scoreboard: whether the (collapsed-by-default) player lists are expanded.
  const [livePlayersOpen, setLivePlayersOpen] = useState(false);
  // Live scoreboard: whether the (collapsed-by-default) shirt-colour picker is open.
  const [liveColoursOpen, setLiveColoursOpen] = useState(false);

  // Persist the current tab + live-score selection so a refresh returns here
  // instead of the home screen. Stored with a timestamp (see readViewState).
  useEffect(() => {
    try {
      localStorage.setItem(VIEW_STATE_KEY, JSON.stringify({
        activeTab, activeDay, liveDate, liveFixtureId, liveDayId, liveMatchId, ts: Date.now(),
      }));
    } catch (e) {}
  }, [activeTab, activeDay, liveDate, liveFixtureId, liveDayId, liveMatchId]);

  // On first open of the Live Game tab, auto-select today's date — and the
  // tournament too if only one runs today — so the live game is right there
  // without hunting through the dropdowns. Only fires once, and never overrides
  // a selection that's already been made.
  const liveAutoPickedRef = useRef(false);
  useEffect(() => {
    if (activeTab !== 'live' || liveAutoPickedRef.current) return;
    if (liveDate) { liveAutoPickedRef.current = true; return; }
    // Only auto-pick a draw this viewer is allowed to see, or a member would
    // land on an unpublished fixture and get an empty Live Game.
    const fixtureDetails = visibleFixtureDetails;
    const now = new Date();
    const dom = now.getDate();
    const monthName = now.toLocaleString('en-GB', { month: 'long' }).toLowerCase();
    const yr = now.getFullYear();
    const dayRe = new RegExp('\\b' + dom + '(st|nd|rd|th)?\\b');
    const matchesToday = (label) => {
      if (!label) return false;
      const l = String(label).toLowerCase();
      if (!dayRe.test(l) || !l.includes(monthName)) return false;
      const ym = l.match(/\b(20\d{2})\b/);
      return !ym || Number(ym[1]) === yr;
    };
    const daysWithMatches = (fid) => ((fixtureDetails[fid] && fixtureDetails[fid].days) || []).filter(d => (d.matches || []).length > 0);
    const todayLabel = Array.from(new Set(
      Object.keys(fixtureDetails).flatMap(fid => daysWithMatches(fid).map(d => d.dateLabel).filter(Boolean))
    )).find(matchesToday);
    if (!todayLabel) return; // nothing scheduled today yet — retry if data loads
    liveAutoPickedRef.current = true;
    setLiveDate(todayLabel);
    const fids = Object.keys(fixtureDetails).filter(fid => daysWithMatches(fid).some(d => d.dateLabel === todayLabel));
    if (fids.length === 1) {
      setLiveFixtureId(fids[0]);
      const day = (fixtureDetails[fids[0]].days || []).find(d => d.dateLabel === todayLabel);
      setLiveDayId(day ? day.id : null);
    }
  }, [activeTab, fixtureDetails, liveDate]);

  const [loaded, setLoaded] = useState(false);
  const scheduleRef = useRef(null);

  // Scroll to the current/nearest fixture when the fixtures tab is opened.
  useEffect(() => {
    if (activeTab !== 'fixtures') return;
    const timer = setTimeout(() => {
      const now = new Date();
      let targetId = null;
      let bestDiff = Infinity;
      fixtures.forEach(fx => {
        const range = parseFixtureDateRange(fx);
        if (!range) return;
        const diff = now - range.start;
        if (diff >= 0 && diff < bestDiff) { bestDiff = diff; targetId = fx.id; }
      });
      if (!targetId) targetId = fixtures[0]?.id;
      if (targetId) {
        const el = document.querySelector('[data-fixture-id="' + targetId + '"]');
        if (el) {
          const nav = document.querySelector('.tabs');
          const navH = nav ? nav.offsetHeight : 44;
          const top = el.getBoundingClientRect().top + window.pageYOffset - navH - 8;
          window.scrollTo({ top, behavior: 'smooth' });
        }
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Captain PIN — visible in source, this is a soft gate not real security
  const CAPTAIN_PIN = '2004';

  // Booking cutoff: every chukka day closes 24 hours before its throw-in.
  // Captain mode always bypasses it.
  const CUTOFF_HOURS = 24;
  const CONTACT_EMAIL = 'abi@druidspolo.co.uk';

  const isBookingClosed = (dayKey = activeDay) => {
    if (manualClosed[dayKey]) return true; // captain closed it manually (e.g. full)
    // Every chukka day closes 24 hours before throw-in.
    const cutoff = targetDayThrowIn(dayKey).getTime() - CUTOFF_HOURS * 60 * 60 * 1000;
    return Date.now() >= cutoff;
  };

  // Human-readable explanation shown in the booking-closed banner and handleAdd error.
  const bookingClosedReason = (dayKey = activeDay) => {
    if (manualClosed[dayKey]) {
      return 'Sign-ups for this session are closed — it\u2019s full. Please contact the captain if you\u2019d still like to play.';
    }
    return `Sign-ups close 24 hours before throw-in (${DAY_CONFIG[dayKey].eveningPrev} ${fmtTime(throwInMins[dayKey])}).`;
  };

  // Target throw-in datetime for a given day. Rolls forward to next week
  // after that day's throw-in time has passed. Used by the Sat/Sun 24h cutoff.
  const targetDayThrowIn = (dayKey) => {
    const cfg = DAY_CONFIG[dayKey];
    const startMin = throwInMins[dayKey];
    const now = new Date();
    const dow = now.getDay();
    let daysAhead;
    if (dow === cfg.dow) {
      const mins = now.getHours() * 60 + now.getMinutes();
      daysAhead = mins < startMin ? 0 : 7;
    } else {
      daysAhead = (cfg.dow - dow + 7) % 7;
    }
    const target = new Date(now);
    target.setDate(now.getDate() + daysAhead);
    target.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
    return target;
  };

  // Sign-up cutoff datetime (ms) for a day — mirrors isBookingClosed():
  //   Wed closes Tuesday 12:00; Sat/Sun/Thu close 24h before throw-in.
  const cutoffTime = (dayKey) => {
    return targetDayThrowIn(dayKey).getTime() - CUTOFF_HOURS * 60 * 60 * 1000;
  };

  // Schedule iOS reminders for upcoming sessions that have sign-ups. Re-run on
  // launch and whenever rosters / throw-in times change. No-op on the web.
  const refreshLocalReminders = async () => {
    if (!isNativeApp || !LocalNotifications) return;
    try {
      let perm = await LocalNotifications.checkPermissions();
      if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions();
      if (perm.display !== 'granted') return;

      // Clear our own previously scheduled reminders before re-adding them.
      const pending = await LocalNotifications.getPending();
      const ours = (pending.notifications || []).filter(
        n => n.id >= REMINDER_ID_BASE && n.id < REMINDER_ID_BASE + 1000
      );
      if (ours.length) await LocalNotifications.cancel({ notifications: ours.map(n => ({ id: n.id })) });

      const now = Date.now();
      const toSchedule = [];
      DAY_KEYS.forEach((dayKey, i) => {
        const roster = rosters[dayKey] || [];
        if (!roster.length) return; // only remind about days that actually have players
        const cfg = DAY_CONFIG[dayKey];
        const timeStr = fmtTime(throwInMins[dayKey]);
        // Spell out special days (e.g. Thursday = ladies-only instructional) so the
        // notification is unambiguous — "Thursday chukkas (ladies-only instructional)".
        const dayDesc = cfg.notifyNote ? ` (${cfg.notifyNote})` : '';

        // Throw-in reminder — 2 hours before.
        const remindAt = targetDayThrowIn(dayKey).getTime() - 120 * 60 * 1000;
        if (remindAt > now + 60 * 1000) {
          toSchedule.push({
            id: REMINDER_ID_BASE + i * 2,
            title: 'Polo today 🏇',
            body: `${cfg.fullLabel} chukkas${dayDesc} — throw-in ${timeStr}. ${roster.length} signed up.`,
            schedule: { at: new Date(remindAt) },
          });
        }

        // Sign-ups closing reminder — 3 hours before the cutoff.
        const closeText = `${cfg.eveningPrev} at ${timeStr}`;
        const warnAt = cutoffTime(dayKey) - 180 * 60 * 1000;
        if (warnAt > now + 60 * 1000) {
          toSchedule.push({
            id: REMINDER_ID_BASE + i * 2 + 1,
            title: 'Sign-ups closing soon',
            body: `${cfg.fullLabel} chukkas${dayDesc} sign-ups close ${closeText}.`,
            schedule: { at: new Date(warnAt) },
          });
        }
      });
      if (toSchedule.length) await LocalNotifications.schedule({ notifications: toSchedule });
    } catch (e) { /* reminders are best-effort — never block the app */ }
  };

  // (Re)schedule reminders on launch and whenever sessions change. iOS only.
  useEffect(() => {
    refreshLocalReminders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosters, throwInMins]);

  // Check session storage on mount — captain mode persists until tab closes
  useEffect(() => {
    try {
      if (sessionStorage.getItem('dlpc-captain') === '1') setCaptainMode(true);
    } catch (e) {}
  }, []);

  const openPinModal = () => {
    setPinInput('');
    setPinError('');
    setPinModalOpen(true);
  };

  const submitPin = () => {
    if (pinInput === CAPTAIN_PIN) {
      setCaptainMode(true);
      try { sessionStorage.setItem('dlpc-captain', '1'); } catch (e) {}
      setPinModalOpen(false);
      setPinInput('');
      setPinError('');
    } else {
      setPinError('Wrong PIN — try again.');
      setPinInput('');
    }
  };

  const lockCaptainMode = () => {
    setCaptainMode(false);
    // Bounce off any captain-only tab back to the chukka booking pages
    setActiveTab(prev => (['players', 'teams', 'shop'].includes(prev) ? 'chukkas' : prev));
    try { sessionStorage.removeItem('dlpc-captain'); } catch (e) {}
  };

  // Hard refresh — clears caches and busts iOS's web-clip HTML cache.
  // Used by the manual refresh button and the prolonged-hidden listener below.
  const [refreshing, setRefreshing] = useState(false);

  const hardRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch (e) {}
    // small delay so the user sees the spinner — proves the tap registered
    await new Promise(r => setTimeout(r, 400));
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('_t', Date.now().toString());
      window.location.href = url.toString();
    } catch (e) {
      window.location.reload();
    }
  };

  // Auto-refresh when the user returns to the app after being away >5 minutes.
  // Fixes iOS PWA shortcuts that hold stale builds when Safari caches index.html.
  useEffect(() => {
    let hiddenAt = null;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
      } else if (hiddenAt && Date.now() - hiddenAt > 5 * 60 * 1000) {
        hiddenAt = null;
        hardRefresh();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Storage keys are suffixed by day, except Wed which keeps its original
  // un-suffixed keys to preserve existing Firestore data.
  const storageKey = (base, dayKey) => `${base}-${dayKey}`;

  // Load shared data
  useEffect(() => {
    const loadAll = async () => {
      // Auto-clear stale rosters per day: if a roster was stamped for a past
      // day, that day's chukkas are done — wipe it from Firestore so the next
      // person sees a fresh empty roster for the upcoming day.
      // SAFETY: loadAll re-runs on every remote change, but this destructive
      // clear must run at most ONCE per session and only on a well-formed stamp
      // that is genuinely in the past — never on a today/upcoming stamp — so it
      // can't delete a current roster (which previously lost sign-ups). It also
      // snapshots the roster to backups first, so a clear is always recoverable.
      if (!autoClearDoneRef.current) {
        autoClearDoneRef.current = true;
        for (const dk of DAY_KEYS) {
          try {
            const rw = await window.storage.get(storageKey('roster-week', dk), true);
            const storedWeek = rw?.value;
            const isValidPastStamp = typeof storedWeek === 'string'
              && /^\d{4}-\d{2}-\d{2}$/.test(storedWeek)
              && storedWeek < currentDayISO(dk);
            if (isValidPastStamp) {
              try {
                const r = await window.storage.get(storageKey('roster', dk), true);
                const arr = r?.value ? JSON.parse(r.value) : [];
                if (Array.isArray(arr) && arr.length) {
                  await writeRosterBackup({ [dk]: arr }, `auto-clear ${dk} (was ${storedWeek})`);
                }
              } catch (e) {}
              await Promise.all([
                window.storage.delete(storageKey('roster', dk), true).catch(() => {}),
                window.storage.delete(storageKey('roster-week', dk), true).catch(() => {}),
                window.storage.delete(storageKey('schedule', dk), true).catch(() => {}),
              ]);
            }
          } catch (e) {}
        }
      }

      // Load per-day rosters, schedules and throw-in times
      const nextRosters = Object.fromEntries(DAY_KEYS.map(k => [k, []]));
      const nextSchedules = Object.fromEntries(DAY_KEYS.map(k => [k, null]));
      const nextThrowIns = Object.fromEntries(DAY_KEYS.map(k => [k, DAY_CONFIG[k].defaultStartMin]));
      const nextGrounds = Object.fromEntries(DAY_KEYS.map(k => [k, '']));
      const nextClosed = Object.fromEntries(DAY_KEYS.map(k => [k, false]));
      const nextPublished = Object.fromEntries(DAY_KEYS.map(k => [k, false]));
      for (const dk of DAY_KEYS) {
        try {
          const r = await window.storage.get(storageKey('roster', dk), true);
          if (r?.value) nextRosters[dk] = JSON.parse(r.value);
        } catch (e) {}
        try {
          const s = await window.storage.get(storageKey('schedule', dk), true);
          // Load the saved draw exactly as stored — do NOT re-balance here.
          // Balancing only happens once, when the draw is first generated;
          // re-applying it on every load would undo a captain's manual team
          // swaps (e.g. moving two players onto the same team).
          if (s?.value) { const parsed = JSON.parse(s.value); nextSchedules[dk] = parsed; }
        } catch (e) {}
        try {
          const t = await window.storage.get(storageKey('throwin', dk), true);
          if (t?.value) {
            const parsed = parseTime(t.value);
            if (parsed !== null) nextThrowIns[dk] = parsed;
          }
        } catch (e) {}
        try {
          const g = await window.storage.get(storageKey('ground', dk), true);
          if (g?.value) nextGrounds[dk] = g.value;
        } catch (e) {}
        try {
          const bc = await window.storage.get(storageKey('booking-closed', dk), true);
          if (bc?.value) nextClosed[dk] = bc.value === '1';
        } catch (e) {}
        try {
          const dp = await window.storage.get(storageKey('draw-published', dk), true);
          if (dp?.value) nextPublished[dk] = dp.value === '1';
        } catch (e) {}
      }
      setRosters(nextRosters);
      setSchedules(nextSchedules);
      setThrowInMins(nextThrowIns);
      setGrounds(nextGrounds);
      setManualClosed(nextClosed);
      setDrawPublished(nextPublished);

      try {
        const f = await window.storage.get('fixture-interest', true);
        if (f?.value) setInterest(JSON.parse(f.value));
      } catch (e) {}
      try {
        const fd = await window.storage.get('fixture-details', true);
        let parsed = (fd && fd.value) ? JSON.parse(fd.value) : {};
        setFixtureDetails(parsed);
        const tdb = await window.storage.get('teams-db', true);
        if (tdb?.value) setTeamsDb(JSON.parse(tdb.value));
        const ts = await window.storage.get('team-signups', true);
        if (ts?.value) setTeamSignups(JSON.parse(ts.value));
        const fxs = await window.storage.get('fixtures', true);
        if (fxs?.value) {
          // Firestore is authoritative once the doc exists: apply it verbatim,
          // even if it is shorter than the built-in seed (captains may have
          // deleted fixtures). This stops the hardcoded FIXTURES_2026 seed from
          // masquerading as live data — which was resurrecting deleted fixtures
          // (e.g. Queen's Royal Lancers) and hiding ad hoc ones (e.g. 9th Lancer).
          const arr = JSON.parse(fxs.value);
          if (Array.isArray(arr)) setFixtures(arr);
          fixturesLoadedRef.current = true;
        } else {
          // No fixtures doc yet (genuine first run): establish it from the
          // built-in seed so future adds/edits/deletes persist instead of
          // falling back to the seed on the next load.
          try { await window.storage.set('fixtures', JSON.stringify(FIXTURES_2026), true); } catch (e) {}
          fixturesLoadedRef.current = true;
        }
      } catch (e) {}
      try {
        const w = await window.storage.get('wa-link', true);
        if (w?.value) setWaLink(w.value);
      } catch (e) {}
      try {
        const cm = await window.storage.get('committee', true);
        if (cm?.value) setCommittee(cm.value);
      } catch (e) {}
      try {
        const m = await window.storage.get('members', true);
        if (m?.value) setMembers(JSON.parse(m.value));
      } catch (e) {}
      try {
        const p = await window.storage.get('players', true);
        if (p?.value) { const arr = JSON.parse(p.value); if (Array.isArray(arr)) setPlayerDb(arr); }
      } catch (e) {}
      try {
        const s = await window.storage.get('subsidies', true);
        if (s?.value) { const arr = JSON.parse(s.value); if (Array.isArray(arr)) setSubsidies(arr); }
      } catch (e) {}
      try {
        const t = await window.storage.get('transactions', true);
        if (t?.value) { const arr = JSON.parse(t.value); if (Array.isArray(arr)) setTransactions(arr); }
      } catch (e) {}
      setLoaded(true);
    };
    loadAll();
    const onRemoteChange = () => loadAll();
    window.addEventListener('storage-changed', onRemoteChange);
    return () => window.removeEventListener('storage-changed', onRemoteChange);
  }, []);

  // When the throw-in time changes, clear any pending availableFrom / availableTo
  // values that no longer correspond to a valid option in the updated dropdowns.
  // This prevents the selects showing a stale time that isn't in the option list.
  useEffect(() => {
    const fromOptions = new Set([0, 1, 2, 3, 4, 5, 6, 7].map(i => fmtTime(throwInMin + i * CHUKKA_INTERVAL_MIN)));
    const toOptions   = new Set([0, 1, 2, 3, 4, 5, 6, 7].map(i => fmtTime(throwInMin + i * CHUKKA_INTERVAL_MIN)));
    if (availableFrom && !fromOptions.has(availableFrom)) setAvailableFrom('');
    if (availableTo   && !toOptions.has(availableTo))     setAvailableTo('');
  }, [throwInMin]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Chukkas — day-aware save helpers ─────────────────────────────────
  const saveRoster = async (newPlayers, dayKey = activeDay) => {
    setRosters(prev => ({ ...prev, [dayKey]: newPlayers }));
    // Snapshot the rosters after this change (debounced), so sign-ups can be
    // recovered if a roster is later cleared or overwritten.
    scheduleRosterBackup({ ...rosters, [dayKey]: newPlayers });
    try {
      await window.storage.set(storageKey('roster', dayKey), JSON.stringify(newPlayers), true);
      // Stamp which day this roster is for, so we can auto-clear after.
      // Only stamp non-empty rosters; clearing means no stamp.
      if (newPlayers.length > 0) {
        await window.storage.set(storageKey('roster-week', dayKey), currentDayISO(dayKey), true);
      } else {
        try { await window.storage.delete(storageKey('roster-week', dayKey), true); } catch (e) {}
      }
    } catch (e) { setError('Saved locally only — check your connection.'); }
  };

  // Save schedule to Firestore so it syncs across devices.
  // Pass null to clear (e.g. when roster changes invalidate the draw).
  // Any change to the draw un-publishes it: a redraw must be published again, so
  // members never see a half-finished or superseded draw.
  const saveSchedule = async (nextSchedule, dayKey = activeDay) => {
    setSchedules(prev => ({ ...prev, [dayKey]: nextSchedule }));
    setDrawPublished(prev => (prev[dayKey] ? { ...prev, [dayKey]: false } : prev));
    try { await window.storage.delete(storageKey('draw-published', dayKey), true); } catch (e) {}
    try {
      if (nextSchedule === null) {
        await window.storage.delete(storageKey('schedule', dayKey), true);
      } else {
        await window.storage.set(storageKey('schedule', dayKey), JSON.stringify(nextSchedule), true);
      }
    } catch (e) {
      setError('Schedule saved locally only — check your connection.');
    }
  };

  // ── Day settings ─────────────────────────────────────────────────────────
  // Extracted so the phone's inline editors and the desktop chukka board drive
  // exactly the same code, rather than two copies that can drift.

  // Move a day's throw-in. Any existing draw keeps its teams and counts; only
  // the printed times shift, recomputed off the new start.
  const applyThrowIn = async (hhmm, dayKey = activeDay) => {
    const parsed = parseTime(hhmm);
    if (parsed === null) return false;
    setThrowInMins(prev => ({ ...prev, [dayKey]: parsed }));
    try { await window.storage.set(storageKey('throwin', dayKey), hhmm, true); } catch (e) {}
    const existing = schedules[dayKey];
    if (existing && existing.chukkas) {
      saveSchedule({
        ...existing,
        chukkas: existing.chukkas.map(ck => ({ ...ck, time: chukkaTime(ck.idx, parsed) })),
      }, dayKey);
    }
    return true;
  };

  const applyGround = async (val, dayKey = activeDay) => {
    setGrounds(prev => ({ ...prev, [dayKey]: val }));
    try { await window.storage.set(storageKey('ground', dayKey), val, true); } catch (err) {}
  };

  // Captain's manual "we're full" switch, on top of the automatic 24-hour cutoff.
  const toggleManualClosed = async (dayKey = activeDay) => {
    const val = !manualClosed[dayKey];
    setManualClosed(prev => ({ ...prev, [dayKey]: val }));
    try {
      if (val) await window.storage.set(storageKey('booking-closed', dayKey), '1', true);
      else await window.storage.delete(storageKey('booking-closed', dayKey), true);
    } catch (err) {}
  };

  // Publish / unpublish the active day's draw to members.
  const setPublished = async (val, dayKey = activeDay) => {
    setDrawPublished(prev => ({ ...prev, [dayKey]: val }));
    try {
      if (val) await window.storage.set(storageKey('draw-published', dayKey), '1', true);
      else await window.storage.delete(storageKey('draw-published', dayKey), true);
    } catch (e) {}
  };

  // Update the directory with this player's details (for next time's autofill).
  // IMPORTANT: this is an ADD-ONLY write. We merge onto the freshest SAVED
  // directory (not just React state), so a partially-loaded state — e.g. right
  // after a cold start, before Firestore has synced — can never overwrite the
  // fuller saved list and make names "disappear". The write can only ever grow
  // the directory.
  const upsertMember = async (player, extraMembers = members) => {
    const key = (player.name || '').trim().toLowerCase();
    if (!key) return extraMembers;
    // Base = union of the latest saved directory and the current state, so no
    // existing entries are ever dropped.
    let base = { ...extraMembers };
    try {
      const stored = await window.storage.get('members', true);
      if (stored?.value) {
        const parsed = JSON.parse(stored.value);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          base = { ...parsed, ...base };
        }
      }
    } catch (e) { /* fall back to state-only base */ }
    const updated = {
      ...base,
      [key]: {
        name: player.name.trim(),
        handicap: player.handicap,
        mobile: player.mobile || '',
        availableFrom: player.availableFrom || '',
        availableTo: player.availableTo || '',
        vip: player.vip || false,
        noConsecutive: player.noConsecutive || false,
        lastUsed: Date.now(),
      },
    };
    setMembers(updated);
    try { await window.storage.set('members', JSON.stringify(updated), true); } catch (e) {}
    return updated;
  };

  // --- Player database (captain-managed) ---
  const PLAYER_TYPES = ['Member', 'Associate', 'Guest'];
  const blankPlayer = () => ({
    id: '', name: '', handicap: '', email: '', mobile: '',
    type: 'Member', membership: 'none', student: false, unit: '', active: true,
    subsidies: [], notes: '',
  });
  const newPlayerId = (salt = '') => `p-${Date.now()}-${salt}${Math.random().toString(36).slice(2, 7)}`;
  const savePlayerDb = async (next) => {
    setPlayerDb(next);
    try { await window.storage.set('players', JSON.stringify(next), true); } catch (e) {}
  };
  const openNewPlayer = () => { setPdbError(''); setPlayerEditor(blankPlayer()); };
  const openEditPlayer = (p) => {
    setPdbError('');
    setPlayerEditor({ ...blankPlayer(), ...p, handicap: p.handicap == null ? '' : String(p.handicap) });
  };
  const savePlayer = async () => {
    const draft = playerEditor || {};
    const name = (draft.name || '').trim();
    if (!name) { setPdbError('Please enter a name.'); return; }
    const email = (draft.email || '').trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setPdbError('That email address looks off.'); return; }
    const record = {
      id: draft.id || newPlayerId(),
      name,
      handicap: draft.handicap === '' || draft.handicap == null ? null : Number(draft.handicap),
      email,
      mobile: (draft.mobile || '').trim(),
      type: draft.type || 'Member',
      membership: draft.membership || 'none',
      student: !!draft.student,
      unit: draft.student ? (draft.unit || '').trim() : '',
      active: draft.active !== false,
      subsidies: Array.isArray(draft.subsidies) ? draft.subsidies : [],
      notes: (draft.notes || '').trim(),
      updatedAt: Date.now(),
    };
    const exists = playerDb.some(p => p.id === record.id);
    const next = (exists ? playerDb.map(p => (p.id === record.id ? record : p)) : [...playerDb, record])
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    await savePlayerDb(next);
    // Keep the lightweight members autofill cache in step with the database.
    try { await upsertMember({ name: record.name, handicap: record.handicap, mobile: record.mobile }); } catch (e) {}
    setPlayerEditor(null);
    setPdbError('');
  };
  const deletePlayer = async (id) => {
    const p = playerDb.find(x => x.id === id);
    if (!window.confirm(`Remove ${p ? p.name : 'this player'} from the database? This does not affect rosters or fixtures.`)) return;
    await savePlayerDb(playerDb.filter(x => x.id !== id));
    setPlayerEditor(null);
  };
  const importEveryone = async () => {
    setPdbError('');
    const found = new Map(); // lower -> { name, handicap, mobile }
    const add = (nm, handicap, mobile) => {
      const name = (nm || '').trim();
      if (!name || name.toUpperCase() === 'TBC') return;
      if (name.includes('/')) return; // skip combined entries like "Jo Wells/Lucy Sleeman" (two players)
      const key = name.toLowerCase();
      const cur = found.get(key) || { name, handicap: null, mobile: '' };
      if ((cur.handicap == null) && handicap != null && handicap !== '') cur.handicap = handicap;
      if (!cur.mobile && mobile) cur.mobile = mobile;
      found.set(key, cur);
    };
    // Chukkas: members directory + every day's roster
    Object.values(members).forEach(m => add(m && m.name, m && m.handicap, m && m.mobile));
    Object.values(rosters || {}).forEach(arr => Array.isArray(arr) && arr.forEach(p => add(p.name, p.handicap, p.mobile)));
    // Tournaments: per-day sign-up squads, published match line-ups, teams DB
    Object.values(teamSignups || {}).forEach(list => Array.isArray(list) && list.forEach(s => {
      Object.values((s && s.days) || {}).forEach(sq => Array.isArray(sq) && sq.forEach(p => add(p.name, p.handicap)));
    }));
    Object.values(fixtureDetails || {}).forEach(det => ((det && det.days) || []).forEach(d => ((d && d.matches) || []).forEach(m => {
      ['teamA', 'teamB'].forEach(tk => ((m[tk] && m[tk].players) || []).forEach(p => add(p.name, p.handicap)));
    })));
    Object.values(teamsDb || {}).forEach(t => ((t && t.players) || []).forEach(p => add(p.name, p.handicap)));

    const existing = new Set(playerDb.map(p => (p.name || '').trim().toLowerCase()));
    const additions = [...found.values()]
      .filter(f => !existing.has(f.name.toLowerCase()))
      .map((f, i) => ({
        id: newPlayerId(`${i}-`),
        name: f.name,
        handicap: (f.handicap == null || f.handicap === '') ? null : Number(f.handicap),
        email: '', mobile: f.mobile || '', type: 'Member', membership: 'none',
        student: false, unit: '', active: true, subsidies: [], notes: '',
        updatedAt: Date.now(),
      }));
    if (!additions.length) { setPdbError('Everyone from chukkas and tournaments is already registered.'); return; }
    await savePlayerDb([...playerDb, ...additions].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    setPdbError(`Registered ${additions.length} player${additions.length === 1 ? '' : 's'} from chukkas and tournaments. Now set their memberships below.`);
  };
  const visiblePlayers = playerDb
    .filter(p => !playerSearch.trim() || (p.name || '').toLowerCase().includes(playerSearch.trim().toLowerCase()))
    .slice()
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  // --- Subsidies (captain-managed pots that power the payment screen) ---
  const fmtMoney = (n) => (Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const newSubsidyId = () => `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const subsidyDiscount = (s) => Number(s && (s.discountPerLesson != null ? s.discountPerLesson : s.discountPerChukka) || 0) || 0;
  const blankSubsidy = () => ({ id: '', name: '', balance: '', discountPerLesson: '', lowThreshold: '', active: true });
  const saveSubsidies = async (next) => {
    setSubsidies(next);
    try { await window.storage.set('subsidies', JSON.stringify(next), true); } catch (e) {}
  };
  const openNewSubsidy = () => { setSubError(''); setSubsidyEditor(blankSubsidy()); };
  const openEditSubsidy = (s) => {
    setSubError('');
    setSubsidyEditor({ id: s.id, name: s.name, balance: String(s.balance ?? ''), discountPerLesson: String(subsidyDiscount(s) || ''), lowThreshold: String(s.lowThreshold ?? ''), active: s.active !== false });
  };
  const saveSubsidy = async () => {
    const d = subsidyEditor || {};
    const name = (d.name || '').trim();
    if (!name) { setSubError('Please name the subsidy.'); return; }
    const disc = Number(d.discountPerLesson);
    if (!(disc > 0)) { setSubError('Per-lesson discount must be greater than £0.'); return; }
    const low = d.lowThreshold === '' ? 0 : Number(d.lowThreshold);
    if (isNaN(low) || low < 0) { setSubError('Low-balance threshold must be £0 or more.'); return; }
    const existing = subsidies.find(x => x.id === d.id);
    let record;
    if (existing) {
      // Editing never overwrites a live pot — the balance only moves via top-ups/spending.
      record = { ...existing, name, discountPerLesson: disc, discountPerChukka: undefined, lowThreshold: low, active: d.active !== false, updatedAt: Date.now() };
    } else {
      const opening = d.balance === '' ? 0 : Number(d.balance);
      if (isNaN(opening) || opening < 0) { setSubError('Opening balance must be £0 or more.'); return; }
      record = {
        id: newSubsidyId(), name, balance: opening, discountPerLesson: disc, lowThreshold: low,
        active: d.active !== false,
        topups: opening > 0 ? [{ id: newSubsidyId(), date: Date.now(), amount: opening, note: 'Opening balance' }] : [],
        spent: 0, updatedAt: Date.now(),
      };
    }
    const next = (existing ? subsidies.map(x => (x.id === record.id ? record : x)) : [...subsidies, record])
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    await saveSubsidies(next);
    setSubsidyEditor(null);
    setSubError('');
  };
  const topUpSubsidy = async (id) => {
    const s = subsidies.find(x => x.id === id); if (!s) return;
    const raw = window.prompt(`Top up "${s.name}". Current balance £${fmtMoney(s.balance)}.\nAmount to add (£):`, '');
    if (raw == null) return;
    const amt = Number(raw);
    if (!(amt > 0)) { setSubError('Top-up amount must be greater than £0.'); return; }
    const newBal = (Number(s.balance) || 0) + amt;
    const next = subsidies.map(x => (x.id === id
      ? { ...x, balance: newBal, topups: [...(x.topups || []), { id: newSubsidyId(), date: Date.now(), amount: amt }], updatedAt: Date.now() }
      : x));
    await saveSubsidies(next);
    setSubError(`Topped up "${s.name}" by £${fmtMoney(amt)} — new balance £${fmtMoney(newBal)}.`);
  };
  const deleteSubsidy = async (id) => {
    const s = subsidies.find(x => x.id === id);
    if (!window.confirm(`Delete subsidy "${s ? s.name : ''}"? The remaining pot balance is discarded and it is removed from all players.`)) return;
    await saveSubsidies(subsidies.filter(x => x.id !== id));
    const cleaned = playerDb.map(p => (Array.isArray(p.subsidies) && p.subsidies.includes(id)) ? { ...p, subsidies: p.subsidies.filter(sid => sid !== id) } : p);
    if (JSON.stringify(cleaned) !== JSON.stringify(playerDb)) await savePlayerDb(cleaned);
    setSubsidyEditor(null);
  };
  const activeSubsidies = subsidies.filter(s => s.active !== false);
  const lowSubsidies = activeSubsidies.filter(s => (Number(s.balance) || 0) <= (Number(s.lowThreshold) || 0));

  // --- Payments / checkout (manual mark-paid; Stripe slots in here later) ---
  // Chukka fee per chukka for a player whose membership doesn't include them.
  // The club charges £16.50 per chukka (matches included); a non-member also
  // pays the £150 non-member charge, which the captain records separately.
  const CHUKKA_FEE = 16.50;
  const chukkaFeeFor = (p) => {
    const mem = membershipById((p && p.membership) || 'none');
    if (mem.chukkasIncluded) return 0;
    return CHUKKA_FEE;
  };
  const priceBooking = (player, chukkas, ponyLevel) => {
    const n = Math.max(0, parseInt(chukkas, 10) || 0);
    const mem = membershipById((player && player.membership) || 'none');
    const wantsPony = !!ponyLevel && ponyLevel !== 'none';
    const ponyHire = wantsPony ? (PONY_HIRE_2026[ponyLevel] != null ? PONY_HIRE_2026[ponyLevel] : PONY_HIRE_2026.club) : 0;
    const chukkaFee = mem.chukkasIncluded ? 0 : chukkaFeeFor(player);   // pony hire is charged separately, even to members
    if (n === 0 || (ponyHire === 0 && chukkaFee === 0)) {
      return { freeToRoster: true, chukkas: n, ponyLevel: ponyLevel || 'club', wantsPony, ponyHire: 0, chukkaFee, gross: 0, studentDiscount: 0, total: 0 };
    }
    const gross = (ponyHire + chukkaFee) * n;
    const studentDiscount = (wantsPony && player && player.student ? STUDENT_DISCOUNT_PER_CHUKKA : 0) * n; // the £5 is the pony-hire delta
    const total = Math.max(0, gross - studentDiscount);   // subsidies apply to lessons, not chukkas
    return { freeToRoster: total <= 0, chukkas: n, ponyLevel: ponyLevel || 'club', wantsPony, ponyHire, chukkaFee, gross, studentDiscount, total };
  };
  const addPlayerToRoster = async (dayKey, player, chukkas) => {
    const list = rosters[dayKey] || [];
    const norm = (player.name || '').trim().replace(/\s+/g, ' ').toLowerCase();
    if (list.some(p => (p.name || '').trim().replace(/\s+/g, ' ').toLowerCase() === norm)) return false;
    const entry = {
      id: Date.now(), name: player.name, mobile: player.mobile || undefined,
      handicap: player.handicap == null ? 0 : Number(player.handicap),
      chukkas: Math.max(1, Math.min(8, parseInt(chukkas, 10) || 1)),
      availableFrom: '', availableTo: '', vip: false, noConsecutive: false,
    };
    await saveRoster([...list, entry], dayKey);
    return true;
  };
  const recordPayment = async (player, bd, opts) => {
    const o = opts || {};
    const paid = (bd.subsidyDeductions || []).filter(d => d.amount > 0);
    if (paid.length) {
      const nextSubs = subsidies.map(s => {
        const d = paid.find(x => x.id === s.id);
        return d ? { ...s, balance: (Number(s.balance) || 0) - d.amount, spent: (Number(s.spent) || 0) + d.amount, updatedAt: Date.now() } : s;
      });
      await saveSubsidies(nextSubs);
    }
    const tx = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, date: Date.now(),
      playerId: player.id, playerName: player.name, chukkas: bd.chukkas, ponyLevel: bd.ponyLevel,
      ponyHire: bd.ponyHire, chukkaFee: bd.chukkaFee, gross: bd.gross, studentDiscount: bd.studentDiscount,
      subsidyDeductions: paid.map(d => ({ id: d.id, name: d.name, amount: d.amount })),
      total: bd.total, status: 'paid', day: o.day || null, method: o.method || 'manual', note: (o.note || '').trim(), paidDate: Date.now(),
    };
    const nextTx = [tx, ...transactions];
    setTransactions(nextTx);
    try { await window.storage.set('transactions', JSON.stringify(nextTx), true); } catch (e) {}
    if (o.addToRoster && o.day) await addPlayerToRoster(o.day, player, bd.chukkas);
    return tx;
  };
  const markDuePaid = async (txId, method) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx || tx.status === 'paid') return;
    if (tx.subsidyDeductions && tx.subsidyDeductions.length) {
      const nextSubs = subsidies.map(s => {
        const d = tx.subsidyDeductions.find(x => x.id === s.id);
        if (!d) return s;
        const take = Math.max(0, Math.min(d.amount, Number(s.balance) || 0)); // never push a pot negative
        return { ...s, balance: (Number(s.balance) || 0) - take, spent: (Number(s.spent) || 0) + take, updatedAt: Date.now() };
      });
      await saveSubsidies(nextSubs);
    }
    const next = transactions.map(t => (t.id === txId ? { ...t, status: 'paid', method: method || 'cash', paidDate: Date.now() } : t));
    setTransactions(next);
    try { await window.storage.set('transactions', JSON.stringify(next), true); } catch (e) {}
  };
  const voidDue = async (txId) => {
    const tx = transactions.find(t => t.id === txId);
    if (!tx) return;
    if (!window.confirm(`Remove the £${fmtMoney(tx.total)} charge for ${tx.playerName}? Use this if they didn't play or you've taken them off the roster.`)) return;
    const next = transactions.filter(t => t.id !== txId);
    setTransactions(next);
    try { await window.storage.set('transactions', JSON.stringify(next), true); } catch (e) {}
  };
  const deleteTx = async (txId) => {
    const next = transactions.filter(t => t.id !== txId);
    setTransactions(next);
    try { await window.storage.set('transactions', JSON.stringify(next), true); } catch (e) {}
  };
  const clearHistory = async () => {
    const paid = transactions.filter(t => t.status !== 'due');
    if (!paid.length) return;
    if (!window.confirm(`Clear ${paid.length} recorded payment${paid.length === 1 ? '' : 's'} from the history? This removes the records only — it does not refund subsidy pots or change outstanding dues.`)) return;
    const next = transactions.filter(t => t.status === 'due');
    setTransactions(next);
    try { await window.storage.set('transactions', JSON.stringify(next), true); } catch (e) {}
  };

  // --- Lessons (coaching) pricing + payment. Subsidy pots apply here. ---
  const priceLesson = (player, lessonId) => {
    const lt = lessonById(lessonId);
    const student = !!(player && player.student);
    const base = student ? lt.student : lt.std;
    let running = base;
    const subsidyDeductions = [];
    ((player && player.subsidies) || []).forEach(sid => {
      const s = subsidies.find(x => x.id === sid && x.active !== false);
      if (!s) return;
      const desired = subsidyDiscount(s);
      const amount = Math.max(0, Math.min(desired, Number(s.balance) || 0, running)); // capped at pot + remaining total
      if (desired > 0) subsidyDeductions.push({ id: s.id, name: s.name, amount, desired, capped: amount < desired });
      running -= amount;
    });
    return { lessonId: lt.id, lessonLabel: lt.label, base, studentRate: student, subsidyDeductions, total: Math.max(0, running) };
  };
  const recordLessonPayment = async (player, bd, opts) => {
    const o = opts || {};
    const paid = (bd.subsidyDeductions || []).filter(d => d.amount > 0);
    if (paid.length) {
      const nextSubs = subsidies.map(s => {
        const d = paid.find(x => x.id === s.id);
        return d ? { ...s, balance: (Number(s.balance) || 0) - d.amount, spent: (Number(s.spent) || 0) + d.amount, updatedAt: Date.now() } : s;
      });
      await saveSubsidies(nextSubs);
    }
    const tx = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, date: Date.now(), kind: 'lesson',
      playerId: player.id, playerName: player.name, lessonId: bd.lessonId, lessonLabel: bd.lessonLabel,
      base: bd.base, studentRate: bd.studentRate,
      subsidyDeductions: paid.map(d => ({ id: d.id, name: d.name, amount: d.amount })),
      total: bd.total, status: 'paid', method: o.method || 'manual', note: (o.note || '').trim(), paidDate: Date.now(),
    };
    const nextTx = [tx, ...transactions];
    setTransactions(nextTx);
    try { await window.storage.set('transactions', JSON.stringify(nextTx), true); } catch (e) {}
    return tx;
  };
  const doLessonPaid = async () => {
    setLessonError('');
    const pl = playerDb.find(p => p.id === lesson.playerId);
    if (!pl) { setLessonError('Pick a player first.'); return; }
    const bd = priceLesson(pl, lesson.lessonId);
    await recordLessonPayment(pl, bd, { method: lesson.method, note: lesson.note });
    setLessonError(`Recorded £${fmtMoney(bd.total)} (${lesson.method}) for ${pl.name} — ${bd.lessonLabel}.`);
    setLesson(prev => ({ ...prev, playerId: '', note: '' }));
  };
  const doLessonDue = async () => {
    setLessonError('');
    const pl = playerDb.find(p => p.id === lesson.playerId);
    if (!pl) { setLessonError('Pick a player first.'); return; }
    const bd = priceLesson(pl, lesson.lessonId);   // pots are drawn down on settle, not now
    const dueTx = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, date: Date.now(), kind: 'lesson',
      playerId: pl.id, playerName: pl.name, day: null,
      lessonId: bd.lessonId, lessonLabel: bd.lessonLabel, base: bd.base, studentRate: bd.studentRate,
      subsidyDeductions: bd.subsidyDeductions.filter(d => d.amount > 0).map(d => ({ id: d.id, name: d.name, amount: d.amount })),
      total: bd.total, status: 'due', method: '', note: (lesson.note || '').trim(),
    };
    const nextTx = [dueTx, ...transactions];
    setTransactions(nextTx);
    try { await window.storage.set('transactions', JSON.stringify(nextTx), true); } catch (e) {}
    setLessonError(`Booked ${bd.lessonLabel} for ${pl.name} — £${fmtMoney(bd.total)} added to invoices.`);
    setLesson(prev => ({ ...prev, playerId: '', note: '' }));
  };

  // --- Tournament team registration + entry-fee payment (Teams tab). ---
  const priceEntry = (category, optionId) => {
    const o = entryOptionById(category, optionId) || entryOptions(category)[0];
    return { category, optionId: o ? o.id : '', label: o ? o.label : '', fee: o ? o.fee : 0 };
  };
  const validateEntry = () => {
    if (!teamReg.fixtureId) { setTeamRegError('Pick a fixture.'); return false; }
    if (!(teamReg.team || '').trim()) { setTeamRegError('Enter a team name.'); return false; }
    if (!entryOptionById(teamReg.category, teamReg.optionId)) { setTeamRegError('Pick an entry band.'); return false; }
    return true;
  };
  const buildEntryTx = (status, method) => {
    const fx = fixtures.find(f => f.id === teamReg.fixtureId);
    const bd = priceEntry(teamReg.category, teamReg.optionId);
    return {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, date: Date.now(), kind: 'entry',
      fixtureId: teamReg.fixtureId, fixtureName: fx ? fx.name : '', fixtureDate: fx ? fx.date : '',
      team: (teamReg.team || '').trim(), contact: (teamReg.contact || '').trim(), mobile: (teamReg.mobile || '').trim(),
      category: bd.category, optionId: bd.optionId, entryLabel: bd.label, total: bd.fee,
      subsidyDeductions: [], status, method: status === 'paid' ? (method || 'transfer') : '',
      note: (teamReg.note || '').trim(), paidDate: status === 'paid' ? Date.now() : null,
    };
  };
  const persistTx = async (tx) => {
    const nextTx = [tx, ...transactions];
    setTransactions(nextTx);
    try { await window.storage.set('transactions', JSON.stringify(nextTx), true); } catch (e) {}
  };
  const doEntryPaid = async () => {
    setTeamRegError('');
    if (!validateEntry()) return;
    const tx = buildEntryTx('paid', teamReg.method);
    await persistTx(tx);
    setTeamRegError(`Recorded £${fmtMoney(tx.total)} (${tx.method}) — ${tx.team} entered in ${tx.fixtureName || 'fixture'}.`);
    setTeamReg(prev => ({ ...prev, team: '', contact: '', mobile: '', note: '' }));
  };
  const doEntryDue = async () => {
    setTeamRegError('');
    if (!validateEntry()) return;
    const tx = buildEntryTx('due', '');
    await persistTx(tx);
    setTeamRegError(`Registered ${tx.team} for ${tx.fixtureName || 'fixture'} — £${fmtMoney(tx.total)} added to invoices.`);
    setTeamReg(prev => ({ ...prev, team: '', contact: '', mobile: '', note: '' }));
  };
  const doMarkPaid = async () => {
    setCoError('');
    const pl = playerDb.find(p => p.id === checkout.playerId);
    if (!pl) { setCoError('Pick a player first.'); return; }
    const dayUp = (checkout.day || 'sat').toUpperCase();
    const bd = priceBooking(pl, checkout.chukkas, checkout.ponyLevel);
    if (bd.freeToRoster) {
      const added = await addPlayerToRoster(checkout.day, pl, checkout.chukkas);
      setCoError(added ? `${pl.name} added to ${dayUp} roster — no charge.` : `${pl.name} is already on the ${dayUp} roster.`);
      return;
    }
    await recordPayment(pl, bd, { method: checkout.method, note: checkout.note, addToRoster: true, day: checkout.day });
    setCoError(`Recorded £${fmtMoney(bd.total)} (${checkout.method}) for ${pl.name} and added to ${dayUp} roster.`);
    setCheckout(prev => ({ ...prev, playerId: '', note: '' }));
  };

  // Fill the booking form from a saved member
  const fillFromMember = (m) => {
    setName(m.name);
    setMobile(m.mobile || '');
    setHandicap(m.handicap == null ? '' : String(m.handicap));
    // Availability is day-specific — it depends on that day's throw-in and
    // chukka times — so we deliberately do NOT carry it across sessions (same
    // reasoning as chukkas). Clear it; it defaults to this day's throw-in /
    // no upper cap. (Prevents e.g. a Thursday "available to 18:45" wrongly
    // resurfacing on a Saturday with a different schedule.)
    setAvailableFrom('');
    setAvailableTo('');
    // Leave chukkas blank — varies week to week
  };

  const handleAdd = () => {
    setError('');
    // Booking cutoff: 24h before that day's throw-in. Captain bypasses.
    if (!captainMode && isBookingClosed()) {
      return setError(`${bookingClosedReason()} To be added, please contact the captain at ${CONTACT_EMAIL}.`);
    }
    if (!name.trim()) return setError('Please enter a name.');
    if (handicap === '') return setError('Please select a handicap.');
    const dayCfg = DAY_CONFIG[activeDay];
    const fixedC = fixedChukkasFor();
    if (!fixedC && !chukkas) return setError('How many chukkas?');
    const h = parseInt(handicap, 10);
    // On a fixed-length session everyone plays the same number of chukkas,
    // whatever the (disabled) field says.
    const c = fixedC ? fixedC : parseInt(chukkas, 10);
    // Beginners-only days (Friday instructional). Captain can override.
    if (!captainMode) {
      const blocked = handicapBlockReason(h);
      if (blocked) return setError(blocked);
    }
    const maxC = maxChukkasFor();
    if (isNaN(c) || c < 1 || c > maxC) return setError(`Chukkas must be between 1 and ${maxC}.`);
    // Sanity check: if both bounds are set, availableTo must not be earlier than availableFrom.
    if (availableFrom && availableTo) {
      const fromMin = parseTime(availableFrom);
      const toMin = parseTime(availableTo);
      if (fromMin !== null && toMin !== null && toMin < fromMin) {
        return setError('"Available to" must be the same as or later than "Available from".');
      }
    }
    // Prevent the same person being added twice (case- and whitespace-insensitive)
    const cleanedName = name.trim().replace(/\s+/g, ' ');
    const normalized = cleanedName.toLowerCase();
    const existing = players.find(p => p.name.trim().replace(/\s+/g, ' ').toLowerCase() === normalized);
    if (existing) {
      return setError(`${existing.name} is already on the roster${captainMode ? ' — adjust their chukkas with the +/− buttons.' : ` for this ${activeDayConfig.fullLabel}.`}`);
    }
    const newPlayer = {
      id: Date.now(),
      name: cleanedName,
      mobile: mobile.trim() || undefined,
      handicap: h,
      chukkas: c,
      // Stored as HH:MM string; empty = available from the throw-in (default)
      availableFrom: availableFrom || fmtTime(throwInMin),
      // Stored as HH:MM string; empty = no upper cap (play through last chukka)
      availableTo: availableTo || '',
 
      vip: captainMode ? vip : false,
      noConsecutive: dayCfg.instructional ? false : noConsecutive,
      ponyHire: ponyHire,   };
    saveRoster([...players, newPlayer]);
    upsertMember(newPlayer);
    // Interim (pre-Stripe): quote the cost and, if anything is owed, log a 'due'
    // item the captain settles under Checkout. They go on the roster either way;
    // the captain can remove them later if unpaid.
    {
      const rec = playerDb.find(p => (p.name || '').trim().toLowerCase() === cleanedName.toLowerCase());
      const subject = rec || { membership: 'none', student: false, subsidies: [] };
      const bd = priceBooking(subject, c, ponyHire ? 'club' : 'none');
      if (bd.total > 0) {
        const dueTx = {
          id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, date: Date.now(),
          playerId: rec ? rec.id : null, playerName: cleanedName, day: activeDay,
          chukkas: c, ponyLevel: ponyHire ? 'club' : 'none',
          ponyHire: bd.ponyHire, chukkaFee: bd.chukkaFee, gross: bd.gross, studentDiscount: bd.studentDiscount,
          subsidyDeductions: [],
          total: bd.total, status: 'due', method: '', note: '',
        };
        const nextTx = [dueTx, ...transactions];
        setTransactions(nextTx);
        window.storage.set('transactions', JSON.stringify(nextTx), true).catch(() => {});
        setBookingMsg(`Added to the roster. £${fmtMoney(bd.total)} due${ponyHire ? ' (incl. pony hire)' : ''} — please settle with the Captain.`);
      } else {
        setBookingMsg('Added to the roster — no charge.');
      }
    }
    setName(''); setMobile(''); setHandicap(''); setChukkas(fixedC ? String(fixedC) : ''); setAvailableFrom(''); setAvailableTo(''); setVip(false); setNoConsecutive(false); setPonyHire(false);
    saveSchedule(null);
  };

  const removePlayer = (id) => {
    saveRoster(players.filter(p => p.id !== id));
    saveSchedule(null);
  };

  const generate = () => {
    if (players.length < 4) { setError('Need at least 4 players for a chukka.'); return; }
    setError('');
    setActivePlayer(null);
    setAddingTo(null);
    // Arena polo plays 3-a-side, so cap the arena draw at 3 v 3; grass is 4 v 4.
    const maxPerTeam = (ground || '').trim().toLowerCase() === 'arena' ? 3 : 4;
    const result = buildSchedule(players, throwInMin, maxPerTeam);
    saveSchedule(result);
    setTimeout(() => scheduleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  const clearAll = () => {
    setConfirmModal({
      title: 'Clear the roster?',
      message: 'This removes all players and discards the current schedule. The members directory, fixtures, and WhatsApp link are kept.',
      confirmLabel: 'Clear roster',
      onConfirm: () => {
        saveRoster([]);
        saveSchedule(null);
      },
    });
  };

  // Clear just the generated draw for the active day, keeping everyone on the roster.
  const clearDraw = () => {
    setConfirmModal({
      title: 'Clear the draw?',
      message: `This removes the generated ${activeDayConfig.fullLabel} draw but keeps everyone signed up, so you can redraw. This can't be undone.`,
      confirmLabel: 'Clear draw',
      onConfirm: () => saveSchedule(null),
    });
  };

  // Adjust a player's chukka count in the roster
  // Toggle VIP flag for a player (captain only)
  const toggleVip = (id) => {
    const updated = players.map(p => p.id === id ? { ...p, vip: !p.vip } : p);
    saveRoster(updated);
    saveSchedule(null);
  };

  // Toggle noConsecutive flag for a player (captain only)
  const toggleNoConsecutive = (id) => {
    const updated = players.map(p => p.id === id ? { ...p, noConsecutive: !p.noConsecutive } : p);
    saveRoster(updated);
    saveSchedule(null);
  };

  // Toggle pony hire for a player (captain only). Unlike VIP/no-consecutive this
  // doesn't affect the draw — only what they're charged — so the schedule stands.
  const togglePonyHire = (id) => {
    const updated = players.map(p => p.id === id ? { ...p, ponyHire: !p.ponyHire } : p);
    saveRoster(updated);
  };

    const adjustChukkas = (id, delta) => {
    const updated = players.map(p =>
      p.id === id
        ? { ...p, chukkas: Math.max(1, Math.min(8, p.chukkas + delta)) }
        : p
    );
    saveRoster(updated);
    saveSchedule(null); // Roster changed — invalidate the schedule
  };

  // Move a player up (-1) or down (+1) in the roster array.
  // Roster order controls scheduling priority: earlier = first pick of chukkas.
  const movePlayer = (id, dir) => {
    const idx = players.findIndex(p => p.id === id);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= players.length) return;
    const updated = [...players];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    saveRoster(updated);
    saveSchedule(null);
  };

  // Sort the roster so players wanting the most chukkas appear first.
  // Ties are broken by current roster position (stable sort).
  const sortByChukkas = () => {
    const updated = [...players].sort((a, b) => b.chukkas - a.chukkas);
    saveRoster(updated);
    saveSchedule(null);
  };

  // Update a single availability field (availableFrom or availableTo) for a player.
  const updateAvail = (id, field, value) => {
    const updated = players.map(p => p.id === id ? { ...p, [field]: value } : p);
    saveRoster(updated);
    saveSchedule(null);
  };

  // Recompute sums and counts after a schedule mutation
  const refreshChukka = (ck) => ({
    ...ck,
    sumA: ck.teamA.reduce((s, p) => s + p.handicap, 0),
    sumB: ck.teamB.reduce((s, p) => s + p.handicap, 0),
    playerCount: ck.teamA.length + ck.teamB.length,
  });

  const updateSchedule = (mapper) => {
    if (!schedule) return;
    const next = schedule.chukkas.map((ck, idx) => refreshChukka(mapper(ck, idx)));
    saveSchedule({ ...schedule, chukkas: next });
  };

  const swapPlayerTeam = (chukkaIdx, playerId) => {
    if (!schedule) return;
    const ck = schedule.chukkas[chukkaIdx];
    const inA = ck.teamA.find(p => p.id === playerId);
    const inB = ck.teamB.find(p => p.id === playerId);
    // No strict per-team cap — uneven teams are acceptable
    updateSchedule((ck, idx) => {
      if (idx !== chukkaIdx) return ck;
      if (inA) {
        return {
          ...ck,
          teamA: ck.teamA.filter(p => p.id !== playerId),
          teamB: [...ck.teamB, inA],
        };
      }
      if (inB) {
        return {
          ...ck,
          teamB: ck.teamB.filter(p => p.id !== playerId),
          teamA: [...ck.teamA, inB],
        };
      }
      return ck;
    });
    setActivePlayer(null);
  };

  const removeFromChukka = (chukkaIdx, playerId) => {
    updateSchedule((ck, idx) =>
      idx === chukkaIdx
        ? {
            ...ck,
            teamA: ck.teamA.filter(p => p.id !== playerId),
            teamB: ck.teamB.filter(p => p.id !== playerId),
          }
        : ck
    );
    setActivePlayer(null);
  };

  const movePlayerToChukka = (fromIdx, playerId, toIdx) => {
    if (!schedule || fromIdx === toIdx) return;
    const target = schedule.chukkas[toIdx];
    // No strict per-chukka cap — uneven teams are acceptable
    const fromChukka = schedule.chukkas[fromIdx];
    const player =
      fromChukka.teamA.find(p => p.id === playerId) ||
      fromChukka.teamB.find(p => p.id === playerId);
    if (!player) return;

    updateSchedule((ck, idx) => {
      if (idx === fromIdx) {
        return {
          ...ck,
          teamA: ck.teamA.filter(p => p.id !== playerId),
          teamB: ck.teamB.filter(p => p.id !== playerId),
        };
      }
      if (idx === toIdx) {
        const already = ck.teamA.find(p => p.id === playerId) || ck.teamB.find(p => p.id === playerId);
        if (already) return ck;
        // Drop into the smaller team (uneven teams are acceptable)
        if (ck.teamA.length <= ck.teamB.length) {
          return { ...ck, teamA: [...ck.teamA, player] };
        }
        return { ...ck, teamB: [...ck.teamB, player] };
      }
      return ck;
    });
    setActivePlayer(null);
  };

  // Put a rider on a given side of a given chukka, or take them out (side =
  // null). One primitive covering every cell of the desktop player grid, where
  // a click cycles Blue → White → out; the phone's swap/remove/add buttons stay
  // as they are. Like every other draw edit it routes through updateSchedule,
  // so sums refresh and a published draw un-publishes.
  const setChukkaCell = (chukkaIdx, playerId, side) => {
    if (!schedule) return;
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    updateSchedule((ck, idx) => {
      if (idx !== chukkaIdx) return ck;
      const teamA = ck.teamA.filter(p => p.id !== playerId);
      const teamB = ck.teamB.filter(p => p.id !== playerId);
      if (side === 'A') return { ...ck, teamA: [...teamA, player], teamB };
      if (side === 'B') return { ...ck, teamA, teamB: [...teamB, player] };
      return { ...ck, teamA, teamB };
    });
    setActivePlayer(null);
  };

  const addToChukka = (chukkaIdx, playerId) => {
    const player = players.find(p => p.id === playerId);
    if (!player || !schedule) return;
    const ck = schedule.chukkas[chukkaIdx];
    // No strict per-chukka cap — uneven teams are acceptable
    updateSchedule((ck, idx) => {
      if (idx !== chukkaIdx) return ck;
      const already = ck.teamA.find(p => p.id === playerId) || ck.teamB.find(p => p.id === playerId);
      if (already) return ck;
      if (ck.teamA.length <= ck.teamB.length) {
        return { ...ck, teamA: [...ck.teamA, player] };
      }
      return { ...ck, teamB: [...ck.teamB, player] };
    });
    setAddingTo(null);
  };

  // ── WhatsApp integration ─────────────────────────────
  const saveWaLink = async (link) => {
    const cleaned = link.trim();
    setWaLink(cleaned);
    try { await window.storage.set('wa-link', cleaned, true); } catch (e) {}
    setWaEditing(false);
  };

  // Tournament committee names printed on the programme rules page.
  // Blank clears the override and falls back to the built-in list.
  const saveCommittee = async (value) => {
    const cleaned = (value || '').trim();
    setCommittee(cleaned);
    try {
      if (cleaned) await window.storage.set('committee', cleaned, true);
      else await window.storage.delete('committee', true);
    } catch (e) {}
  };

  const generateTeamSheet = () => {
    if (!schedule) return '';
    const dateStr = getDateStr();

    let text = `*Druids Lodge Polo Club*\n`;
    text += `_${activeDayConfig.fullLabel} Chukkas — ${dateStr}_\n`;
    text += `🐎 ${schedule.numChukkas} chukkas, ${chukkaTime(0, throwInMin)} throw-in\n`;
    if (ground) text += `📍 ${ground}\n`;
    text += `\n`;

    schedule.chukkas.forEach(ck => {
      const diff = Math.abs(ck.sumA - ck.sumB);
      text += `*Chukka ${ck.number} · ${ck.time}*  (${ck.teamA.length}v${ck.teamB.length}`;
      if (ck.playerCount > 0) text += ` · Δ${diff}`;
      text += `)\n`;
      if (ck.teamA.length > 0) {
        text += `🔵 ${ck.teamA.map(p => `${p.name} (${fmtH(p.handicap)})`).join(', ')}\n`;
      }
      if (ck.teamB.length > 0) {
        text += `⚪ ${ck.teamB.map(p => `${p.name} (${fmtH(p.handicap)})`).join(', ')}\n`;
      }
      if (ck.playerCount === 0) text += `_no players_\n`;
      text += '\n';
    });

    if (schedule.reduced && schedule.reduced.length > 0) {
      text += `_Reduced for fairness: ${schedule.reduced.map(r => `${r.player.name} (${r.given} of ${r.requested})`).join(', ')}_\n\n`;
    }

    text += `🏇 See you on the field!`;
    return text;
  };

  // Captain-style monospace table for WhatsApp / email
  const generateTableText = () => {
    if (!schedule) return '';
    const dateStr = getDateStr();

    // Sort players by handicap descending (captain's convention)
    const sorted = [...players].sort((a, b) => b.handicap - a.handicap);
    const nameWidth = Math.max(...sorted.map(p => p.name.length), 4);

    // Helper to compute what cell to show for a player in a chukka
    const cellFor = (p, ck) => {
      if (ck.teamA.find(x => x.id === p.id)) return 'B';
      if (ck.teamB.find(x => x.id === p.id)) return 'W';
      return ' ';
    };

    // Header lines
    let header = 'Name'.padEnd(nameWidth) + ' HCP  C ';
    schedule.chukkas.forEach((_, i) => { header += ' ' + (i + 1); });

    const rows = sorted.map(p => {
      let row = p.name.padEnd(nameWidth);
      row += ' ' + fmtH(p.handicap).padStart(3);
      row += '  ' + String(p.chukkas);
      row += ' ';
      schedule.chukkas.forEach(ck => { row += ' ' + cellFor(p, ck); });
      return row.trimEnd();
    });

    const times = schedule.chukkas.map(c => c.time).join(' · ');

    let text = `*Druids Lodge Polo Club*\n`;
    text += `_${activeDayConfig.fullLabel} Chukkas — ${dateStr}_\n`;
    if (ground) text += `📍 ${ground}\n`;
    text += `🐎 Chukkas: ${times}\n\n`;
    text += '```\n';
    text += header + '\n';
    text += rows.join('\n') + '\n';
    text += '```';

    if (schedule.reduced && schedule.reduced.length > 0) {
      text += `\n\n_Reduced: ${schedule.reduced.map(r => `${r.player.name} (${r.given}/${r.requested})`).join(', ')}_`;
    }

    return text;
  };

  const publishToWhatsApp = async () => {
    const blob = await generatePNGBlob();
    if (!blob) return;

    const filename = `DLPC-chukkas-${getDateSlug()}.png`;
    const file = new File([blob], filename, { type: 'image/png' });

    // Try Web Share API with files (mobile-first: lets user pick WhatsApp from
    // the system share sheet and the image is attached to the message).
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `${activeDayConfig.fullLabel} Chukkas`,
        });
        return;
      } catch (err) {
        // User cancelled — that's fine, don't fall back to download
        if (err && err.name === 'AbortError') return;
      }
    }

    // Fallback: download the PNG so the user can share it manually
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
    window.alert('Team sheet saved as PNG. Open WhatsApp and send the image to the club group.');
  };

  const copyTeamSheet = async () => {
    const text = scheduleView === 'table' ? generateTableText() : generateTeamSheet();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      window.alert('Team sheet copied to clipboard.');
    } catch (e) {
      window.alert('Could not copy automatically — long-press to copy from the preview.');
    }
  };

  // Compute the date of the next occurrence of a given day-of-week from today
  // (or today if today IS that day). Returns local-midnight on the target day.
  const nextDayOfWeek = (targetDow) => {
    const d = new Date();
    const dow = d.getDay();
    const daysUntil = (targetDow - dow + 7) % 7;
    const target = new Date(d);
    target.setHours(0, 0, 0, 0);
    target.setDate(d.getDate() + daysUntil);
    return target;
  };
  const nextChukkaDate = (dayKey = activeDay) => nextDayOfWeek(DAY_CONFIG[dayKey].dow);

  // Local-time ISO date string (YYYY-MM-DD) — avoids UTC drift in BST/GMT.
  // Used to stamp the roster's day so the app can auto-clear last week's data.
  const localISO = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const currentDayISO = (dayKey = activeDay) => localISO(nextChukkaDate(dayKey));

  // Build a filename-safe date slug (YYYY-MM-DD) and human date string for the
  // active day's next occurrence (used in exports, share text, etc.)
  const getDateSlug = (dayKey = activeDay) => localISO(nextChukkaDate(dayKey));
  const getDateStr = (dayKey = activeDay) =>
    nextChukkaDate(dayKey).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  // ── Export as Excel (.xlsx) ─────────────────────────
  // ── Export as Excel (.xls) styled to match the in-app table view ─────
  // Uses HTML format with Office Excel namespaces — Excel/Numbers/Sheets
  // open it as a styled spreadsheet (the same trick used for years).
  const exportXLSX = () => {
    if (!schedule) return;
    const sortedPlayers = [...players].sort((a, b) => b.handicap - a.handicap);
    const dateStr = getDateStr();

    const headerDate = `style="background-color:#231F20; color:#FAF9F7; font-family:Georgia,serif; font-style:italic; font-weight:500; text-align:center; padding:10px; border:1px solid #DEDAD3; font-size:13px;"`;
    const headerTime = `style="background-color:#EFEDE8; color:#231F20; font-weight:600; text-align:center; padding:8px; border:1px solid #DEDAD3; font-size:12px; mso-number-format:'\\@';"`;
    const headerCol = `style="background-color:#231F20; color:#FAF9F7; font-weight:500; text-align:center; padding:8px; border:1px solid #DEDAD3; font-size:11px;"`;
    const headerChukka = `style="background-color:#EFEDE8; color:#231F20; font-weight:500; text-align:center; padding:8px; border:1px solid #DEDAD3; font-size:11px;"`;
    const cellB = `style="background-color:#231F20; color:#FFFFFF; font-weight:700; text-align:center; padding:8px; font-family:Georgia,serif; border:1px solid #DEDAD3; font-size:14px;"`;
    const cellW = `style="background-color:#FFFFFF; color:#231F20; font-weight:700; text-align:center; padding:8px; font-family:Georgia,serif; border:1px solid #DEDAD3; font-size:14px;"`;
    const cellEmpty = `style="background-color:#ffffff; padding:8px; border:1px solid #DEDAD3;"`;

    let html = '';
    html += `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
    html += `<head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8">`;
    html += `<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>`;
    html += `<x:Name>Chukkas</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>`;
    html += `</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->`;
    html += `<style>td { mso-number-format:'\\@'; }</style></head><body>`;
    html += `<table border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse; font-family:Arial,sans-serif;">`;

    // Row 1: Date (merged cols 0–2) + time headers
    html += `<tr>`;
    html += `<td colspan="3" ${headerDate}>${dateStr}${ground ? ' · ' + ground : ''}</td>`;
    schedule.chukkas.forEach(ck => {
      html += `<td ${headerTime}>${ck.time}</td>`;
    });
    html += `</tr>`;

    // Row 2: column headers
    html += `<tr>`;
    html += `<td ${headerCol}>Name</td>`;
    html += `<td ${headerCol}>Handicap</td>`;
    html += `<td ${headerCol}>Chukkas</td>`;
    schedule.chukkas.forEach((_, i) => {
      html += `<td ${headerChukka}>Chukka ${i + 1}</td>`;
    });
    html += `</tr>`;

    // Player rows
    sortedPlayers.forEach((p, idx) => {
      const altBg = idx % 2 === 1 ? '#FFFFFF' : '#ffffff';
      html += `<tr>`;
      html += `<td style="background-color:${altBg}; padding:8px 12px; font-weight:500; color:#231F20; border:1px solid #DEDAD3; font-size:12px;">${p.name}</td>`;
      html += `<td style="background-color:#ffffff; text-align:center; padding:8px; color:#231F20; border:1px solid #DEDAD3; font-size:12px;">${fmtH(p.handicap)}</td>`;
      html += `<td style="background-color:#ffffff; text-align:center; padding:8px; color:#231F20; border:1px solid #DEDAD3; font-size:12px;">${p.chukkas}</td>`;
      schedule.chukkas.forEach(ck => {
        const inA = ck.teamA.find(x => x.id === p.id);
        const inB = ck.teamB.find(x => x.id === p.id);
        if (inA) html += `<td ${cellB}>B</td>`;
        else if (inB) html += `<td ${cellW}>W</td>`;
        else html += `<td ${cellEmpty}></td>`;
      });
      html += `</tr>`;
    });

    html += `</table></body></html>`;

    // BOM helps Excel detect UTF-8 properly
    const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DLPC-chukkas-${getDateSlug()}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  // ── Render the team-sheet to a Canvas (reusable for PNG export + WhatsApp share) ──
  const renderScheduleCanvas = () => {
    if (!schedule) return null;
    const sortedPlayers = [...players].sort((a, b) => b.handicap - a.handicap);
    const dateStr = getDateStr();
    const N = schedule.numChukkas;

    // Layout constants (logical pixels — canvas is 2× for retina)
    const padding = 24;
    const titleH = 60;
    const headerRowH = 38;
    const rowH = 34;
    const nameW = 160;
    const hcpW = 60;
    const chukkasW = 60;
    const chukkaW = 90;

    const tableW = nameW + hcpW + chukkasW + chukkaW * N;
    const tableH = headerRowH * 2 + rowH * sortedPlayers.length;
    const W = padding * 2 + tableW;
    const H = padding * 2 + titleH + tableH;

    // High-DPI canvas
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = W * scale;
    canvas.height = H * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    // Background
    ctx.fillStyle = '#FAF9F7';
    ctx.fillRect(0, 0, W, H);

    // Title block
    ctx.fillStyle = '#231F20';
    ctx.font = '500 22px Georgia, "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Druids Lodge Polo Club', W / 2, padding + 16);
    ctx.fillStyle = '#6B6663';
    ctx.font = 'italic 13px Georgia, "Times New Roman", serif';
    ctx.fillText(`${activeDayConfig.fullLabel} Chukkas · ${dateStr}${ground ? ' · ' + ground : ''}`, W / 2, padding + 40);

    // Table position
    const tx = (W - tableW) / 2;
    let y = padding + titleH;

    // Row 1: date (merged across cols 0–2) + time headers
    ctx.fillStyle = '#231F20';
    ctx.fillRect(tx, y, nameW + hcpW + chukkasW, headerRowH);
    ctx.fillStyle = '#FAF9F7';
    ctx.font = 'italic 500 13px Georgia, serif';
    ctx.fillText(dateStr, tx + (nameW + hcpW + chukkasW) / 2, y + headerRowH / 2);

    schedule.chukkas.forEach((ck, i) => {
      const cx = tx + nameW + hcpW + chukkasW + i * chukkaW;
      ctx.fillStyle = '#EFEDE8';
      ctx.fillRect(cx, y, chukkaW, headerRowH);
      ctx.fillStyle = '#231F20';
      ctx.font = '600 12px -apple-system, "Helvetica Neue", Arial, sans-serif';
      ctx.fillText(ck.time, cx + chukkaW / 2, y + headerRowH / 2);
    });
    y += headerRowH;

    // Row 2: column labels
    ctx.fillStyle = '#231F20';
    ctx.fillRect(tx, y, nameW + hcpW + chukkasW, headerRowH);
    ctx.fillStyle = '#FAF9F7';
    ctx.font = '500 11px -apple-system, "Helvetica Neue", Arial, sans-serif';
    ctx.fillText('NAME', tx + nameW / 2, y + headerRowH / 2);
    ctx.fillText('HCP', tx + nameW + hcpW / 2, y + headerRowH / 2);
    ctx.fillText('C', tx + nameW + hcpW + chukkasW / 2, y + headerRowH / 2);
    schedule.chukkas.forEach((_, i) => {
      const cx = tx + nameW + hcpW + chukkasW + i * chukkaW;
      ctx.fillStyle = '#EFEDE8';
      ctx.fillRect(cx, y, chukkaW, headerRowH);
      ctx.fillStyle = '#231F20';
      ctx.fillText(`CHUKKA ${i + 1}`, cx + chukkaW / 2, y + headerRowH / 2);
    });
    y += headerRowH;

    // Player rows
    sortedPlayers.forEach((p, idx) => {
      const isAlt = idx % 2 === 1;

      // Name column (alt row shade)
      ctx.fillStyle = isAlt ? '#FFFFFF' : '#ffffff';
      ctx.fillRect(tx, y, nameW, rowH);
      ctx.fillStyle = '#231F20';
      ctx.font = '500 13px -apple-system, "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(p.name, tx + 12, y + rowH / 2);

      // HCP + Chukkas columns
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(tx + nameW, y, hcpW + chukkasW, rowH);
      ctx.fillStyle = '#231F20';
      ctx.font = '500 13px -apple-system, "Helvetica Neue", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(fmtH(p.handicap), tx + nameW + hcpW / 2, y + rowH / 2);
      ctx.fillText(String(p.chukkas), tx + nameW + hcpW + chukkasW / 2, y + rowH / 2);

      // Chukka cells
      schedule.chukkas.forEach((ck, ci) => {
        const inA = ck.teamA.find(x => x.id === p.id);
        const inB = ck.teamB.find(x => x.id === p.id);
        const cx = tx + nameW + hcpW + chukkasW + ci * chukkaW;
        if (inA) {
          ctx.fillStyle = 'rgba(42, 74, 110, 0.15)';
          ctx.fillRect(cx, y, chukkaW, rowH);
          ctx.fillStyle = '#000000';
          ctx.font = '700 15px Georgia, serif';
          ctx.fillText('B', cx + chukkaW / 2, y + rowH / 2);
        } else if (inB) {
          ctx.fillStyle = 'rgba(251, 180, 21, 0.14)';
          ctx.fillRect(cx, y, chukkaW, rowH);
          ctx.fillStyle = '#231F20';
          ctx.font = '700 15px Georgia, serif';
          ctx.fillText('W', cx + chukkaW / 2, y + rowH / 2);
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(cx, y, chukkaW, rowH);
        }
      });

      y += rowH;
    });

    // Grid lines
    ctx.strokeStyle = '#DEDAD3';
    ctx.lineWidth = 1;
    const colWidths = [nameW, hcpW, chukkasW, ...Array(N).fill(chukkaW)];
    let lineX = tx;
    for (let i = 0; i <= colWidths.length; i++) {
      // Row 1 (the date) is a single merged cell across the first three columns,
      // so don't run the internal NAME|HCP and HCP|C separators through it.
      const insideDateMerge = (i === 1 || i === 2);
      const top = padding + titleH + (insideDateMerge ? headerRowH : 0);
      ctx.beginPath();
      ctx.moveTo(Math.round(lineX) + 0.5, top);
      ctx.lineTo(Math.round(lineX) + 0.5, padding + titleH + tableH);
      ctx.stroke();
      if (i < colWidths.length) lineX += colWidths[i];
    }
    const rowHeights = [headerRowH, headerRowH, ...Array(sortedPlayers.length).fill(rowH)];
    let lineY = padding + titleH;
    for (let i = 0; i <= rowHeights.length; i++) {
      ctx.beginPath();
      ctx.moveTo(tx, Math.round(lineY) + 0.5);
      ctx.lineTo(tx + tableW, Math.round(lineY) + 0.5);
      ctx.stroke();
      if (i < rowHeights.length) lineY += rowHeights[i];
    }

    return canvas;
  };

  // Async helper: render and resolve a PNG Blob
  const generatePNGBlob = () => new Promise(resolve => {
    const canvas = renderScheduleCanvas();
    if (!canvas) return resolve(null);
    canvas.toBlob(blob => resolve(blob), 'image/png');
  });

  // ── Export as PNG (download) ─────────────────────────
  const exportPNG = async () => {
    const blob = await generatePNGBlob();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DLPC-chukkas-${getDateSlug()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  // ── Fixtures interest ─────────────────────────────────
  const saveInterest = async (next) => {
    setInterest(next);
    try { await window.storage.set('fixture-interest', JSON.stringify(next), true); }
    catch (e) { setFError('Saved locally only — check your connection.'); }
  };

  const saveTeamsDb = async (next) => {
    setTeamsDb(next);
    try { await window.storage.set('teams-db', JSON.stringify(next), true); } catch (e) {}
  };

  // Write one team into the club's teams directory. Pass `oldName` when the team
  // has been renamed — the directory is keyed by lower-cased name, so a rename is
  // a new key plus a removal of the old one, not an edit in place.
  const saveTeamEntry = async (team, oldName) => {
    const name = (team.name || '').trim().replace(/\s+/g, ' ');
    if (!name) return;
    const next = { ...teamsDb };
    if (oldName) {
      const from = oldName.trim().toLowerCase();
      if (from && from !== name.toLowerCase()) delete next[from];
    }
    next[name.toLowerCase()] = {
      ...(teamsDb[name.toLowerCase()] || {}),
      ...team,
      name,
      handicap: team.handicap ?? null,
      // Trailing blanks only — a gap mid-squad has to survive, or clearing one
      // name mid-edit would shift every shirt number below it up by one.
      players: trimSquad(team.players),
    };
    await saveTeamsDb(next);
  };

  const deleteTeamEntry = (name) => {
    const key = (name || '').trim().toLowerCase();
    if (!key || !teamsDb[key]) return;
    setConfirmModal({
      title: `Delete ${teamsDb[key].name}?`,
      message: 'This removes the team from the club directory. Fixtures it already plays in keep their squads — only the saved team is removed.',
      confirmLabel: 'Delete team',
      onConfirm: () => {
        const next = { ...teamsDb };
        delete next[key];
        saveTeamsDb(next);
      },
    });
  };

  // Shirt colour belongs to the team, not to one match. Captains set it once on
  // the live scoreboard and every later match involving that squad inherits it.
  // Set (or clear, with a null key) the shirt colour a squad plays in. The
  // captain can pick it on the team board before a ball is thrown in; the live
  // scoreboard writes the same field when a colour is chosen there.
  const setTeamColour = (teamName, colourKey) => {
    const key = (teamName || '').trim().toLowerCase();
    if (!key) return;
    const prev = teamsDb[key] || { name: teamName.trim(), handicap: null, players: [] };
    if ((prev.colour || null) === (colourKey || null)) return;
    const entry = { ...prev };
    if (colourKey) entry.colour = colourKey; else delete entry.colour;
    saveTeamsDb({ ...teamsDb, [key]: entry });
  };
  // Live scoring only ever assigns a colour, never clears one, so a blank key
  // there means "nothing was chosen" rather than "unset it".
  const rememberTeamColour = (teamName, colourKey) => {
    if (!colourKey) return;
    setTeamColour(teamName, colourKey);
  };
  // The colour a squad last wore, if any.
  const teamColourKey = (teamName) => {
    const key = (teamName || '').trim().toLowerCase();
    return (teamsDb[key] || {}).colour || null;
  };

  // Extract teams from fixture details and persist them to the teams-db for future autofill
  const persistTeamsFromDetails = async (details) => {
    const next = { ...teamsDb };
    Object.values(details).forEach(det => {
      (det?.days || []).forEach(day => {
        (day?.matches || []).forEach(m => {
          ['teamA', 'teamB'].forEach(tk => {
            const t = m[tk];
            if (t?.name?.trim()) {
              const key = t.name.trim().toLowerCase();
              next[key] = { name: t.name.trim(), handicap: t.handicap ?? null, players: cleanSquad(t.players) };
            }
          });
        });
      });
    });
    await saveTeamsDb(next);
  };

  const saveFixtureDetails = async (next) => {
    setFixtureDetails(next);
    try { await window.storage.set('fixture-details', JSON.stringify(next), true); }
    catch (e) { setFError('Saved locally only — check your connection.'); }
    scheduleBackup(next);
  };

  // Captain: bulk-import match details from pasted JSON. Fixtures are matched by
  // name (an ad hoc fixture is created if none exists); days are merged by
  // dateLabel so existing days for a fixture are preserved. Saves via the normal
  // path (which snapshots a backup first), so an import is undoable.
  const importMatchDetails = async () => {
    setImportMsg('');
    const MTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
    const dayOrder = (d) => {
      const lbl = (d.dateLabel || '').toLowerCase();
      const dayNum = parseInt((lbl.match(/\d+/) || ['99'])[0], 10);
      const mi = MTHS.findIndex(m => lbl.includes(m));
      return (mi < 0 ? 99 : mi) * 100 + (isNaN(dayNum) ? 99 : dayNum);
    };
    let payload;
    try { payload = JSON.parse(importText); }
    catch (e) { setImportMsg('That is not valid JSON — check you pasted the whole block.'); return; }
    const entries = Array.isArray(payload) ? payload
      : (Array.isArray(payload?.matches) ? payload.matches : null);
    if (!entries || !entries.length) { setImportMsg('Expected a "matches" array in the JSON.'); return; }
    const nextFixtures = fixtures.slice();
    const nextDetails = { ...fixtureDetails };
    let created = 0, updated = 0;
    for (const entry of entries) {
      const fxName = (entry.fixture || '').trim();
      if (!fxName || !Array.isArray(entry.days)) continue;
      let fx = nextFixtures.find(f => f.name.trim().toLowerCase() === fxName.toLowerCase());
      if (!fx) {
        const slug = fxName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'fixture';
        let id = 'adhoc-' + slug;
        const ids = new Set(nextFixtures.map(f => f.id));
        while (ids.has(id)) id = 'adhoc-' + slug + '-' + Math.random().toString(36).slice(2, 5);
        fx = { id, month: entry.month || MONTHS_ORDER[0], date: entry.date || '', name: fxName, level: entry.level || '', adhoc: true };
        nextFixtures.push(fx);
        created++;
      }
      const existing = nextDetails[fx.id] || { days: [] };
      const byLabel = new Map((existing.days || []).map(d => [d.dateLabel, d]));
      entry.days.forEach(d => byLabel.set(d.dateLabel, d));
      const merged = Array.from(byLabel.values()).sort((a, b) => dayOrder(a) - dayOrder(b));
      nextDetails[fx.id] = { ...existing, days: merged };
      updated++;
    }
    if (!updated) { setImportMsg('Nothing to import — each entry needs a "fixture" name and a "days" array.'); return; }
    if (created > 0) await saveFixtures(nextFixtures);
    await saveFixtureDetails(nextDetails);
    setImportMsg(`Imported ${updated} fixture${updated === 1 ? '' : 's'}${created ? ` (${created} newly created)` : ''}. Open the fixture to check.`);
    setImportText('');
  };

  // ── Automatic backups of match details / scores ─────────────────────────
  // Every change is snapshotted so an accidental delete can be undone, even
  // without Point-in-Time Recovery. Snapshots live in a single shared Firestore
  // record ('fixture-details-backups'). The list is gzip-compressed before
  // storing (the snapshots are highly repetitive, so this shrinks ~10–80x),
  // which lets us keep many of them inside Firestore's 1MB-per-document limit.
  const MAX_BACKUPS = 100;

  // gzip helpers — compress the backup list with the platform CompressionStream
  // (supported on modern iOS/Safari/Chrome). Stored value is base64 with a 'gz:'
  // marker; when unsupported we fall back to plain JSON. Both forms read back, so
  // existing uncompressed backups still load.
  const gzSupported = typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
  const bytesToB64 = (bytes) => { let bin = ''; const ch = 0x8000; for (let i = 0; i < bytes.length; i += ch) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + ch)); return btoa(bin); };
  const b64ToBytes = (b64) => { const bin = atob(b64); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a; };
  const gzipToB64 = async (str) => { const cs = new CompressionStream('gzip'); const buf = await new Response(new Blob([str]).stream().pipeThrough(cs)).arrayBuffer(); return bytesToB64(new Uint8Array(buf)); };
  const gunzipFromB64 = async (b64) => { const ds = new DecompressionStream('gzip'); const buf = await new Response(new Blob([b64ToBytes(b64)]).stream().pipeThrough(ds)).arrayBuffer(); return new TextDecoder().decode(buf); };
  const packBackups = async (list) => { const json = JSON.stringify(list); if (!gzSupported) return json; try { return 'gz:' + await gzipToB64(json); } catch (e) { return json; } };
  const unpackBackups = async (value) => { if (!value) return []; if (typeof value === 'string' && value.startsWith('gz:')) return JSON.parse(await gunzipFromB64(value.slice(3))); return JSON.parse(value); };

  // ── Roster snapshots ──────────────────────────────────────────────────
  // Keeps up to 50 gzip-compressed snapshots of the chukka rosters (all days)
  // in a single Firestore record ('roster-backups'), so a mistaken clear or a
  // lost sign-up can always be restored. Mirrors the fixture-details backups.
  const MAX_ROSTER_BACKUPS = 50;
  const writeRosterBackup = async (rostersData, reason = '') => {
    if (!rostersData) return;
    const total = Object.values(rostersData).reduce((n, arr) => n + (Array.isArray(arr) ? arr.length : 0), 0);
    if (total === 0) return; // never snapshot an all-empty state
    try {
      const existing = await window.storage.get('roster-backups', true);
      let list = existing?.value ? await unpackBackups(existing.value) : [];
      if (!Array.isArray(list)) list = [];
      // Skip if identical to the most recent snapshot (avoids churn).
      if (list.length && JSON.stringify(list[list.length - 1].rosters) === JSON.stringify(rostersData)) return;
      list.push({ ts: Date.now(), reason, rosters: rostersData });
      while (list.length > MAX_ROSTER_BACKUPS) list.shift();
      let packed = await packBackups(list);
      while (list.length > 1 && packed.length > 950000) { list.shift(); packed = await packBackups(list); }
      await window.storage.set('roster-backups', packed, true);
    } catch (e) {}
  };
  const scheduleRosterBackup = (rostersData) => {
    if (rosterBackupTimerRef.current) clearTimeout(rosterBackupTimerRef.current);
    rosterBackupTimerRef.current = setTimeout(() => writeRosterBackup(rostersData), 8000);
  };
  const loadRosterBackups = async () => {
    try {
      const b = await window.storage.get('roster-backups', true);
      const list = b?.value ? await unpackBackups(b.value) : [];
      setRosterBackups(Array.isArray(list) ? list.slice().reverse() : []); // newest first
    } catch (e) { setRosterBackups([]); }
  };
  const restoreRosterBackup = async (snap) => {
    if (!snap || !snap.rosters) return;
    if (!window.confirm('Restore the rosters from this snapshot? The current rosters are backed up first, so this is reversible.')) return;
    await writeRosterBackup(rosters, 'before restore'); // snapshot current first
    const data = snap.rosters;
    setRosters(prev => ({ ...prev, ...data }));
    for (const dk of DAY_KEYS) {
      const arr = data[dk];
      if (!Array.isArray(arr)) continue;
      try {
        if (arr.length) {
          await window.storage.set(storageKey('roster', dk), JSON.stringify(arr), true);
          await window.storage.set(storageKey('roster-week', dk), currentDayISO(dk), true);
        }
      } catch (e) {}
    }
    setShowRosterBackups(false);
  };

  const writeBackup = async (data) => {
    try {
      const dataStr = JSON.stringify(data || {});
      // Skip empty or unchanged snapshots
      if (dataStr === '{}') return;
      const existing = await window.storage.get('fixture-details-backups', true);
      let list = existing?.value ? await unpackBackups(existing.value) : [];
      if (list.length && JSON.stringify(list[list.length - 1].data) === dataStr) return;
      list.push({ ts: Date.now(), data });
      while (list.length > MAX_BACKUPS) list.shift();
      // Stay under Firestore's 1MB document limit — measured on the *stored*
      // (compressed) size, dropping the oldest until it fits.
      let packed = await packBackups(list);
      while (list.length > 1 && packed.length > 950000) { list.shift(); packed = await packBackups(list); }
      await window.storage.set('fixture-details-backups', packed, true);
    } catch (e) { /* never let a backup failure break a save */ }
  };

  // Trailing debounce: during a flurry of edits (e.g. live scoring +/- taps)
  // this resets, so we snapshot the final state ~8s after activity stops —
  // one backup per editing session rather than one per tap.
  const scheduleBackup = (data) => {
    if (backupTimerRef.current) clearTimeout(backupTimerRef.current);
    backupTimerRef.current = setTimeout(() => writeBackup(data), 8000);
  };

  const loadBackups = async () => {
    try {
      const b = await window.storage.get('fixture-details-backups', true);
      const list = b?.value ? await unpackBackups(b.value) : [];
      setBackups([...list].reverse()); // newest first
    } catch (e) { setBackups([]); }
  };

  const backupSummary = (data) => {
    const ids = Object.keys(data || {});
    let matches = 0, scored = 0;
    ids.forEach(id => (data[id]?.days || []).forEach(d => (d.matches || []).forEach(m => { matches++; if (m && (m.scoreA != null || m.scoreB != null)) scored++; })));
    return `${ids.length} fixture${ids.length === 1 ? '' : 's'}, ${matches} match${matches === 1 ? '' : 'es'}${scored ? `, ${scored} scored` : ''}`;
  };

  const restoreBackup = async (snap) => {
    if (!snap) return;
    if (!window.confirm('Restore this backup? It replaces all current match details with this saved version. (Your current version is backed up first, so you can undo.)')) return;
    await writeBackup(fixtureDetails); // snapshot current state first, so restore is itself reversible
    await saveFixtureDetails(snap.data);
    setShowBackups(false);
    window.alert('Match details restored.');
  };

  // Surgical recovery: pull just the SCORES out of the backup history and drop them
  // back into the matching current matches. Matches are paired by date + time + the
  // two team names (ignoring which fixture they sit in), so scores come back even if
  // they were entered under a now-removed/renamed fixture. Only fills matches that
  // currently have no score — nothing already entered is overwritten, and the rest of
  // the fixture (teams, days, structure) is left exactly as it is.
  const recoverScoresFromBackups = async () => {
    try {
      const raw = await window.storage.get('fixture-details-backups', true);
      const list = raw?.value ? await unpackBackups(raw.value) : [];
      if (!list.length) { window.alert('No backups have been saved yet, so there are no scores to recover.'); return; }
      const snaps = [...list].reverse(); // newest first
      const hasScore = (m) => !!(m && (m.scoreA != null || m.scoreB != null));
      const keyOf = (dateLabel, m) => `${(dateLabel || '').trim().toLowerCase()}|${(m.time || '').trim()}|${(m.teamA?.name || '').trim().toLowerCase()}|${(m.teamB?.name || '').trim().toLowerCase()}`;
      const scoreByKey = new Map();
      snaps.forEach(snap => {
        Object.values(snap.data || {}).forEach(detail => {
          (detail?.days || []).forEach(day => {
            (day.matches || []).forEach(m => {
              if (!hasScore(m)) return;
              const k = keyOf(day.dateLabel, m);
              if (!scoreByKey.has(k)) scoreByKey.set(k, { scoreA: m.scoreA ?? null, scoreB: m.scoreB ?? null });
            });
          });
        });
      });
      if (!scoreByKey.size) { window.alert('No scores were found in any of the saved backups.'); return; }
      const next = JSON.parse(JSON.stringify(fixtureDetails));
      let applied = 0; const lines = [];
      Object.values(next).forEach(detail => {
        (detail?.days || []).forEach(day => {
          (day.matches || []).forEach(m => {
            if (hasScore(m)) return; // never overwrite a score that is already there
            const s = scoreByKey.get(keyOf(day.dateLabel, m));
            if (!s) return;
            m.scoreA = s.scoreA; m.scoreB = s.scoreB; applied++;
            lines.push(`${day.dateLabel} ${m.time} — ${m.teamA?.name || '?'} v ${m.teamB?.name || '?'}: ${s.scoreA ?? '–'}–${s.scoreB ?? '–'}`);
          });
        });
      });
      if (!applied) { window.alert('Found scores in your backups, but every current match already has a score, so nothing needed restoring.'); return; }
      await writeBackup(fixtureDetails); // snapshot current state first, so this is reversible
      await saveFixtureDetails(next);
      window.alert(`Restored ${applied} score${applied === 1 ? '' : 's'} from backups:\n\n${lines.slice(0, 14).join('\n')}${lines.length > 14 ? `\n…and ${lines.length - 14} more` : ''}`);
    } catch (e) { window.alert('Could not recover scores: ' + (e?.message || e)); }
  };

  // --- Live scoring helpers (persist via saveFixtureDetails) ---
  const updLiveMatch = (fixtureId, dayId, matchId, updater) => {
    const fd = fixtureDetails[fixtureId];
    if (!fd) return;
    const nextDays = (fd.days || []).map(d => d.id !== dayId ? d : ({
      ...d,
      matches: (d.matches || []).map(m => m.id !== matchId ? m : updater(m))
    }));
    saveFixtureDetails({ ...fixtureDetails, [fixtureId]: { ...fd, days: nextDays } });
  };
  const bumpTeamScore = (fixtureId, dayId, matchId, teamKey, delta) => {
    updLiveMatch(fixtureId, dayId, matchId, m => {
      const key = teamKey === 'teamA' ? 'scoreA' : 'scoreB';
      const cur = m[key] == null ? 0 : Number(m[key]);
      return { ...m, [key]: Math.max(0, cur + delta) };
    });
  };
  const bumpPlayerGoals = (fixtureId, dayId, matchId, teamKey, playerIdx, delta) => {
    updLiveMatch(fixtureId, dayId, matchId, m => {
      const team = m[teamKey] || { players: [] };
      let applied = 0; // actual change after flooring the player's goals at 0
      const players = (team.players || []).map((p, i) => {
        if (i !== playerIdx) return p;
        const cur = p.goals == null ? 0 : Number(p.goals);
        const next = Math.max(0, cur + delta);
        applied = next - cur;
        return { ...p, goals: next };
      });
      // A goal credited to a player also counts on that team's scoreline.
      const scoreKey = teamKey === 'teamA' ? 'scoreA' : 'scoreB';
      const curScore = m[scoreKey] == null ? 0 : Number(m[scoreKey]);
      const nextScore = Math.max(0, curScore + applied);
      return { ...m, [teamKey]: { ...team, players }, [scoreKey]: nextScore };
    });
  };
  // Each player can carry a shirt number for the live scoreboard / line-ups.
  const setPlayerShirt = (fixtureId, dayId, matchId, teamKey, playerIdx, value) => {
    updLiveMatch(fixtureId, dayId, matchId, m => {
      const team = m[teamKey] || { players: [] };
      const players = (team.players || []).map((p, i) => i !== playerIdx ? p : ({ ...p, shirtNo: value }));
      return { ...m, [teamKey]: { ...team, players } };
    });
  };

  // --- Live handicap head-start (HPA handicap-conditions formula) ---
  // The goal difference between the two teams is multiplied by the number of
  // chukkas being played (normally 4), then divided by 6 — the number of
  // chukkas in National and International matches, which the handicap system is
  // based on. That is the number of goals given to the lower-handicap team.
  // Any fraction of a goal is counted as half a goal.
  //   e.g. 2-goal diff over 4 chukkas = (2*4)/6 = 1.5; 1-goal diff = (1*4)/6 = 0.5;
  //        3-goal diff = (3*4)/6 = 2; 2-goal diff over 2 chukkas = (2*2)/6 = 0.5.
  const matchChukkas = (match) => {
    const n = Number(match && match.chukkas);
    return Number.isFinite(n) && n > 0 ? n : 4; // matches default to 4 chukkas
  };
  const liveHeadStart = (match, teamKey) => {
    const hA = teamHandicap(match && match.teamA) || 0;
    const hB = teamHandicap(match && match.teamB) || 0;
    if (hA === hB) return 0;
    const units = Math.abs(hA - hB) * matchChukkas(match); // goal diff * chukkas
    const whole = Math.floor(units / 6);
    const goals = whole + (units % 6 > 0 ? 0.5 : 0); // divide by 6; any fraction → half a goal
    const lower = hA < hB ? 'A' : 'B';
    return teamKey === lower ? goals : 0;
  };
  const fmtHalf = (n) => {
    const whole = Math.floor(n);
    const half = (n - whole) >= 0.5;
    if (half) return whole === 0 ? '½' : whole + '½';
    return String(whole);
  };
  const liveDisplayScore = (match, teamKey) => {
    const goals = teamKey === 'A' ? (match && match.scoreA) : (match && match.scoreB);
    return fmtHalf((Number(goals) || 0) + liveHeadStart(match, teamKey));
  };

  // --- iOS Live Activity: mirror the selected live match to the Lock Screen / Dynamic Island. ---
  // Safe no-op on web/Android — the native plugin only exists in the iOS build.
  const liveActivityRef = useRef({ id: null, key: null });
  const liveActivitySnapshot = (() => {
    if (!liveMatchId) return null;
    const fd = liveFixtureId ? visibleFixtureDetails[liveFixtureId] : null;
    const day = fd ? (fd.days || []).find(d => d.id === liveDayId) : null;
    const cm = day ? (day.matches || []).find(m => m.id === liveMatchId) : null;
    if (!cm) return null;
    const ended = cm.liveChukka === 'ended';
    const nCk = matchChukkas(cm);
    const curCk = ended ? nCk : Math.max(0, Math.min(nCk, Number(cm.liveChukka) || 0));
    const ordn = (n) => { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
    return {
      key: liveFixtureId + '|' + liveDayId + '|' + liveMatchId,
      ended,
      isLive: !ended && curCk > 0,
      teamAName: (cm.teamA && cm.teamA.name) || 'Team A',
      teamBName: (cm.teamB && cm.teamB.name) || 'Team B',
      matchLabel: cm.label || 'DLPC',
      scoreA: String(liveDisplayScore(cm, 'A')),
      scoreB: String(liveDisplayScore(cm, 'B')),
      status: ended ? 'Full time' : (curCk > 0 ? (ordn(curCk) + ' chukka') : 'Not started'),
    };
  })();
  const liveActivitySig = liveActivitySnapshot ? JSON.stringify(liveActivitySnapshot) : '';
  useEffect(() => {
    const d = liveActivitySnapshot;
    const ref = liveActivityRef.current;
    const payload = d && {
      teamAName: d.teamAName, teamBName: d.teamBName, matchLabel: d.matchLabel,
      scoreA: d.scoreA, scoreB: d.scoreB, status: d.status, isLive: d.isLive,
    };
    // No live match in view, or the selected match isn't under way → end any running activity.
    if (!d || !d.isLive) {
      if (ref.id && ref.id !== 'pending') endLiveScore(d && d.ended && ref.key === d.key ? { ...payload, id: ref.id } : { id: ref.id });
      if (ref.id) liveActivityRef.current = { id: null, key: null };
      return;
    }
    // Live: update the running activity, or start a fresh one for this match.
    if (ref.key === d.key && ref.id && ref.id !== 'pending') {
      updateLiveScore({ ...payload, id: ref.id });
    } else if (ref.id !== 'pending' || ref.key !== d.key) {
      if (ref.id && ref.id !== 'pending') endLiveScore({ id: ref.id });
      liveActivityRef.current = { id: 'pending', key: d.key };
      startLiveScore(payload).then(id => {
        liveActivityRef.current = id ? { id, key: d.key } : { id: null, key: null };
        if (id) updateLiveScore({ ...payload, id });
      }).catch(() => { liveActivityRef.current = { id: null, key: null }; });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveActivitySig]);

  const registerInterest = (fixtureId) => {
    setFError('');
    // Interest closes at the end of the day before the fixture. A captain can
    // still add someone afterwards — they are the ones fielding the phone calls.
    const fx = fixtures.find(f => f.id === fixtureId);
    if (fx && !captainMode && isInterestClosed(fx)) {
      return setFError('Registering interest has closed for this fixture — it shuts the day before. Please contact the captain.');
    }
    if (!fName.trim()) return setFError('Please enter your name.');
    if (fHandicap === '') return setFError('Please select your handicap.');
    const cleanedEmail = fEmail.trim();
    if (cleanedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) {
      return setFError('That email address looks off — please double-check.');
    }
    const entry = {
      id: Date.now(),
      name: fName.trim(),
      handicap: parseInt(fHandicap, 10),
    };
    if (fMobile.trim()) entry.mobile = fMobile.trim();
    if (cleanedEmail) entry.email = cleanedEmail;
    const list = interest[fixtureId] || [];
    saveInterest({ ...interest, [fixtureId]: [...list, entry] });
    setFName(''); setFHandicap(''); setFMobile(''); setFEmail('');
  };

  const removeInterest = (fixtureId, entryId) => {
    const list = (interest[fixtureId] || []).filter(p => p.id !== entryId);
    const next = { ...interest };
    if (list.length === 0) delete next[fixtureId];
    else next[fixtureId] = list;
    saveInterest(next);
  };

  const toggleFixture = (id) => {
    setFError('');
    setFName(''); setFHandicap(''); setFMobile(''); setFEmail('');
    const opening = expandedId === id ? null : id;
    setExpandedId(opening);
    setShowTeamForm(false);
    if (opening) {
      const fx = fixtures.find(f => f.id === opening);
      if (fx) resetTeamForm(fx);
    }
  };

  // ── Tournament team sign-up ───────────────────────────
  const saveTeamSignups = async (next) => {
    setTeamSignups(next);
    try { await window.storage.set('team-signups', JSON.stringify(next), true); }
    catch (e) { setTError('Saved locally only — check your connection.'); }
  };

  // Every team name we know about — from the persisted teams-db, from teams in
  // published match details, and from teams already entered into any fixture.
  // Used to autofill the team name + its last squad.
  const knownTeams = () => {
    const map = {}; // lower → { name, handicap, players }
    Object.values(teamsDb).forEach(t => {
      if (t?.name?.trim()) map[t.name.trim().toLowerCase()] = { name: t.name.trim(), handicap: t.handicap ?? null, players: t.players || [] };
    });
    Object.values(fixtureDetails).forEach(det => (det?.days || []).forEach(d => (d.matches || []).forEach(m => ['teamA', 'teamB'].forEach(tk => {
      const t = m[tk];
      if (t?.name?.trim() && t.name.trim().toUpperCase() !== 'TBC') {
        map[t.name.trim().toLowerCase()] = { name: t.name.trim(), handicap: t.handicap ?? null, players: cleanSquad(t.players) };
      }
    }))));
    Object.values(teamSignups).forEach(arr => (arr || []).forEach(s => {
      if (s?.team?.trim()) {
        const key = s.team.trim().toLowerCase();
        if (!map[key]) {
          const firstSquad = Object.values(s.days || {}).find(a => a && a.length) || [];
          map[key] = { name: s.team.trim(), handicap: s.handicap ?? null, players: firstSquad };
        }
      }
    }));
    return map;
  };

  // Reset the working team form to blank 4-player squads for this fixture's days.
  const resetTeamForm = (fx) => {
    const blank = {};
    fixtureDays(fx).forEach(d => {
      blank[d.key] = [{ name: '', handicap: '' }, { name: '', handicap: '' }, { name: '', handicap: '' }, { name: '', handicap: '' }];
    });
    setTSquads(blank);
    setTName(''); setTHandicap(''); setTContact(''); setTMobile(''); setTPerDay(false); setTError('');
  };

  // Autofill the squad(s) when the typed/selected team name matches a known team.
  const onTeamNameChange = (fx, value) => {
    setTName(value);
    const match = knownTeams()[value.trim().toLowerCase()];
    if (!match) return;
    if (match.handicap !== null && match.handicap !== undefined) setTHandicap(String(match.handicap));
    const players = (match.players || []).filter(p => p.name?.trim())
      .map(p => ({ name: p.name, handicap: (p.handicap === 0 || p.handicap) ? String(p.handicap) : '' }));
    if (!players.length) return;
    setTSquads(prev => {
      const next = { ...prev };
      fixtureDays(fx).forEach(d => { next[d.key] = players.map(p => ({ ...p })); });
      return next;
    });
  };

  const setSquadPlayer = (dayKey, idx, field, value) =>
    setTSquads(prev => ({ ...prev, [dayKey]: (prev[dayKey] || []).map((r, i) => i === idx ? { ...r, [field]: value } : r) }));
  const addSquadPlayer = (dayKey) =>
    setTSquads(prev => ({ ...prev, [dayKey]: [...(prev[dayKey] || []), { name: '', handicap: '' }] }));
  const removeSquadPlayer = (dayKey, idx) =>
    setTSquads(prev => ({ ...prev, [dayKey]: (prev[dayKey] || []).filter((_, i) => i !== idx) }));

  const registerTeam = (fx) => {
    setTError('');
    if (!tName.trim()) return setTError('Please enter a team name.');
    const days = fixtureDays(fx);
    const cleanRows = (rows) => (rows || [])
      .map(r => ({ name: (r.name || '').trim(), handicap: r.handicap === '' || r.handicap == null ? null : parseInt(r.handicap, 10) }))
      .filter(r => r.name);
    const usePerDay = tPerDay && days.length > 1;
    const daysOut = {};
    if (usePerDay) {
      days.forEach(d => { daysOut[d.key] = cleanRows(tSquads[d.key]); });
    } else {
      const base = cleanRows(tSquads[days[0].key]);
      days.forEach(d => { daysOut[d.key] = base.map(p => ({ ...p })); });
    }
    if (!Object.values(daysOut).some(arr => arr.length)) return setTError('Add at least one player to the squad.');
    const entry = {
      id: Date.now(),
      team: tName.trim(),
      handicap: tHandicap === '' ? null : parseInt(tHandicap, 10),
      perDay: usePerDay,
      days: daysOut,
    };
    if (tContact.trim()) entry.contact = tContact.trim();
    if (tMobile.trim()) entry.mobile = tMobile.trim();
    const list = teamSignups[fx.id] || [];
    saveTeamSignups({ ...teamSignups, [fx.id]: [...list, entry] });
    // Remember this team (fullest day's squad) so it autofills next time.
    const canonical = Object.values(daysOut).reduce((best, arr) => arr.length > best.length ? arr : best, []);
    saveTeamsDb({ ...teamsDb, [entry.team.toLowerCase()]: { name: entry.team, handicap: entry.handicap, players: canonical } });
    resetTeamForm(fx);
    setShowTeamForm(false);
  };

  const removeTeam = (fixtureId, entryId) => {
    const list = (teamSignups[fixtureId] || []).filter(s => s.id !== entryId);
    const next = { ...teamSignups };
    if (list.length === 0) delete next[fixtureId]; else next[fixtureId] = list;
    saveTeamSignups(next);
  };

  // ── Captain: add / edit / delete fixtures ─────────────────
  const saveFixtures = async (next) => {
    // Never persist before the Firestore list has loaded — writing the built-in
    // seed over a real (edited) list would resurrect deleted fixtures for everyone.
    if (!fixturesLoadedRef.current) return;
    setFixtures(next);
    try { await window.storage.set('fixtures', JSON.stringify(next), true); }
    catch (e) { setFError('Saved locally only — check your connection.'); }
  };
  const openAddFixture = () => { setFError(''); setFixtureEditor({ month: MONTHS_ORDER[0], date: '', name: '', level: '', titleLines: [] }); };
  const openEditFixture = (fx) => { setFError(''); setFixtureEditor({ id: fx.id, month: fx.month, date: fx.date, name: fx.name, level: fx.level || '', titleLines: Array.isArray(fx.titleLines) ? [...fx.titleLines] : [] }); };
  const setEd = (field, value) => setFixtureEditor(prev => prev ? { ...prev, [field]: value } : prev);
  // Cover title lines (optional, up to 5) — printed verbatim on the programme's
  // front page instead of the auto-formatted fixture name.
  const MAX_TITLE_LINES = 5;
  const setTitleLine = (i, value) => setFixtureEditor(prev => {
    if (!prev) return prev;
    const arr = [...(prev.titleLines || [])];
    arr[i] = value;
    return { ...prev, titleLines: arr };
  });
  const addTitleLine = () => setFixtureEditor(prev => {
    if (!prev) return prev;
    const arr = [...(prev.titleLines || [])];
    if (arr.length >= MAX_TITLE_LINES) return prev;
    arr.push('');
    return { ...prev, titleLines: arr };
  });
  const removeTitleLine = (i) => setFixtureEditor(prev => {
    if (!prev) return prev;
    return { ...prev, titleLines: (prev.titleLines || []).filter((_, j) => j !== i) };
  });
  const saveFixtureEditor = () => {
    const ed = fixtureEditor;
    if (!ed) return;
    if (!ed.name.trim()) { setFError('Please enter a fixture name.'); return; }
    if (!ed.date.trim()) { setFError('Please enter a date, e.g. “Sat 30 & Sun 31 May”.'); return; }
    setFError('');
    const titleLines = (ed.titleLines || []).map(s => (s || '').trim()).filter(Boolean).slice(0, MAX_TITLE_LINES);
    const clean = { month: ed.month, date: ed.date.trim(), name: ed.name.trim(), level: ed.level.trim(), titleLines };
    let next;
    if (ed.id) {
      next = fixtures.map(f => f.id === ed.id ? { ...f, ...clean } : f);
    } else {
      const slug = clean.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'fixture';
      const existing = new Set(fixtures.map(f => f.id));
      let id = 'adhoc-' + slug;
      while (existing.has(id)) id = 'adhoc-' + slug + '-' + Math.random().toString(36).slice(2, 5);
      next = [...fixtures, { id, ...clean, adhoc: true }];
    }
    saveFixtures(next);
    setFixtureEditor(null);
  };
  // Consolidate one fixture into another: combine every day + match (matching days
  // are merged, not replaced), keep any entered scores, then drop the source. The
  // pre-merge details are snapshotted to backups first so it can be undone.
  const mergeFixtureInto = (sourceId, targetId) => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const src = fixtures.find(f => f.id === sourceId);
    const tgt = fixtures.find(f => f.id === targetId);
    if (!src || !tgt) return;
    if (!window.confirm(`Merge all days and matches from “${src.name}” into “${tgt.name}”, then remove “${src.name}”?\n\nAll data is kept — days with the same date are combined, and any scores are preserved.`)) return;
    writeBackup(fixtureDetails);
    const tgtDetail = fixtureDetails[targetId] || { days: [] };
    const srcDetail = fixtureDetails[sourceId] || { days: [] };
    const tmin = (t) => { const m = (t || '').match(/(\d{1,2})(?:[:.](\d{2}))?/); return m ? (parseInt(m[1], 10) * 60 + (m[2] ? parseInt(m[2], 10) : 0)) : 99999; };
    const hasScore = (m) => !!(m && (m.scoreA != null || m.scoreB != null));
    const mKey = (m) => `${(m.time || '').trim()}|${(m.label || '').trim().toLowerCase()}|${(m.teamA?.name || '').trim().toLowerCase()}|${(m.teamB?.name || '').trim().toLowerCase()}`;
    const MTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];
    const dayOrder = (d) => { const lbl = (d.dateLabel || '').toLowerCase(); const dn = parseInt((lbl.match(/\d+/) || ['99'])[0], 10); const mi = MTHS.findIndex(m => lbl.includes(m)); return (mi < 0 ? 99 : mi) * 100 + (isNaN(dn) ? 99 : dn); };
    const byLabel = new Map();
    (tgtDetail.days || []).forEach(d => byLabel.set(d.dateLabel, { ...d, matches: [...(d.matches || [])] }));
    (srcDetail.days || []).forEach(sd => {
      const ex = byLabel.get(sd.dateLabel);
      if (!ex) { byLabel.set(sd.dateLabel, { ...sd, matches: [...(sd.matches || [])] }); return; }
      if (!ex.ground && sd.ground) ex.ground = sd.ground;
      if (!ex.prizegiving && sd.prizegiving) ex.prizegiving = sd.prizegiving;
      if (!ex.prizegiving2 && sd.prizegiving2) ex.prizegiving2 = sd.prizegiving2;
      if (!ex.prizegiving3 && sd.prizegiving3) ex.prizegiving3 = sd.prizegiving3;
      const seen = new Map(ex.matches.map(m => [mKey(m), m]));
      (sd.matches || []).forEach(sm => {
        const k = mKey(sm); const tm = seen.get(k);
        if (!tm) { ex.matches.push(sm); seen.set(k, sm); }
        else if (!hasScore(tm) && hasScore(sm)) { const i = ex.matches.indexOf(tm); if (i >= 0) ex.matches[i] = sm; seen.set(k, sm); }
      });
      ex.matches.sort((a, b) => tmin(a.time) - tmin(b.time));
    });
    const mergedDays = Array.from(byLabel.values()).sort((a, b) => dayOrder(a) - dayOrder(b));
    const nextDetails = { ...fixtureDetails, [targetId]: { ...tgtDetail, days: mergedDays } };
    delete nextDetails[sourceId];
    saveFixtureDetails(nextDetails);
    saveFixtures(fixtures.filter(f => f.id !== sourceId));
    setFixtureEditor(null);
    alert(`Merged “${src.name}” into “${tgt.name}”. Open “${tgt.name}” to check the combined days.`);
  };
  const deleteFixture = (id) => {
    if (!window.confirm('Delete this fixture from the list? Any match details and team sign-ups stay stored, but the fixture will no longer be shown.')) return;
    saveFixtures(fixtures.filter(f => f.id !== id));
    setFixtureEditor(null);
  };
  const restoreOfficialFixtures = () => {
    if (!window.confirm('Restore the official 2026 fixture list? This replaces the current list, including any fixtures you have added or edited.')) return;
    saveFixtures(FIXTURES_2026);
    setFixtureEditor(null);
  };
  const renderFixtureEditor = () => {
    if (!fixtureEditor) return null;
    return (
      <div className="register-form" style={{ marginTop: 0 }}>
        <div className="label-eyebrow" style={{ fontSize: '10px', marginBottom: '10px' }}>{fixtureEditor.id ? 'Edit fixture' : 'Add fixture'}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input className="input-field" type="text" placeholder="Fixture name e.g. The Rabbit Cup" value={fixtureEditor.name} onChange={e => setEd('name', e.target.value)} style={{ padding: '12px 14px', fontSize: '15px' }} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <select className="input-field select-field" value={fixtureEditor.month} onChange={e => setEd('month', e.target.value)} style={{ width: '136px', flexShrink: 0, padding: '12px 8px', fontSize: '14px' }}>
              {ALL_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <input className="input-field" type="text" placeholder="Date e.g. Sat 30 & Sun 31 May" value={fixtureEditor.date} onChange={e => setEd('date', e.target.value)} style={{ flex: 1, minWidth: 0, padding: '12px 14px', fontSize: '14px' }} />
          </div>
          <input className="input-field" type="text" placeholder="Handicap level e.g. −4 to 0 Goal (optional)" value={fixtureEditor.level} onChange={e => setEd('level', e.target.value)} style={{ padding: '12px 14px', fontSize: '15px' }} />
          <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: 1.45, marginTop: '-2px' }}>
            Put the weekday + day in the date (e.g. “Sat 30 & Sun 31 May”) so team sign-ups and the programme pick up the right days. The handicap level prints on the programme PDF.
          </div>

          {/* Optional cover title lines — control exactly how the title stacks on the programme's front page */}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: 1.45 }}>
              <strong style={{ color: 'var(--ink)' }}>Programme cover title (optional).</strong> Add up to {MAX_TITLE_LINES} lines to set exactly how the title stacks on the programme’s front page — e.g. “The”, “QRH V KRH”, “Gulf War”, “Anniversary”, “Match”. Leave empty to auto-format from the fixture name.
            </div>
            {(fixtureEditor.titleLines || []).map((ln, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--muted)', width: '14px', flexShrink: 0, textAlign: 'right' }}>{i + 1}</span>
                <input className="input-field" type="text" placeholder={`Line ${i + 1}`} value={ln} onChange={e => setTitleLine(i, e.target.value)} style={{ flex: 1, minWidth: 0, padding: '10px 12px', fontSize: '14px' }} />
                <button onClick={() => removeTitleLine(i)} title="Remove line" aria-label={`Remove line ${i + 1}`} style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--muted)', width: '36px', height: '38px', borderRadius: '4px', fontSize: '17px', lineHeight: 1, cursor: 'pointer', flexShrink: 0 }}>×</button>
              </div>
            ))}
            {(fixtureEditor.titleLines || []).length < MAX_TITLE_LINES && (
              <button onClick={addTitleLine} style={{ alignSelf: 'flex-start', background: 'transparent', border: '1px dashed var(--line)', color: 'var(--burgundy)', padding: '8px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>＋ Add line</button>
            )}
          </div>

          {fError && <div style={{ fontSize: '12px', color: 'var(--danger)', padding: '8px 12px', background: '#fbf2f2', borderRadius: '4px', borderLeft: '3px solid var(--danger)' }}>{fError}</div>}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-primary" onClick={saveFixtureEditor} style={{ flex: 1, padding: '13px', fontSize: '12px' }}>{fixtureEditor.id ? 'Save fixture' : 'Add fixture'}</button>
            <button onClick={() => { setFixtureEditor(null); setFError(''); }} style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--muted)', padding: '13px 16px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
          </div>
          {fixtureEditor.id && fixtures.some(f => f.id !== fixtureEditor.id) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: 1.4 }}>Consolidate — merge all of this fixture's days &amp; matches into another fixture (keeping scores), then remove this one.</span>
              <select className="input-field select-field" value="" onChange={e => { const tid = e.target.value; if (tid) mergeFixtureInto(fixtureEditor.id, tid); }} style={{ padding: '10px 8px', fontSize: '13px' }}>
                <option value="">Merge into…</option>
                {fixtures.filter(f => f.id !== fixtureEditor.id).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
          )}
          {fixtureEditor.id && (
            <button onClick={() => deleteFixture(fixtureEditor.id)} style={{ background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Delete fixture</button>
          )}
        </div>
      </div>
    );
  };

  const totalChukkas = players.reduce((s, p) => s + p.chukkas, 0);
  const totalRegistrations = Object.values(interest).reduce((s, arr) => s + arr.length, 0);

  // Autofill suggestions: members not yet in the roster, filtered by typed text
  const nameInputLower = name.trim().toLowerCase();
  const rosterNames = new Set(players.map(p => p.name.toLowerCase()));
  const suggestions = playerDb
    .filter(p => p.active !== false)
    .filter(p => !rosterNames.has((p.name || '').toLowerCase()))
    .filter(p => nameInputLower === '' || (p.name || '').toLowerCase().includes(nameInputLower))
    .slice()
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .slice(0, 8);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500&family=Outfit:wght@300;400;500;600;700&display=swap');

        .polo-app {
          --burgundy: #231F20;
          --burgundy-deep: #0D0C0C;
          --burgundy-soft: #3A3634;
          --cream: #FAF9F7;
          --cream-warm: #EFEDE8;
          --cream-pale: #FFFFFF;
          --gold: #C9910F;
          --gold-bright: #FBB415;
          --ink: #231F20;
          --muted: #6B6663;
          --line: #DEDAD3;
          --danger: #B3261E;
          --blue: #111010;
          --blue-deep: #000000;
          --white-team: #ffffff;
          --white-team-border: #C9910F;
          --wa: #25D366;
          --wa-deep: #128C7E;
          font-family: 'Outfit', system-ui, sans-serif;
          background: var(--cream);
          color: var(--ink);
          min-height: 100vh;
          line-height: 1.4;
        }
        .polo-app * { box-sizing: border-box; }
        .display { font-family: 'Fraunces', Georgia, serif; font-weight: 500; }
        .display-italic { font-family: 'Fraunces', Georgia, serif; font-style: italic; font-weight: 400; }
        .label-eyebrow {
          font-family: 'Fraunces', serif;
          font-style: italic;
          color: var(--muted);
          font-size: 13px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
        }
        .header-bg {
          background: var(--burgundy);
          color: var(--cream);
          position: relative;
          overflow: hidden;
        }
        .header-bg::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(circle at 18% 28%, rgba(251, 180, 21, 0.10) 0%, transparent 55%),
            radial-gradient(circle at 82% 78%, rgba(251, 180, 21, 0.06) 0%, transparent 45%);
          pointer-events: none;
        }
        .ornament {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin: 14px auto;
        }
        .ornament-line { width: 36px; height: 1px; background: var(--gold); }
        .ornament-dot { width: 5px; height: 5px; background: var(--gold); transform: rotate(45deg); }

        .tabs {
          display: flex;
          background: var(--burgundy-deep);
          padding: 0;
          border-bottom: 1px solid rgba(251, 180, 21, 0.4);
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .tab-btn {
          flex: 1;
          background: transparent;
          border: none;
          padding: 14px 8px;
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: rgba(250, 249, 247, 0.55);
          cursor: pointer;
          transition: color 0.2s;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
        }
        .tab-btn:hover { color: var(--cream); }
        .tab-btn.active {
          color: var(--cream);
          border-bottom-color: var(--gold);
        }
        /* Day menu inside the Chukkas tab */
        .day-menu {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 8px;
          margin-bottom: 24px;
        }
        .day-menu-btn {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 3px;
          padding: 12px 14px;
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 4px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
          font-family: 'Outfit', sans-serif;
        }
        .day-menu-btn:hover { border-color: var(--burgundy); }
        .day-menu-btn.active {
          background: var(--burgundy);
          border-color: var(--burgundy);
        }
        .day-menu-day {
          font-family: 'Fraunces', serif;
          font-size: 16px;
          font-weight: 600;
          color: var(--ink);
        }
        .day-menu-btn.active .day-menu-day { color: var(--cream); }
        .day-menu-blurb {
          font-size: 10px;
          letter-spacing: 0.6px;
          text-transform: uppercase;
          color: var(--muted);
          line-height: 1.3;
        }
        .day-menu-btn.active .day-menu-blurb { color: rgba(250, 249, 247, 0.75); }
        /* Club shop */
        .shop-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
        }
        .shop-card {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 4px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .shop-img-wrap {
          width: 100%;
          aspect-ratio: 3 / 4;
          background: var(--cream-pale);
          overflow: hidden;
        }
        .shop-img { width: 100%; height: 100%; object-fit: cover; display: block; }
        /* Live scoreboard */
        .live-dot {
          width: 9px; height: 9px; border-radius: 50%;
          background: #7fd1a8; display: inline-block; flex-shrink: 0;
          animation: livePulse 1.8s ease-out infinite;
        }
        @keyframes livePulse {
          0%   { box-shadow: 0 0 0 0 rgba(127,209,168,0.55); }
          70%  { box-shadow: 0 0 0 7px rgba(127,209,168,0); }
          100% { box-shadow: 0 0 0 0 rgba(127,209,168,0); }
        }

        .card {
          background: white;
          border: 1px solid var(--line);
          border-radius: 6px;
        }
        .input-field {
          width: 100%;
          padding: 14px 16px;
          background: var(--cream-pale);
          border: 1px solid var(--line);
          border-radius: 4px;
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          color: var(--ink);
          transition: all 0.2s;
          -webkit-appearance: none;
          appearance: none;
        }
        .input-field:focus {
          outline: none;
          border-color: var(--burgundy);
          background: white;
          box-shadow: 0 0 0 3px rgba(107, 31, 42, 0.10);
        }
        .input-field::placeholder { color: #b8ad8e; }
        .select-field {
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3e%3cpath fill='none' stroke='%236b5e4e' stroke-width='1.5' d='M1 1.5l5 5 5-5'/%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 16px center;
          padding-right: 40px;
        }
        .btn-primary {
          background: var(--burgundy);
          color: var(--cream);
          border: none;
          padding: 15px 24px;
          border-radius: 4px;
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
        }
        .btn-primary:hover:not(:disabled) { background: var(--burgundy-deep); }
        .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-secondary {
          background: transparent;
          color: var(--burgundy);
          border: 1px solid var(--burgundy);
          padding: 13px 20px;
          border-radius: 4px;
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
        }
        .btn-secondary:hover { background: var(--burgundy); color: var(--cream); }

        .player-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          background: white;
          border: 1px solid var(--line);
          border-radius: 4px;
          margin-bottom: 8px;
          transition: all 0.2s;
        }
        .player-row:hover { border-color: var(--gold); }
        .handicap-badge {
          font-family: 'Fraunces', serif;
          font-weight: 600;
          background: var(--burgundy);
          color: var(--cream);
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 15px;
        }
        .handicap-badge.gold { background: var(--gold); }
        .chukka-pill {
          background: var(--cream-warm);
          color: var(--burgundy);
          padding: 5px 11px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          border: 1px solid var(--line);
          white-space: nowrap;
        }
        /* Inline +/− adjuster for chukka count */
        .chukka-stepper {
          display: inline-flex;
          align-items: center;
          gap: 0;
          border: 1px solid var(--line);
          border-radius: 14px;
          overflow: hidden;
          background: var(--cream-warm);
        }
        .step-btn {
          background: transparent;
          border: none;
          width: 26px;
          height: 26px;
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 500;
          color: var(--burgundy);
          cursor: pointer;
          padding: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }
        .step-btn:hover:not(:disabled) { background: var(--burgundy); color: var(--cream); }
        .step-btn:disabled { color: var(--muted); opacity: 0.4; cursor: not-allowed; }
        .step-count {
          font-size: 12px;
          font-weight: 600;
          color: var(--burgundy);
          padding: 0 6px;
          font-variant-numeric: tabular-nums;
          min-width: 16px;
          text-align: center;
        }
        .step-label {
          font-size: 11px;
          color: var(--muted);
          margin-left: 2px;
        }
        .remove-btn {
          background: transparent;
          border: none;
          color: var(--muted);
          font-size: 22px;
          cursor: pointer;
          padding: 4px 10px;
          transition: color 0.2s;
          line-height: 1;
        }
        .remove-btn:hover { color: var(--danger); }

        .team-card {
          background: white;
          border: 1px solid var(--line);
          border-radius: 6px;
          padding: 22px 20px;
          position: relative;
          overflow: hidden;
        }
        .team-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: var(--burgundy);
        }
        .team-card.gold::before { background: var(--gold); }

        /* Preference segmented control */
        .segmented {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0;
          background: var(--cream-pale);
          border: 1px solid var(--line);
          border-radius: 4px;
          padding: 3px;
        }
        .seg-btn {
          background: transparent;
          border: none;
          padding: 10px 8px;
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.5px;
          color: var(--muted);
          cursor: pointer;
          border-radius: 3px;
          transition: all 0.2s;
        }
        .seg-btn.active {
          background: var(--burgundy);
          color: var(--cream);
        }
        .pref-tag {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 11px;
          color: var(--muted);
          letter-spacing: 0.5px;
        }

        /* Chukka schedule */
        .chukka-card {
          background: white;
          border: 1px solid var(--line);
          border-radius: 6px;
          margin-bottom: 14px;
          overflow: hidden;
        }
        .chukka-card.early { border-left: 3px solid var(--burgundy); }
        .chukka-card.late  { border-left: 3px solid var(--gold); }
        .chukka-head {
          padding: 14px 16px;
          background: var(--cream-pale);
          border-bottom: 1px solid var(--line);
          display: flex;
          align-items: baseline;
          justify-content: space-between;
        }
        .chukka-num {
          font-family: 'Fraunces', serif;
          font-weight: 500;
          font-size: 18px;
          color: var(--burgundy);
        }
        .chukka-time {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 14px;
          color: var(--ink);
        }
        .chukka-diff {
          font-size: 11px;
          color: var(--muted);
          font-style: italic;
          font-family: 'Fraunces', serif;
        }
        .chukka-body {
          padding: 14px 16px 16px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0;
        }
        .chukka-team {
          padding: 0 10px;
        }
        .chukka-team:first-child {
          border-right: 1px solid var(--line);
          padding-left: 0;
        }
        .chukka-team:last-child {
          padding-right: 0;
        }
        .team-mini-label {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 10px;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: 4px;
        }
        .team-mini-total {
          font-family: 'Fraunces', serif;
          font-weight: 600;
          font-size: 16px;
          margin-bottom: 8px;
        }
        .team-mini-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 5px 0;
          font-size: 13px;
          cursor: pointer;
          border-radius: 3px;
          transition: background 0.15s;
        }
        .team-mini-row:hover { background: var(--cream-pale); }
        .team-mini-row.selected {
          background: var(--cream-warm);
          outline: 1px solid var(--gold);
          padding: 5px 6px;
          margin: 0 -6px;
        }
        .team-mini-row .hcp {
          font-family: 'Fraunces', serif;
          font-weight: 600;
          font-size: 11px;
          background: var(--blue);
          color: white;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .team-mini-row.white .hcp {
          background: var(--white-team);
          color: var(--ink);
          border: 1.5px solid var(--blue);
          width: 22px;
          height: 22px;
        }
        .team-mini-name {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 500;
        }
        /* Subtle inline × on each chukka player row */
        .chukka-remove {
          background: transparent;
          border: none;
          color: var(--muted);
          font-size: 18px;
          cursor: pointer;
          padding: 0 2px 0 4px;
          line-height: 1;
          opacity: 0.35;
          transition: opacity 0.15s, color 0.15s;
          flex-shrink: 0;
        }
        .chukka-remove:hover { opacity: 1; color: var(--danger); }
        .team-mini-row.selected .chukka-remove { opacity: 1; }
        .chukka-warning {
          padding: 8px 12px;
          background: #fdf4e6;
          border-top: 1px solid #e8d5a0;
          font-size: 12px;
          color: #8a5a1a;
          font-style: italic;
          font-family: 'Fraunces', serif;
        }
        /* Inline action bar that appears when a player is tapped */
        .action-bar {
          grid-column: 1 / -1;
          padding: 10px 0 6px;
          margin-top: 8px;
          border-top: 1px dashed var(--line);
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
        }
        .action-label {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 11px;
          color: var(--muted);
          letter-spacing: 0.5px;
          margin-right: 2px;
        }
        .action-btn {
          background: white;
          border: 1px solid var(--line);
          color: var(--burgundy);
          padding: 6px 10px;
          border-radius: 4px;
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.5px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .action-btn:hover:not(:disabled) { background: var(--burgundy); color: var(--cream); border-color: var(--burgundy); }
        .action-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .action-btn.danger { color: var(--danger); }
        .action-btn.danger:hover { background: var(--danger); color: white; border-color: var(--danger); }
        .action-btn.tiny {
          width: 26px;
          height: 26px;
          padding: 0;
          font-size: 11px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        /* Add-to-chukka strip */
        .add-strip {
          padding: 10px 16px 14px;
          background: var(--cream-pale);
          border-top: 1px dashed var(--line);
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
        }
        .add-trigger {
          background: transparent;
          border: 1px dashed var(--line);
          color: var(--muted);
          padding: 8px 14px;
          width: 100%;
          border-radius: 4px;
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          letter-spacing: 1px;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.15s;
        }
        .add-trigger:hover { border-color: var(--burgundy); color: var(--burgundy); }
        .add-pick {
          background: white;
          border: 1px solid var(--line);
          color: var(--ink);
          padding: 6px 10px;
          border-radius: 4px;
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }
        .add-pick:hover { background: var(--burgundy); color: var(--cream); border-color: var(--burgundy); }

        .wa-card {
          background: white;
          border: 1px solid var(--line);
          border-left: 3px solid var(--wa-deep);
          border-radius: 6px;
          padding: 12px 14px;
          margin-bottom: 22px;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .wa-icon {
          font-size: 16px;
          color: var(--wa-deep);
          font-weight: 600;
        }
        .wa-label {
          flex: 1;
          min-width: 0;
          font-size: 12px;
          color: var(--ink);
        }
        .wa-label .display-italic { color: var(--muted); }
        .wa-btn {
          background: var(--wa-deep);
          color: white;
          border: none;
          padding: 8px 14px;
          border-radius: 4px;
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 1px;
          text-transform: uppercase;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          transition: background 0.15s;
        }
        .wa-btn:hover { background: var(--wa); }
        .wa-btn-outline {
          background: transparent;
          color: var(--wa-deep);
          border: 1px solid var(--wa-deep);
        }
        .wa-btn-outline:hover { background: var(--wa-deep); color: white; }
        .wa-edit-btn {
          background: none;
          border: none;
          font-size: 11px;
          color: var(--muted);
          cursor: pointer;
          letter-spacing: 0.5px;
        }
        /* Phone link in roster row */
        .phone-link {
          color: var(--wa-deep);
          font-size: 12px;
          text-decoration: none;
          letter-spacing: 0.3px;
        }
        .phone-link:hover { text-decoration: underline; }
        /* Edit hint above schedule */
        .edit-hint {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 12px;
          color: var(--muted);
          text-align: center;
          padding: 8px 14px;
          background: var(--cream-pale);
          border: 1px dashed var(--line);
          border-radius: 4px;
          margin-bottom: 14px;
        }
        /* Autofill suggestion row */
        .suggestion-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
          padding: 2px 0;
          margin-top: -4px;
        }
        .suggestion-label {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 11px;
          color: var(--muted);
          letter-spacing: 0.3px;
          margin-right: 2px;
        }
        .suggestion-chip {
          background: var(--cream-warm);
          border: 1px solid var(--line);
          color: var(--burgundy);
          padding: 5px 11px;
          border-radius: 14px;
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .suggestion-chip:hover { background: var(--burgundy); color: var(--cream); border-color: var(--burgundy); }
        .suggestion-chip .chip-hcp {
          opacity: 0.65;
          margin-left: 4px;
          font-size: 11px;
        }
        /* View toggle for cards/table */
        .view-toggle {
          display: inline-flex;
          background: var(--cream-pale);
          border: 1px solid var(--line);
          border-radius: 4px;
          padding: 3px;
          margin-bottom: 14px;
        }
        .view-toggle-btn {
          background: transparent;
          border: none;
          padding: 8px 18px;
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          color: var(--muted);
          cursor: pointer;
          border-radius: 3px;
          transition: all 0.2s;
        }
        .view-toggle-btn.active {
          background: var(--burgundy);
          color: var(--cream);
        }
        /* Captain-style table — breaks out of the 540px main wrapper
           so wide schedules (7-8 chukkas) get the full viewport width.
           Uses the classic "full-bleed" trick: position relative to the
           viewport rather than the parent. */
        .captain-table-wrap {
          position: relative;
          left: 50%;
          right: 50%;
          margin-left: -50vw;
          margin-right: -50vw;
          width: 100vw;
          max-width: 100vw;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          padding: 0 16px 8px;
          background: var(--cream-pale);
          box-sizing: border-box;
        }
        .captain-table {
          border-collapse: collapse;
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          margin: 14px auto;
          background: white;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }
        .captain-table th, .captain-table td {
          border: 1px solid var(--line);
          padding: 6px 8px;
          text-align: center;
          vertical-align: middle;
          white-space: nowrap;
        }
        .captain-table .date-cell {
          background: var(--burgundy);
          color: var(--cream);
          font-family: 'Fraunces', serif;
          font-weight: 500;
          font-size: 12px;
          padding: 8px 10px;
          letter-spacing: 0.3px;
        }
        .captain-table .ground-cell {
          background: var(--gold-bright);
          color: var(--burgundy-deep);
          font-family: 'Fraunces', serif;
          font-weight: 600;
          font-size: 12px;
        }
        .captain-table .time-header {
          background: var(--cream-warm);
          color: var(--burgundy);
          font-weight: 600;
          font-size: 11px;
        }
        .captain-table .col-header {
          background: var(--burgundy);
          color: var(--cream);
          font-size: 10px;
          letter-spacing: 0.8px;
          text-transform: uppercase;
          font-weight: 500;
        }
        .captain-table .chukka-header {
          background: var(--cream-warm);
          color: var(--burgundy);
          font-size: 10px;
          letter-spacing: 0.5px;
        }
        .captain-table tbody td.name-cell {
          text-align: left;
          font-weight: 500;
          color: var(--ink);
        }
        .captain-table .blue-cell {
          background: rgba(42, 74, 110, 0.12);
          color: var(--blue-deep);
          font-weight: 700;
          font-family: 'Fraunces', serif;
        }
        .captain-table .white-cell {
          background: rgba(251, 180, 21, 0.10);
          color: var(--burgundy);
          font-weight: 700;
          font-family: 'Fraunces', serif;
        }
        .captain-table .empty-cell {
          background: white;
        }
        .captain-table tbody tr:nth-child(even) td.name-cell {
          background: var(--cream-pale);
        }

        /* Share modal */
        .share-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(28, 22, 18, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          z-index: 1000;
          animation: fadeIn 0.18s ease-out;
        }
        .share-modal {
          background: white;
          border-radius: 8px;
          max-width: 480px;
          width: 100%;
          max-height: 88vh;
          overflow-y: auto;
          box-shadow: 0 12px 32px rgba(0,0,0,0.18);
          display: flex;
          flex-direction: column;
        }
        .share-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px 12px;
          border-bottom: 1px solid var(--line);
        }
        .share-head h3 {
          font-family: 'Fraunces', serif;
          font-weight: 500;
          font-size: 20px;
          margin: 0;
          color: var(--burgundy);
        }
        .share-close {
          background: transparent;
          border: none;
          font-size: 24px;
          color: var(--muted);
          cursor: pointer;
          padding: 0 4px;
          line-height: 1;
        }
        .share-close:hover { color: var(--ink); }
        .share-body { padding: 14px 20px 18px; }
        .share-status {
          padding: 10px 12px;
          border-radius: 4px;
          font-size: 13px;
          margin-bottom: 12px;
        }
        .share-status.ok {
          background: rgba(37, 211, 102, 0.10);
          border-left: 3px solid var(--wa);
          color: var(--wa-deep);
        }
        .share-status.warn {
          background: #fdf4e6;
          border-left: 3px solid #C9910F;
          color: #8a5a1a;
        }
        .share-textarea {
          width: 100%;
          height: 180px;
          padding: 10px 12px;
          font-family: 'SF Mono', Menlo, Consolas, monospace;
          font-size: 11px;
          line-height: 1.5;
          background: var(--cream-pale);
          border: 1px solid var(--line);
          border-radius: 4px;
          resize: vertical;
          color: var(--ink);
          -webkit-user-select: all;
          user-select: all;
        }
        .share-textarea:focus {
          outline: none;
          border-color: var(--burgundy);
        }
        .share-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 14px;
        }
        .share-link {
          display: block;
          text-align: center;
          padding: 13px 16px;
          border-radius: 4px;
          text-decoration: none;
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          transition: all 0.2s;
        }
        .share-link.primary {
          background: var(--wa-deep);
          color: white;
        }
        .share-link.primary:hover { background: var(--wa); }
        .share-link.secondary {
          background: white;
          color: var(--burgundy);
          border: 1px solid var(--burgundy);
        }
        .share-link.secondary:hover { background: var(--burgundy); color: var(--cream); }
        .share-hint {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 12px;
          color: var(--muted);
          text-align: center;
          margin-top: 10px;
          line-height: 1.5;
        }

        .month-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin: 28px 0 14px;
        }
        .month-header:first-of-type { margin-top: 8px; }
        .month-header .line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, var(--gold), transparent);
        }

        .fixture-card {
          background: white;
          border: 1px solid var(--line);
          border-radius: 6px;
          margin-bottom: 10px;
          overflow: hidden;
          transition: border-color 0.2s;
        }
        .fixture-card:hover { border-color: var(--gold); }
        .fixture-card.expanded { border-color: var(--burgundy); }
        .fixture-header {
          padding: 14px 16px;
          cursor: pointer;
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .fixture-date {
          font-family: 'Fraunces', serif;
          font-style: italic;
          font-size: 11px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          flex-shrink: 0;
          width: 86px;
          padding-top: 2px;
          line-height: 1.35;
        }
        .fixture-name {
          font-weight: 500;
          font-size: 14px;
          color: var(--ink);
          line-height: 1.35;
        }
        .fixture-level {
          font-size: 12px;
          color: var(--burgundy);
          margin-top: 3px;
          font-weight: 400;
        }
        .fixture-meta {
          flex-shrink: 0;
          text-align: right;
          font-size: 11px;
          color: var(--muted);
          font-family: 'Fraunces', serif;
          font-style: italic;
          min-width: 50px;
        }
        .fixture-count {
          font-size: 16px;
          color: var(--burgundy);
          font-weight: 600;
          font-style: normal;
          font-family: 'Outfit', sans-serif;
          line-height: 1;
        }
        .fixture-body {
          padding: 0 16px 16px;
          border-top: 1px solid var(--line);
          background: var(--cream-pale);
        }
        .interested-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px dashed var(--line);
        }
        .interested-row:last-of-type { border-bottom: none; }
        .mini-badge {
          background: var(--burgundy);
          color: var(--cream);
          font-family: 'Fraunces', serif;
          font-weight: 600;
          font-size: 12px;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .register-form {
          margin-top: 14px;
          padding: 14px;
          background: white;
          border: 1px solid var(--line);
          border-radius: 4px;
        }
        .team-entry {
          padding: 10px 12px;
          margin-bottom: 8px;
          background: white;
          border: 1px solid var(--line);
          border-left: 3px solid var(--burgundy);
          border-radius: 4px;
        }
        .squad-line {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          margin-top: 6px;
        }
        .squad-day {
          font-size: 10px;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: var(--burgundy);
          font-weight: 600;
          width: 100%;
          margin-bottom: 1px;
        }
        .squad-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: var(--cream-warm);
          border: 1px solid var(--line);
          border-radius: 999px;
          padding: 3px 10px;
          font-size: 12.5px;
          color: var(--ink);
        }
        .squad-chip em {
          font-style: normal;
          font-family: 'Fraunces', serif;
          font-weight: 600;
          font-size: 11px;
          color: var(--burgundy);
        }
        .enter-team-btn {
          width: 100%;
          margin-top: 8px;
          padding: 12px;
          background: transparent;
          border: 1px dashed var(--gold);
          border-radius: 4px;
          color: var(--burgundy);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          cursor: pointer;
        }
        .enter-team-btn:hover { background: var(--cream-warm); }
        .perday-toggle {
          display: flex;
          gap: 6px;
        }
        .perday-toggle button {
          flex: 1;
          padding: 9px 6px;
          background: transparent;
          border: 1px solid var(--line);
          border-radius: 4px;
          color: var(--muted);
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
        }
        .perday-toggle button.active {
          background: var(--burgundy);
          color: var(--cream);
          border-color: var(--burgundy);
        }
        .squad-editor {
          padding: 10px;
          background: var(--cream-pale);
          border: 1px solid var(--line);
          border-radius: 4px;
        }
        .squad-editor-head {
          font-size: 10px;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: var(--burgundy);
          font-weight: 600;
          margin-bottom: 8px;
        }
        .squad-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
        }
        .add-player-btn {
          background: transparent;
          border: none;
          color: var(--burgundy);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          padding: 2px 0;
        }

        .anim-in { animation: fadeIn 0.45s ease-out backwards; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .reveal { animation: fadeInScale 0.4s ease-out; }
      `}</style>

      <div className="polo-app">
        {/* Desktop fixture board. Renders only above the breakpoint and only in
            captain mode; every edit goes through the same updaters the phone
            editor uses, so the two views cannot diverge. */}
        {isDesktop && captainMode && boardFixtureId && (() => {
          const fx = fixtures.find(f => f.id === boardFixtureId);
          if (!fx) return null;
          const draft = fixtureDetails[fx.id] || { days: [] };
          const setBoardDraft = (next) => saveFixtureDetails({ ...fixtureDetails, [fx.id]: next });
          const bUpdDay = (di, up) => setBoardDraft({ ...draft, days: (draft.days || []).map((d, i) => i === di ? up(d) : d) });
          const bUpdMatch = (di, mi, up) => bUpdDay(di, d => ({ ...d, matches: (d.matches || []).map((m, i) => i === mi ? up(m) : m) }));
          const bUpdTeam = (di, mi, tk, up) => bUpdMatch(di, mi, m => ({ ...m, [tk]: up(m[tk] || {}) }));
          const bMoveMatch = (di, mi, dir) => bUpdDay(di, d => {
            const ms = [...(d.matches || [])];
            const j = mi + dir;
            if (j < 0 || j >= ms.length) return d;
            [ms[mi], ms[j]] = [ms[j], ms[mi]];
            return { ...d, matches: ms };
          });
          return (
            <FixtureBoard
              fixture={fx}
              draft={draft}
              setDraft={setBoardDraft}
              updDay={bUpdDay}
              updMatch={bUpdMatch}
              updTeam={bUpdTeam}
              moveMatch={bMoveMatch}
              teamsDb={teamsDb}
              playerDb={playerDb}
              groundOptions={GROUND_OPTIONS}
              teamColours={TEAM_COLOURS}
              teamColourKey={teamColourKey}
              saveTeam={saveTeamEntry}
              deleteTeam={deleteTeamEntry}
              setTeamColour={setTeamColour}
              interestCount={(interest[fx.id] || []).length}
              interestClosesAt={interestClosesAt(fx)}
              interestClosed={isInterestClosed(fx)}
              onClose={() => setBoardFixtureId(null)}
              onPrint={async () => {
                try { await generateTournamentPdf(fx, draft, {}, { committee }); }
                catch (err) { alert(err && err.message ? err.message : String(err)); }
              }}
            />
          );
        })()}
        {/* Desktop chukka board. Same rules as the fixture board: desktop-only,
            captain-only, and every edit runs through the phone's own updaters. */}
        {isDesktop && captainMode && chukkaBoardOpen && (
          <ChukkaBoard
            clubName="Druids Lodge Polo Club"
            dayKeys={DAY_KEYS}
            dayConfig={DAY_CONFIG}
            dayKey={activeDay}
            setDayKey={setActiveDay}
            rosterCounts={Object.fromEntries(DAY_KEYS.map(k => [k, (rosters[k] || []).length]))}
            players={players}
            schedule={schedule}
            throwInMin={throwInMin}
            ground={ground}
            groundOptions={GROUND_OPTIONS}
            chukkaTime={chukkaTime}
            totalChukkas={totalChukkas}
            published={!!drawPublished[activeDay]}
            setPublished={(v) => setPublished(v)}
            bookingClosed={isBookingClosed()}
            manualClosed={!!manualClosed[activeDay]}
            toggleManualClosed={() => toggleManualClosed()}
            onThrowIn={(v) => applyThrowIn(v)}
            onGround={(v) => applyGround(v)}
            adjustChukkas={adjustChukkas}
            removePlayer={removePlayer}
            toggleVip={toggleVip}
            toggleNoConsecutive={toggleNoConsecutive}
            togglePonyHire={togglePonyHire}
            movePlayer={movePlayer}
            sortByChukkas={sortByChukkas}
            updateAvail={updateAvail}
            setCell={setChukkaCell}
            onGenerate={generate}
            onClearDraw={clearDraw}
            onWhatsApp={publishToWhatsApp}
            onXLSX={exportXLSX}
            onPNG={exportPNG}
            rosterBackups={rosterBackups}
            loadBackups={loadRosterBackups}
            restoreBackup={restoreRosterBackup}
            handicapOptions={HANDICAP_OPTIONS}
            signUp={{
              name, setName, mobile, setMobile, handicap, setHandicap,
              chukkas, setChukkas, vip, setVip,
              noConsecutive, setNoConsecutive, ponyHire, setPonyHire,
              suggestions, fillFromMember, submit: handleAdd,
              maxChukkas: maxChukkasFor(), fixedChukkas: fixedChukkasFor(),
            }}
            error={error}
            onClose={() => setChukkaBoardOpen(false)}
          />
        )}
        {/* Masthead */}
        <header
          className="header-bg"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 30px)',
            paddingRight: 'calc(env(safe-area-inset-right, 0px) + 20px)',
            paddingBottom: '22px',
            paddingLeft: 'calc(env(safe-area-inset-left, 0px) + 20px)',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <div style={{ position: 'relative', zIndex: 1 }}>
            <img
              src="/crest.svg"
              alt=""
              aria-hidden="true"
              width="76"
              height="76"
              style={{ display: 'block', width: '76px', height: '76px', margin: '0 auto 10px' }}
            />
            <div className="display-italic" style={{ fontSize: '11px', letterSpacing: '3px', textTransform: 'uppercase', opacity: 0.75, marginBottom: '4px' }}>
              Est. 2004
            </div>
            <h1 className="display" style={{ fontSize: '30px', margin: 0, lineHeight: 1.05, letterSpacing: '-0.3px' }}>
              Druids Lodge
            </h1>
            <div className="display-italic" style={{ fontSize: '20px', opacity: 0.95, marginTop: '-2px' }}>
              Polo Club
            </div>
            <div className="ornament">
              <span className="ornament-line" />
              <span className="ornament-dot" />
              <span className="ornament-line" />
            </div>
            <blockquote style={{ margin: '0 auto', maxWidth: '360px' }}>
              <p className="display-italic" style={{ fontSize: '13px', lineHeight: 1.55, opacity: 0.85, margin: 0 }}>
                “No one ever yet was the poorer for having once in a lifetime let out all the length of the reins”
              </p>
              <footer className="label-eyebrow" style={{ display: 'block', color: 'inherit', opacity: 0.6, fontSize: '10px', letterSpacing: '2px', marginTop: '6px' }}>
                Mary Cholmondeley
              </footer>
            </blockquote>
          </div>
        </header>

        {/* Tabs */}
        <nav className="tabs">
          <button className={`tab-btn ${activeTab === 'chukkas' ? 'active' : ''}`} onClick={() => setActiveTab('chukkas')}>
            Chukkas
          </button>
          <button className={`tab-btn ${activeTab === 'fixtures' ? 'active' : ''}`} onClick={() => setActiveTab('fixtures')}>
            Fixtures
          </button>
          <button className={`tab-btn ${activeTab === 'live' ? 'active' : ''}`} onClick={() => setActiveTab('live')}>
            Live Game
          </button>
          {captainMode && (
            <button className={`tab-btn ${activeTab === 'shop' ? 'active' : ''}`} onClick={() => setActiveTab('shop')}>
              Shop
            </button>
          )}
          {captainMode && (
            <button className={`tab-btn ${activeTab === 'players' ? 'active' : ''}`} onClick={() => setActiveTab('players')}>
              Players
            </button>
          )}
          {captainMode && (
            <button className={`tab-btn ${activeTab === 'teams' ? 'active' : ''}`} onClick={() => setActiveTab('teams')}>
              Teams
            </button>
          )}
        </nav>

        <main style={{ maxWidth: '540px', margin: '0 auto', padding: '24px 16px 60px' }}>

          {/* Shared quick-add list of registered players (chukkas + tournaments) */}
          <datalist id="playerdb-names">
            {playerDb.filter(p => p.active !== false && !(p.name || '').includes('/')).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(p => <option key={p.id} value={p.name} />)}
          </datalist>

          {/* ─── CHUKKAS TAB — day menu + the selected day's booking page ─── */}
          {activeTab === 'chukkas' && (
            <div className="reveal">
              {/* Day menu: pick which chukka day to view/book */}
              <div className="day-menu">
                {DAY_KEYS.map(dk => {
                  const cfg = DAY_CONFIG[dk];
                  return (
                    <button
                      key={dk}
                      type="button"
                      className={`day-menu-btn ${activeDay === dk ? 'active' : ''}`}
                      onClick={() => setActiveDay(dk)}
                      aria-pressed={activeDay === dk}
                    >
                      <span className="day-menu-day">{cfg.fullLabel}</span>
                      <span className="day-menu-blurb">{cfg.blurb}</span>
                    </button>
                  );
                })}
              </div>

              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div className="label-eyebrow">
                  {activeDayConfig.note
                    ? <>{activeDayConfig.fullLabel} · {activeDayConfig.note} · {fmtTime(throwInMin)}{ground ? <> · {ground}</> : null}</>
                    : <>{activeDayConfig.fullLabel}s · {fmtTime(throwInMin)}{ground ? <> · {ground}</> : null}</>
                  }
                  {captainMode && !throwInEditing && (
                    <button
                      type="button"
                      onClick={() => { setThrowInInput(fmtTime(throwInMin)); setThrowInEditing(true); }}
                      style={{
                        background: 'none', border: 'none', marginLeft: '8px',
                        fontSize: '10px', color: 'var(--burgundy)',
                        cursor: 'pointer', textDecoration: 'underline',
                        textUnderlineOffset: '3px', fontFamily: 'inherit',
                        letterSpacing: '1px', textTransform: 'uppercase',
                      }}
                    >edit time</button>
                  )}
                </div>
                {captainMode && throwInEditing ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center', margin: '10px 0' }}>
                    <input
                      type="time"
                      value={throwInInput}
                      onChange={(e) => setThrowInInput(e.target.value)}
                      style={{ padding: '8px 10px', border: '1px solid var(--line)', borderRadius: '4px', fontSize: '15px', fontFamily: 'inherit' }}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (await applyThrowIn(throwInInput)) setThrowInEditing(false);
                      }}
                      style={{ background: 'var(--burgundy)', color: 'var(--cream)', border: 'none', borderRadius: '4px', padding: '8px 14px', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase', cursor: 'pointer' }}
                    >Save</button>
                    <button
                      type="button"
                      onClick={() => { setThrowInEditing(false); setThrowInInput(''); }}
                      style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                    >cancel</button>
                  </div>
                ) : null}
                {captainMode && (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center', margin: '8px 0 0' }}>
                    <span style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)' }}>Ground</span>
                    <select
                      value={ground}
                      onChange={(e) => applyGround(e.target.value)}
                      style={{ padding: '6px 10px', border: '1px solid var(--line)', borderRadius: '4px', fontSize: '13px', fontFamily: 'inherit', background: '#fff', color: 'var(--ink)' }}
                    >
                      <option value="">— not set —</option>
                      {GROUND_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                )}
                {captainMode && (
                  <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <button
                      onClick={() => toggleManualClosed()}
                      style={{
                        padding: '7px 14px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.3px',
                        border: manualClosed[activeDay] ? 'none' : '1px solid var(--burgundy)',
                        background: manualClosed[activeDay] ? 'var(--burgundy)' : '#fff',
                        color: manualClosed[activeDay] ? '#fff' : 'var(--burgundy)',
                      }}
                    >
                      {manualClosed[activeDay] ? '↺ Re-open sign-ups' : '✕ Close sign-ups (full)'}
                    </button>
                    <span style={{ fontSize: '11px', color: manualClosed[activeDay] ? 'var(--burgundy)' : 'var(--muted)' }}>
                      {players.length} signed up{manualClosed[activeDay] ? ' · sign-ups closed' : ''}
                    </span>
                  </div>
                )}
                {isDesktop && captainMode && (
                  <div style={{ marginTop: '12px' }}>
                    <button
                      onClick={() => setChukkaBoardOpen(true)}
                      style={{ background: 'var(--gold-bright)', border: '1px solid var(--gold-bright)', color: 'var(--ink)', padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >⛶ Open the desktop chukka board</button>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '5px' }}>
                      Roster, draw and settings side by side — with the players × chukkas grid.
                    </div>
                  </div>
                )}
                <h2 className="display" style={{ margin: '2px 0 0', fontSize: '24px' }}>Club Chukka Booking</h2>
                {activeDayConfig.note && (
                  <div className="display-italic" style={{ fontSize: '14px', color: 'var(--burgundy)', marginTop: '4px' }}>
                    {activeDayConfig.note}
                  </div>
                )}
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '4px' }}>
                  {players.length} {players.length === 1 ? 'rider' : 'riders'} · {totalChukkas} chukkas booked
                </div>
              </div>

              {/* Roster snapshots — captain-only, always reachable (even when a roster is empty) */}
              {captainMode && (
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <button onClick={() => { const n = !showRosterBackups; setShowRosterBackups(n); if (n) loadRosterBackups(); }} style={{ background: 'none', border: '1px solid var(--line)', color: 'var(--muted)', fontSize: '11px', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', letterSpacing: '0.5px' }}>
                    {showRosterBackups ? 'Hide roster snapshots' : '↺ Roster snapshots'}
                  </button>
                  {showRosterBackups && (
                    <div style={{ border: '1px solid var(--line)', borderRadius: '6px', padding: '12px', marginTop: '10px', background: 'var(--cream-pale)', textAlign: 'left' }}>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Roster snapshots · newest first · up to 50 kept</div>
                      {rosterBackups.length === 0 ? (
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>No snapshots yet — they’re captured automatically as rosters change.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
                          {rosterBackups.map((b, i) => {
                            const counts = DAY_KEYS.map(dk => { const a = b.rosters && b.rosters[dk]; return (Array.isArray(a) && a.length) ? `${DAY_CONFIG[dk].short} ${a.length}` : null; }).filter(Boolean).join(' · ');
                            const when = new Date(b.ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                            return (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', borderBottom: '1px solid var(--line)', paddingBottom: '6px' }}>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: '12px', color: 'var(--ink)' }}>{when}</div>
                                  <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{counts || 'empty'}{b.reason ? ` · ${b.reason}` : ''}</div>
                                </div>
                                <button onClick={() => restoreRosterBackup(b)} style={{ background: 'var(--burgundy)', color: 'var(--cream)', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>Restore</button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* WhatsApp group card — only shown when link is set OR captain is editing */}
              {(waLink || captainMode) && (
                <div className="wa-card">
                  <span className="wa-icon">💬</span>
                  <div className="wa-label">
                    {waLink ? (
                      <>
                        <strong>Club WhatsApp</strong>
                        <div className="display-italic">Tap to join the group chat</div>
                      </>
                    ) : (
                      <>
                        <strong>WhatsApp group</strong>
                        <div className="display-italic">Add the club's group link to publish team sheets</div>
                      </>
                    )}
                  </div>
                  {waEditing && captainMode ? (
                    <div style={{ flexBasis: '100%', display: 'flex', gap: '6px', marginTop: '6px' }}>
                      <input
                        className="input-field"
                        type="url"
                        placeholder="https://chat.whatsapp.com/..."
                        value={waInput}
                        onChange={(e) => setWaInput(e.target.value)}
                        style={{ padding: '8px 12px', fontSize: '13px' }}
                      />
                      <button className="wa-btn" onClick={() => saveWaLink(waInput)}>Save</button>
                      <button className="wa-edit-btn" onClick={() => { setWaEditing(false); setWaInput(''); }}>cancel</button>
                    </div>
                  ) : waLink ? (
                    <>
                      <a className="wa-btn" href={waLink} target="_blank" rel="noopener noreferrer">Join group</a>
                      {captainMode && (
                        <>
                          <button
                            className="wa-edit-btn"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(waLink);
                                window.alert('Group link copied to clipboard.');
                              } catch (e) {
                                window.prompt('Copy this link:', waLink);
                              }
                            }}
                          >copy</button>
                          <button className="wa-edit-btn" onClick={() => { setWaInput(waLink); setWaEditing(true); }}>edit</button>
                        </>
                      )}
                    </>
                  ) : captainMode ? (
                    <button className="wa-btn wa-btn-outline" onClick={() => { setWaInput(''); setWaEditing(true); }}>
                      Set link
                    </button>
                  ) : null}
                </div>
              )}

              {/* Sign-up */}
              <section className="card" style={{ padding: '20px', marginBottom: '24px' }}>
                <div className="label-eyebrow" style={{ marginBottom: '2px' }}>Sign up</div>
                <h2 className="display" style={{ margin: '0 0 16px', fontSize: '22px' }}>Add a Player</h2>

                {/* Booking cutoff banner — public only, within the closed window for this day */}
                {!captainMode && isBookingClosed() && (
                  <div
                    role="alert"
                    style={{
                      background: '#fef0ee',
                      border: '1px solid #d27a6f',
                      borderLeft: '4px solid var(--burgundy)',
                      borderRadius: '4px',
                      padding: '14px 16px',
                      marginBottom: '16px',
                      fontSize: '13px',
                      lineHeight: 1.55,
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--burgundy)', marginBottom: '6px', fontFamily: "'Fraunces', serif", fontSize: '15px' }}>
                      Bookings closed for this {activeDayConfig.fullLabel}
                    </div>
                    <div style={{ color: 'var(--ink)' }}>
                      {bookingClosedReason()} To be added, please email the captain:
                    </div>
                    <a
                      href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(activeDayConfig.fullLabel + ' Chukkas - late sign-up')}`}
                      style={{
                        display: 'inline-block',
                        marginTop: '8px',
                        color: 'var(--burgundy)',
                        fontWeight: 500,
                        textDecoration: 'underline',
                        textUnderlineOffset: '3px',
                      }}
                    >
                      {CONTACT_EMAIL}
                    </a>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    className="input-field"
                    type="text"
                    list="playerdb-names"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                  {suggestions.length > 0 && (
                    <div className="suggestion-row">
                      <span className="suggestion-label">
                        {nameInputLower ? 'Did you mean:' : 'Quick add:'}
                      </span>
                      {suggestions.map(s => (
                        <button
                          key={s.name}
                          type="button"
                          className="suggestion-chip"
                          onClick={() => fillFromMember(s)}
                        >
                          {s.name}{s.handicap != null && <span className="chip-hcp">{fmtH(s.handicap)}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  <input
                    className="input-field"
                    type="tel"
                    placeholder="Mobile (optional)"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    autoComplete="tel"
                    inputMode="tel"
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Handicap</label>
                        <a
                          href="https://hpa-polo.co.uk/hpa-search-tool/"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => copyNameForHpa(name, 'signup')}
                          title={name.trim() ? "Copies the name so you can paste it into the HPA member search" : "Open the HPA member search to find a handicap"}
                          style={{ fontSize: '11px', color: 'var(--burgundy)', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}
                        >
                          {hpaCopied === 'signup' ? 'Name copied — paste it in ↗' : 'Look up on HPA ↗'}
                        </a>
                      </div>
                      <select
                        className="input-field select-field"
                        value={handicap}
                        onChange={(e) => setHandicap(e.target.value)}
                      >
                        <option value="">Select…</option>
                        {HANDICAP_OPTIONS.map(h => (
                          <option key={h} value={h}>{fmtH(h)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '6px', letterSpacing: '1px', textTransform: 'uppercase' }}>Chukkas</label>
                      <input
                        className="input-field"
                        type="number"
                        placeholder={maxChukkasFor() <= 2 ? `1–${maxChukkasFor()}` : 'e.g. 3'}
                        min="1"
                        max={String(maxChukkasFor())}
                        value={fixedChukkasFor() ? String(fixedChukkasFor()) : chukkas}
                        onChange={(e) => setChukkas(e.target.value)}
                        inputMode="numeric"
                        disabled={!!fixedChukkasFor()}
                        readOnly={!!fixedChukkasFor()}
                        aria-describedby="chukkas-note"
                        style={fixedChukkasFor() ? { opacity: 0.6, cursor: 'not-allowed', background: 'var(--cream-pale)' } : undefined}
                      />
                      {(fixedChukkasFor() || activeDayConfig.maxChukkas) && (
                        <div id="chukkas-note" style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', lineHeight: 1.4 }}>
                          {activeDayConfig.sessionMins ? `${activeDayConfig.sessionMins}-minute session · ` : ''}
                          {fixedChukkasFor()
                            ? `everyone plays ${fixedChukkasFor()} chukkas`
                            : `max ${activeDayConfig.maxChukkas} chukkas`}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '6px', letterSpacing: '1px', textTransform: 'uppercase' }}>Available from</label>
                    <select
                      className="input-field select-field"
                      value={availableFrom || fmtTime(throwInMin)}
                      onChange={(e) => setAvailableFrom(e.target.value)}
                      aria-label="Earliest chukka you can play"
                    >
                      {(captainMode ? [0,1,2,3,4,5,6,7] : [0,1,2,3]).map(i => {
                        const t = fmtTime(throwInMin + i * CHUKKA_INTERVAL_MIN);
                        return (
                          <option key={t} value={t}>
                            {t}{i === 0 ? ' (throw-in)' : ''}
                          </option>
                        );
                      })}
                    </select>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', lineHeight: 1.4 }}>
                      Pick the earliest chukka you can be on the field. If fewer chukkas are available from then, your chukka count is reduced.
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: 'var(--muted)', display: 'block', marginBottom: '6px', letterSpacing: '1px', textTransform: 'uppercase' }}>Available to</label>
                    <select
                      className="input-field select-field"
                      value={availableTo}
                      onChange={(e) => setAvailableTo(e.target.value)}
                      aria-label="Latest chukka you can play"
                    >
                      <option value="">Stay until the end</option>
                      {(captainMode ? [0,1,2,3,4,5,6,7] : [4,5,6,7]).map(i => {
                        const t = fmtTime(throwInMin + i * CHUKKA_INTERVAL_MIN);
                        return (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        );
                      })}
                    </select>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px', lineHeight: 1.4 }}>
                      Pick the latest chukka you can stay for. Leave as "Stay until the end" if you've got no other plans.
                    </div>
                  </div>

                  {/* No consecutive — any player can set this for themselves.
                      Not offered on a fixed-length instructional session. */}
                  {!activeDayConfig.instructional && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: 'var(--ink)', padding: '14px', background: 'var(--cream-pale)', border: '1px solid var(--line)', borderRadius: '4px' }}>
                    <input
                      type="checkbox"
                      checked={noConsecutive}
                      onChange={(e) => setNoConsecutive(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--burgundy)', cursor: 'pointer', flexShrink: 0 }}
                    />
                    <div>
                      <span style={{ fontWeight: 600 }}>No consecutive chukkas</span>
                      <span style={{ color: 'var(--muted)', marginLeft: '6px', fontSize: '12px' }}>Always leaves a gap of at least one chukka between plays</span>
                    </div>
                  </label>
                  )}

                  {/* Pony hire — affects price (own-pony players leave unticked) */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: 'var(--ink)', padding: '14px', background: 'var(--cream-pale)', border: '1px solid var(--line)', borderRadius: '4px' }}>
                    <input
                      type="checkbox"
                      checked={ponyHire}
                      onChange={(e) => setPonyHire(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--burgundy)', cursor: 'pointer', flexShrink: 0 }}
                    />
                    <div>
                      <span style={{ fontWeight: 600 }}>Hire a pony</span>
                      <span style={{ color: 'var(--muted)', marginLeft: '6px', fontSize: '12px' }}>Adds pony hire to your cost. Leave unticked if you bring your own.</span>
                    </div>
                  </label>

                  {(() => {
                    const c = parseInt(chukkas, 10);
                    if (!name.trim() || !c || c < 1) return null;
                    const rec = playerDb.find(p => (p.name || '').trim().toLowerCase() === name.trim().toLowerCase());
                    const subject = rec || { membership: 'none', student: false, subsidies: [] };
                    const bd = priceBooking(subject, c, ponyHire ? 'club' : 'none');
                    return (
                      <div style={{ fontSize: '12px', color: bd.freeToRoster ? 'var(--burgundy)' : 'var(--ink)', padding: '10px 14px', background: 'var(--cream-pale)', border: '1px solid var(--line)', borderRadius: '4px', lineHeight: 1.5 }}>
                        {bd.freeToRoster
                          ? `No charge for ${c} chukka${c === 1 ? '' : 's'}${ponyHire ? '' : ' (own pony)'} — you'll be added to the roster.`
                          : <>Estimated cost: <strong>£{fmtMoney(bd.total)}</strong> for {c} chukka{c === 1 ? '' : 's'} ({ponyHire ? 'with pony hire' : 'no pony hire'}). Payable to the Captain.</>}
                        {!rec && <span style={{ color: 'var(--muted)' }}> (estimate assumes non-member rates)</span>}
                      </div>
                    );
                  })()}
                  {captainMode && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px', background: 'var(--cream-pale)', border: '1px solid var(--line)', borderRadius: '4px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '2px', fontFamily: "'Fraunces', serif", fontStyle: 'italic' }}>
                        Captain options
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: 'var(--ink)' }}>
                        <input
                          type="checkbox"
                          checked={vip}
                          onChange={(e) => setVip(e.target.checked)}
                          style={{ width: '18px', height: '18px', accentColor: 'var(--burgundy)', cursor: 'pointer', flexShrink: 0 }}
                        />
                        <div>
                          <span style={{ fontWeight: 600 }}>VIP</span>
                          <span style={{ color: 'var(--muted)', marginLeft: '6px', fontSize: '12px' }}>Placed first · chukka count never reduced below request</span>
                        </div>
                      </label>
                    </div>
                  )}

                  {error && (
                    <div style={{ fontSize: '13px', color: 'var(--danger)', padding: '10px 14px', background: '#fbf2f2', borderRadius: '4px', borderLeft: '3px solid var(--danger)' }}>
                      {error}
                    </div>
                  )}

                  {bookingMsg && (
                    <div style={{ fontSize: '13px', color: 'var(--burgundy)', padding: '10px 14px', background: 'var(--cream-pale)', borderRadius: '4px', borderLeft: '3px solid var(--gold)', lineHeight: 1.5 }}>
                      {bookingMsg}
                    </div>
                  )}

                  {(() => {
                    const hcpReason = captainMode ? '' : handicapBlockReason(handicap);
                    const closed = !captainMode && isBookingClosed();
                    const disabled = closed || !!hcpReason;
                    return (
                      <>
                        {/* Beginners-only notice — shown when the selected handicap is too high for this day */}
                        {hcpReason && (
                          <div
                            role="alert"
                            style={{
                              background: '#fef0ee', border: '1px solid #d27a6f', borderLeft: '4px solid var(--burgundy)',
                              borderRadius: '4px', padding: '12px 14px', fontSize: '13px', lineHeight: 1.55,
                            }}
                          >
                            <div style={{ fontWeight: 600, color: 'var(--burgundy)', marginBottom: '4px', fontFamily: "'Fraunces', serif", fontSize: '15px' }}>
                              Beginners only
                            </div>
                            {hcpReason}
                          </div>
                        )}
                        <button
                          className="btn-primary"
                          onClick={handleAdd}
                          disabled={disabled}
                          style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                        >
                          {closed ? 'Bookings closed · email captain'
                            : hcpReason ? 'Beginners only · handicap 0 and below'
                            : 'Add to Roster'}
                        </button>
                      </>
                    );
                  })()}
                  <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center', marginTop: '4px', lineHeight: 1.45 }}>
                    By signing up, you agree to your name, handicap and (if given) mobile number being used to organise the {activeDayConfig.fullLabel} chukkas.{' '}
                    <button
                      type="button"
                      onClick={() => setPrivacyOpen(true)}
                      style={{ background: 'none', border: 'none', padding: 0, color: 'var(--burgundy, #231F20)', cursor: 'pointer', textDecoration: 'underline', fontSize: '11px', fontFamily: 'inherit' }}
                    >
                      Privacy notice
                    </button>
                  </div>
                </div>
              </section>

              {/* Loading state — shown while the first data load is in flight, so
                  members see a spinner instead of a momentarily-empty roster. */}
              {!loaded && players.length === 0 && (
                <section style={{ marginBottom: '24px', textAlign: 'center', padding: '36px 20px' }}>
                  <div style={{
                    width: '34px', height: '34px', margin: '0 auto',
                    border: '3px solid var(--line)', borderTopColor: 'var(--burgundy)',
                    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                  }} />
                  <div className="display-italic" style={{ fontSize: '15px', color: 'var(--muted)', marginTop: '14px' }}>
                    Loading the roster…
                  </div>
                </section>
              )}

              {/* Roster */}
              {players.length > 0 && (
                <section style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div>
                      <div className="label-eyebrow">{activeDayConfig.fullLabel}'s field</div>
                      <h2 className="display" style={{ margin: '2px 0 0', fontSize: '22px' }}>Roster</h2>
                    </div>
                    {captainMode && (
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button onClick={sortByChukkas} style={{ background: 'none', border: 'none', fontSize: '11px', color: 'var(--muted)', cursor: 'pointer' }}>
                          sort ↓ chukkas
                        </button>
                        <button onClick={clearAll} style={{ background: 'none', border: 'none', fontSize: '11px', color: 'var(--muted)', cursor: 'pointer' }}>
                          clear
                        </button>
                      </div>
                    )}
                  </div>

                  {players.map((p, i) => {
                    // Build the availability label shown beneath the name.
                    const fromMin = p.availableFrom ? parseTime(p.availableFrom) : null;
                    const toMin = p.availableTo ? parseTime(p.availableTo) : null;
                    const isLateArriver = fromMin !== null && fromMin > throwInMin;
                    const hasEarlyFinish = toMin !== null && toMin !== undefined && p.availableTo !== '';
                    let availLabel = null;
                    if (isLateArriver && hasEarlyFinish) {
                      availLabel = `${p.availableFrom}–${p.availableTo}`;
                    } else if (isLateArriver) {
                      availLabel = `from ${p.availableFrom}`;
                    } else if (hasEarlyFinish) {
                      availLabel = `until ${p.availableTo}`;
                    }
                    const isEditingAvail = captainMode && editingAvailId === p.id;
                    return (
                      <div key={p.id} className="anim-in" style={{ animationDelay: `${i * 0.04}s`, borderBottom: '1px solid var(--line)' }}>
                        <div className="player-row" style={{ borderBottom: 'none' }}>
                          {/* Reorder handles — captain only */}
                          {captainMode && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginRight: '4px', flexShrink: 0 }}>
                              <button
                                onClick={() => movePlayer(p.id, -1)}
                                disabled={i === 0}
                                aria-label="Move up"
                                style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? 'var(--line)' : 'var(--muted)', fontSize: '13px', padding: '1px 4px', lineHeight: 1 }}
                              >▲</button>
                              <button
                                onClick={() => movePlayer(p.id, 1)}
                                disabled={i === players.length - 1}
                                aria-label="Move down"
                                style={{ background: 'none', border: 'none', cursor: i === players.length - 1 ? 'default' : 'pointer', color: i === players.length - 1 ? 'var(--line)' : 'var(--muted)', fontSize: '13px', padding: '1px 4px', lineHeight: 1 }}
                              >▼</button>
                            </div>
                          )}
                          <div className="handicap-badge">{fmtH(p.handicap)}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 500, fontSize: '16px', wordBreak: 'break-word' }}>{p.name}</div>
                            <div style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                              {availLabel && <span className="pref-tag">{availLabel}</span>}
                              {p.vip && <span style={{ fontSize: '10px', background: 'var(--gold)', color: 'var(--burgundy-deep)', padding: '1px 6px', borderRadius: '8px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>VIP</span>}
                              {p.noConsecutive && <span style={{ fontSize: '10px', background: 'var(--cream-warm)', color: 'var(--muted)', padding: '1px 6px', borderRadius: '8px', border: '1px solid var(--line)', letterSpacing: '0.3px' }}>no consec.</span>}
                              {p.ponyHire && !captainMode && <span style={{ fontSize: '10px', background: 'var(--burgundy)', color: '#fff', padding: '1px 6px', borderRadius: '8px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>🐴 Pony hire</span>}
                              {captainMode && (
                                <>
                                  <button
                                    type="button"
                                    title={p.ponyHire ? 'Hiring a pony — tap to remove' : 'Own pony — tap to add pony hire'}
                                    onClick={() => togglePonyHire(p.id)}
                                    style={{
                                      background: p.ponyHire ? 'var(--burgundy)' : 'transparent',
                                      border: '1px solid ' + (p.ponyHire ? 'var(--burgundy)' : 'var(--line)'),
                                      color: p.ponyHire ? '#fff' : 'var(--muted)',
                                      borderRadius: '10px', padding: '1px 7px',
                                      fontSize: '10px', fontWeight: 700,
                                      letterSpacing: '0.5px', textTransform: 'uppercase',
                                      cursor: 'pointer', flexShrink: 0,
                                    }}
                                  >{p.ponyHire ? '🐴 Pony hire' : '🐴 Own pony'}</button>
                                </>
                              )}
                              {captainMode && (
                                <>
                                  <button
                                    type="button"
                                    title={p.vip ? 'Remove VIP' : 'Mark as VIP'}
                                    onClick={() => toggleVip(p.id)}
                                    style={{
                                      background: p.vip ? 'var(--gold)' : 'transparent',
                                      border: '1px solid ' + (p.vip ? 'var(--gold)' : 'var(--line)'),
                                      color: p.vip ? 'var(--burgundy-deep)' : 'var(--muted)',
                                      borderRadius: '10px', padding: '1px 7px',
                                      fontSize: '10px', fontWeight: 700,
                                      letterSpacing: '0.5px', textTransform: 'uppercase',
                                      cursor: 'pointer', flexShrink: 0,
                                    }}
                                  >VIP</button>
                                  <button
                                    type="button"
                                    title={p.noConsecutive ? 'Remove no-consecutive' : 'Enable no-consecutive'}
                                    onClick={() => toggleNoConsecutive(p.id)}
                                    style={{
                                      background: p.noConsecutive ? 'var(--cream-warm)' : 'transparent',
                                      border: '1px solid var(--line)',
                                      color: p.noConsecutive ? 'var(--ink)' : 'var(--muted)',
                                      borderRadius: '10px', padding: '1px 7px',
                                      fontSize: '10px', letterSpacing: '0.3px',
                                      cursor: 'pointer', flexShrink: 0,
                                    }}
                                  >no⁻</button>
                                </>
                              )}
                              {captainMode && (
                                <button
                                  onClick={() => setEditingAvailId(isEditingAvail ? null : p.id)}
                                  aria-label={isEditingAvail ? 'Close availability editor' : 'Edit availability window'}
                                  style={{ background: 'none', border: 'none', padding: '0 2px', cursor: 'pointer', fontSize: '11px', color: isEditingAvail ? 'var(--burgundy)' : 'var(--muted)', lineHeight: 1 }}
                                >⏱</button>
                              )}
                              {p.mobile && captainMode && (
                                <>
                                  {(availLabel || true) && <span style={{ margin: '0 2px' }}>·</span>}
                                  <a href={`tel:${p.mobile.replace(/\s+/g, '')}`} className="phone-link" onClick={(e) => e.stopPropagation()}>
                                    {p.mobile}
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                          {captainMode ? (
                            <>
                              <div className="chukka-stepper" aria-label="Chukkas">
                                <button
                                  className="step-btn"
                                  onClick={() => adjustChukkas(p.id, -1)}
                                  disabled={p.chukkas <= 1}
                                  aria-label="Decrease chukkas"
                                >−</button>
                                <span className="step-count">{p.chukkas}</span>
                                <button
                                  className="step-btn"
                                  onClick={() => adjustChukkas(p.id, +1)}
                                  disabled={p.chukkas >= 8}
                                  aria-label="Increase chukkas"
                                >+</button>
                              </div>
                              <button className="remove-btn" onClick={() => { removePlayer(p.id); setEditingAvailId(null); }} aria-label={`Remove ${p.name}`}>×</button>
                            </>
                          ) : (
                            <div style={{ fontSize: '13px', color: 'var(--muted)', padding: '6px 10px', minWidth: '60px', textAlign: 'right' }}>
                              <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{p.chukkas}</span>
                              <span style={{ marginLeft: '4px' }}>chukka{p.chukkas === 1 ? '' : 's'}</span>
                            </div>
                          )}
                        </div>
                        {/* Inline availability editor — captain only, shown when ⏱ is tapped */}
                        {isEditingAvail && (
                          <div style={{ padding: '10px 14px 14px', background: 'var(--cream-pale)', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <div style={{ flex: '1 1 120px' }}>
                              <label style={{ fontSize: '10px', color: 'var(--muted)', display: 'block', marginBottom: '4px', letterSpacing: '1px', textTransform: 'uppercase' }}>Available from</label>
                              <select
                                className="input-field select-field"
                                style={{ fontSize: '13px', padding: '6px 8px' }}
                                value={p.availableFrom || fmtTime(throwInMin)}
                                onChange={(e) => updateAvail(p.id, 'availableFrom', e.target.value)}
                              >
                                {[0, 1, 2, 3, 4, 5, 6, 7].map(j => {
                                  const t = fmtTime(throwInMin + j * CHUKKA_INTERVAL_MIN);
                                  return <option key={t} value={t}>{t}{j === 0 ? ' (throw-in)' : ''}</option>;
                                })}
                              </select>
                            </div>
                            <div style={{ flex: '1 1 120px' }}>
                              <label style={{ fontSize: '10px', color: 'var(--muted)', display: 'block', marginBottom: '4px', letterSpacing: '1px', textTransform: 'uppercase' }}>Available to</label>
                              <select
                                className="input-field select-field"
                                style={{ fontSize: '13px', padding: '6px 8px' }}
                                value={p.availableTo || ''}
                                onChange={(e) => updateAvail(p.id, 'availableTo', e.target.value)}
                              >
                                <option value="">Until the end</option>
                                {[0, 1, 2, 3, 4, 5, 6, 7].map(j => {
                                  const t = fmtTime(throwInMin + j * CHUKKA_INTERVAL_MIN);
                                  return <option key={t} value={t}>{t}</option>;
                                })}
                              </select>
                            </div>
                            <button
                              onClick={() => setEditingAvailId(null)}
                              style={{ background: 'var(--burgundy)', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', flexShrink: 0 }}
                            >Done</button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {captainMode && (
                    <>
                      <button className="btn-primary" onClick={generate} disabled={players.length < 4} style={{ marginTop: '16px' }}>
                        {players.length < 4 ? 'Need 4+ Players' : 'Draw Schedule & Teams'}
                      </button>

                  <button
                    onClick={clearAll}
                    style={{
                      marginTop: '10px',
                      width: '100%',
                      background: 'transparent',
                      border: '1px solid rgba(107, 31, 42, 0.25)',
                      color: '#231F20',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 500,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(107, 31, 42, 0.06)'; e.currentTarget.style.borderColor = 'rgba(107, 31, 42, 0.45)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(107, 31, 42, 0.25)'; }}
                  >
                    Clear roster · start again
                  </button>
                    </>
                  )}
                </section>
              )}

              {/* Draw not yet published — members see a placeholder instead */}
              {schedule && !captainMode && !drawPublished[activeDay] && (
                <div style={{ textAlign: 'center', padding: '28px 20px', marginTop: '36px', background: 'var(--cream-pale)', border: '1px solid var(--line)', borderRadius: '6px' }}>
                  <div className="display" style={{ fontSize: '18px', color: 'var(--ink)', marginBottom: '6px' }}>The draw isn’t out yet</div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
                    You’re signed up. The {activeDayConfig.fullLabel} draw will appear here once the captain has published it.
                  </div>
                </div>
              )}

              {/* Schedule */}
              {schedule && (captainMode || drawPublished[activeDay]) && (
                <section ref={scheduleRef} className="reveal" style={{ marginTop: '36px' }}>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <h2 className="display" style={{ margin: '4px 0', fontSize: '26px' }}>{activeDayConfig.fullLabel} Chukkas</h2>
                    <div className="ornament">
                      <span className="ornament-line" />
                      <span className="ornament-dot" />
                      <span className="ornament-line" />
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                      <span className="display-italic">{schedule.numChukkas} chukkas</span>
                      {' · '}
                      {chukkaTime(0, throwInMin)} — {chukkaTime(schedule.numChukkas - 1, throwInMin)}
                      {' · '}
                      {schedule.totalSlots} player-slots
                      {ground ? <>{' · '}{ground}</> : null}
                    </div>
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <div className="view-toggle" role="tablist" aria-label="Schedule view">
                      <button
                        className={`view-toggle-btn ${scheduleView === 'cards' ? 'active' : ''}`}
                        onClick={() => setScheduleView('cards')}
                        role="tab"
                        aria-selected={scheduleView === 'cards'}
                      >
                        Cards
                      </button>
                      <button
                        className={`view-toggle-btn ${scheduleView === 'table' ? 'active' : ''}`}
                        onClick={() => setScheduleView('table')}
                        role="tab"
                        aria-selected={scheduleView === 'table'}
                      >
                        Table
                      </button>
                    </div>
                  </div>

                  {scheduleView === 'cards' && captainMode && (
                    <div className="edit-hint">
                      Tap × to remove a player from a chukka. Tap a name to swap teams or move them.
                    </div>
                  )}

                  {schedule.reduced && schedule.reduced.length > 0 && (
                    <div style={{ marginBottom: '14px', padding: '12px 14px', background: '#fdf4e6', border: '1px solid #e8d5a0', borderRadius: '4px', fontSize: '13px', color: '#8a5a1a' }}>
                      <strong>Reduced:</strong>{' '}
                      {schedule.reduced.map(r => `${r.player.name} (wanted ${r.requested}, playing ${r.given})`).join(', ')}
                      <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.85 }} className="display-italic">
                        Late signups give way to players who booked earlier.
                      </div>
                    </div>
                  )}

                  {schedule.capped && schedule.capped.length > 0 && (
                    <div style={{ marginBottom: '14px', padding: '12px 14px', background: '#fdf4e6', border: '1px solid #e8d5a0', borderRadius: '4px', fontSize: '13px', color: '#8a5a1a' }}>
                      <strong>Capped at {schedule.numChukkas}:</strong>{' '}
                      {schedule.capped.map(u => `${u.player.name} (wanted ${u.requested})`).join(', ')}
                      <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.85 }} className="display-italic">
                        Requested more chukkas than the evening has — playing all available.
                      </div>
                    </div>
                  )}

                  {scheduleView === 'cards' && schedule.chukkas.map((ck, idx) => {
                    const diff = Math.abs(ck.sumA - ck.sumB);
                    const teamAFour = ck.teamA.length;
                    const teamBFour = ck.teamB.length;
                    const tooFew = ck.playerCount < 4;

                    const renderPlayer = (p, teamClass) => {
                      const isActive = activePlayer && activePlayer.chukkaIdx === idx && activePlayer.playerId === p.id;
                      const onClick = captainMode
                        ? (e) => {
                            e.stopPropagation();
                            setActivePlayer(isActive ? null : { chukkaIdx: idx, playerId: p.id });
                            setAddingTo(null);
                          }
                        : undefined;
                      return (
                        <div
                          key={p.id}
                          className={`team-mini-row ${teamClass} ${isActive ? 'selected' : ''}`}
                          onClick={onClick}
                          style={captainMode ? undefined : { cursor: 'default' }}
                        >
                          <span className="hcp">{fmtH(p.handicap)}</span>
                          <span className="team-mini-name">{p.name}</span>
                          {captainMode && (
                            <button
                              className="chukka-remove"
                              onClick={(e) => { e.stopPropagation(); removeFromChukka(idx, p.id); }}
                              aria-label={`Remove ${p.name} from chukka ${ck.number}`}
                              title="Remove from this chukka"
                            >×</button>
                          )}
                        </div>
                      );
                    };

                    const isActionOpenHere = activePlayer && activePlayer.chukkaIdx === idx;
                    const activeP = isActionOpenHere
                      ? [...ck.teamA, ...ck.teamB].find(p => p.id === activePlayer.playerId)
                      : null;

                    const playerIdsInChukka = new Set([...ck.teamA, ...ck.teamB].map(p => p.id));
                    const availableToAdd = players.filter(p => !playerIdsInChukka.has(p.id));

                    return (
                      <div key={ck.idx} className={`chukka-card anim-in ${ck.isEarly ? 'early' : 'late'}`} style={{ animationDelay: `${idx * 0.06}s` }}>
                        <div className="chukka-head">
                          <div>
                            <div className="chukka-num">Chukka {ck.number}</div>
                            <div className="chukka-time">{ck.time}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div className="chukka-diff">
                              {ck.playerCount === 0 ? 'no players' : `${teamAFour}v${teamBFour} · Δ${diff}`}
                            </div>
                          </div>
                        </div>
                        {ck.playerCount > 0 ? (
                          <div className="chukka-body">
                            <div className="chukka-team">
                              <div className="team-mini-label">Blue</div>
                              <div className="team-mini-total" style={{ color: 'var(--blue)' }}>HCP {ck.sumA}</div>
                              {ck.teamA.map(p => renderPlayer(p, ''))}
                            </div>
                            <div className="chukka-team">
                              <div className="team-mini-label">White</div>
                              <div className="team-mini-total" style={{ color: 'var(--muted)' }}>HCP {ck.sumB}</div>
                              {ck.teamB.map(p => renderPlayer(p, 'white'))}
                            </div>

                            {activeP && captainMode && (
                              <div className="action-bar">
                                <span className="action-label">{activeP.name}:</span>
                                <button
                                  className="action-btn"
                                  onClick={() => swapPlayerTeam(idx, activeP.id)}
                                >Swap team</button>
                                <button
                                  className="action-btn danger"
                                  onClick={() => removeFromChukka(idx, activeP.id)}
                                >Remove</button>
                                <span style={{ flexBasis: '100%', height: 0 }} />
                                <span className="action-label">Move to →</span>
                                {schedule.chukkas.map((_, otherIdx) => (
                                  <button
                                    key={otherIdx}
                                    className="action-btn tiny"
                                    disabled={otherIdx === idx}
                                    onClick={() => movePlayerToChukka(idx, activeP.id, otherIdx)}
                                  >{otherIdx + 1}</button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--muted)' }} className="display-italic">
                            No players assigned to this chukka.
                          </div>
                        )}

                        {tooFew && ck.playerCount > 0 && (
                          <div className="chukka-warning">
                            {ck.playerCount} player{ck.playerCount === 1 ? '' : 's'} — plays as {teamAFour}v{teamBFour}.
                          </div>
                        )}

                        {/* Add player to chukka — captain only */}
                        {captainMode && availableToAdd.length > 0 && (
                          <div className="add-strip">
                            {addingTo === idx ? (
                              <>
                                <span className="action-label">Add to chukka {ck.number}:</span>
                                {availableToAdd.map(p => (
                                  <button
                                    key={p.id}
                                    className="add-pick"
                                    onClick={() => addToChukka(idx, p.id)}
                                  >
                                    {p.name} ({fmtH(p.handicap)})
                                  </button>
                                ))}
                                <button
                                  className="action-btn"
                                  onClick={() => setAddingTo(null)}
                                >Cancel</button>
                              </>
                            ) : (
                              <button
                                className="add-trigger"
                                onClick={() => { setAddingTo(idx); setActivePlayer(null); }}
                              >+ Add player to chukka {ck.number}</button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {scheduleView === 'table' && (() => {
                    const dateStr = getDateStr();
                    const sortedPlayers = [...players].sort((a, b) => b.handicap - a.handicap);
                    return (
                      <div className="captain-table-wrap">
                        <table className="captain-table">
                          <thead>
                            <tr>
                              <th colSpan={3} className="date-cell">{dateStr}</th>
                              {schedule.chukkas.map(ck => (
                                <th key={ck.idx} className="time-header">{ck.time}</th>
                              ))}
                            </tr>
                            <tr>
                              <th className="col-header">Name</th>
                              <th className="col-header">HCP</th>
                              <th className="col-header">C</th>
                              {schedule.chukkas.map(ck => (
                                <th key={ck.idx} className="chukka-header">Chukka {ck.number}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sortedPlayers.map(p => (
                              <tr key={p.id}>
                                <td className="name-cell">{p.name}</td>
                                <td>{fmtH(p.handicap)}</td>
                                <td>{p.chukkas}</td>
                                {schedule.chukkas.map(ck => {
                                  const inA = ck.teamA.find(x => x.id === p.id);
                                  const inB = ck.teamB.find(x => x.id === p.id);
                                  const cls = inA ? 'blue-cell' : inB ? 'white-cell' : 'empty-cell';
                                  return (
                                    <td key={ck.idx} className={cls}>
                                      {inA ? 'B' : inB ? 'W' : ''}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan={3} style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '6px 8px', textAlign: 'right', borderTop: '2px solid var(--line)' }}>Players</td>
                              {schedule.chukkas.map(ck => (
                                <td key={ck.idx} style={{ textAlign: 'center', fontWeight: 600, fontSize: '12px', color: 'var(--ink)', padding: '6px 4px', borderTop: '2px solid var(--line)', whiteSpace: 'nowrap' }}>
                                  {ck.teamA.length} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>vs</span> {ck.teamB.length}
                                </td>
                              ))}
                            </tr>
                          </tfoot>
                        </table>
                        <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center', marginTop: '4px', paddingBottom: '8px' }} className="display-italic">
                          B = Blue · W = White · Scroll sideways to see all chukkas
                        </div>
                      </div>
                    );
                  })()}

                  {captainMode && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '20px' }}>
                      <button className="wa-btn" onClick={publishToWhatsApp} style={{ padding: '14px', fontSize: '12px', width: '100%' }}>
                        📣 Share team sheet
                      </button>
                      <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--muted)' }} className="display-italic">
                        Pick <strong style={{ fontStyle: 'normal' }}>WhatsApp</strong> (not WhatsApp Business) from your share sheet, then choose the club group.
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                        <button className="btn-secondary" onClick={exportXLSX} style={{ width: '100%' }}>
                          📊 Export Excel
                        </button>
                        <button className="btn-secondary" onClick={exportPNG} style={{ width: '100%' }}>
                          🖼 Export PNG
                        </button>
                      </div>
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
                        <button
                          onClick={() => setPublished(!drawPublished[activeDay])}
                          className={drawPublished[activeDay] ? 'btn-secondary' : 'btn-primary'}
                          style={{ width: '100%' }}
                        >
                          {drawPublished[activeDay] ? '🙈 Unpublish draw' : '📣 Publish draw to players'}
                        </button>
                        <div style={{ fontSize: '11px', color: drawPublished[activeDay] ? 'var(--burgundy)' : 'var(--muted)', textAlign: 'center', marginTop: '6px', lineHeight: 1.45 }}>
                          {drawPublished[activeDay]
                            ? 'Players can see this draw.'
                            : 'Only you can see this draw. Publish it when you’re ready — redrawing hides it again.'}
                        </div>
                      </div>
                      <button className="btn-secondary" onClick={generate} style={{ width: '100%', marginTop: '12px' }}>
                        Redraw schedule
                      </button>
                      <button onClick={clearDraw} style={{ width: '100%', marginTop: '8px', background: 'none', border: 'none', color: 'var(--danger)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: '6px' }}>
                        Clear draw
                      </button>
                    </div>
                  )}
                </section>
              )}

              {loaded && players.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 20px 12px', color: 'var(--muted)' }}>
                  <div className="display-italic" style={{ fontSize: '20px', color: 'var(--ink)', marginBottom: '4px' }}>The field awaits.</div>
                  <div style={{ fontSize: '13px', marginBottom: '18px' }}>
                    {captainMode ? `Add the first rider to begin the ${activeDayConfig.fullLabel} draw.` : `Be the first to sign up for these ${activeDayConfig.fullLabel} chukkas.`}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── FIXTURES TAB ─── */}
          {activeTab === 'fixtures' && (
            <div className="reveal">
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <div className="label-eyebrow">Grass Season</div>
                <h2 className="display" style={{ margin: '2px 0 0', fontSize: '26px' }}>Fixtures 2026</h2>
                <div className="ornament">
                  <span className="ornament-line" />
                  <span className="ornament-dot" />
                  <span className="ornament-line" />
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', maxWidth: '400px', margin: '0 auto', lineHeight: 1.5 }}>
                  Tap a fixture to enter a team or register your interest, and see who else has signed up.
                </div>
                {totalRegistrations > 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--burgundy)', marginTop: '8px', fontWeight: 500 }}>
                    {totalRegistrations} {totalRegistrations === 1 ? 'registration' : 'registrations'} across the season
                  </div>
                )}
              </div>

              {captainMode && (
                <div style={{ maxWidth: '480px', margin: '0 auto 16px', border: '1px solid var(--line)', borderRadius: '6px', padding: '10px 12px' }}>
                  <div className="label-eyebrow" style={{ fontSize: '10px', marginBottom: '6px' }}>Tournament committee</div>
                  <input
                    className="input-field"
                    type="text"
                    placeholder={DEFAULT_COMMITTEE}
                    value={committeeDraft ?? committee}
                    onChange={e => setCommitteeDraft(e.target.value)}
                    onBlur={() => {
                      if (committeeDraft === null) return;
                      if (committeeDraft.trim() !== committee) saveCommittee(committeeDraft);
                      setCommitteeDraft(null);
                    }}
                    style={{ width: '100%', padding: '10px 12px', fontSize: '13px' }}
                  />
                  <div style={{ fontSize: '10px', color: 'var(--muted)', lineHeight: 1.45, marginTop: '6px' }}>
                    Printed on the rules page of every programme PDF. Separate names with commas, e.g.
                    {' '}<em>A. Smith, B. Jones &amp; C. Brown</em>. Leave blank to use the default list.
                  </div>
                </div>
              )}

              {captainMode && (
                <div style={{ maxWidth: '480px', margin: '0 auto 16px', border: '1px solid var(--line)', borderRadius: '6px', padding: '8px 12px' }}>
                  <button
                    onClick={recoverScoresFromBackups}
                    style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--burgundy)', fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer', padding: '4px' }}>
                    ↺ Recover match scores from backups
                  </button>
                  <div style={{ fontSize: '10px', color: 'var(--muted)', textAlign: 'center', lineHeight: 1.4, margin: '0 0 6px' }}>
                    Puts any missing match scores back from the saved history, matched by date, time &amp; teams. Anything that already has a score is left alone.
                  </div>
                  <div style={{ borderTop: '1px solid var(--line)', margin: '4px 0' }} />
                  <button
                    onClick={() => { const n = !showBackups; setShowBackups(n); if (n) loadBackups(); }}
                    style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--burgundy)', fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer', padding: '4px' }}>
                    {showBackups ? 'Hide backups' : '↺ Restore match details from backup'}
                  </button>
                  {showBackups && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px', lineHeight: 1.5 }}>
                        Backups save automatically whenever match details or scores change. Pick a point to roll back to — your current version is saved first, so a restore can itself be undone.
                      </div>
                      {backups.length === 0 ? (
                        <div style={{ fontSize: '12px', color: 'var(--muted)', padding: '6px 0' }}>No backups yet — they’ll appear here after the next change.</div>
                      ) : backups.map((b) => (
                        <div key={b.ts} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '6px 0', borderTop: '1px solid var(--line)' }}>
                          <div style={{ fontSize: '12px', color: 'var(--ink)' }}>
                            <div style={{ fontWeight: 600 }}>{new Date(b.ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                            <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{backupSummary(b.data)}</div>
                          </div>
                          <button onClick={() => restoreBackup(b)} style={{ background: 'var(--burgundy)', color: 'var(--cream)', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', cursor: 'pointer', whiteSpace: 'nowrap' }}>Restore</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {captainMode && (
                <div style={{ maxWidth: '480px', margin: '0 auto 16px', border: '1px solid var(--line)', borderRadius: '6px', padding: '8px 12px' }}>
                  <button
                    onClick={() => { setShowImport(v => !v); setImportMsg(''); }}
                    style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--burgundy)', fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer', padding: '4px' }}>
                    {showImport ? 'Hide import' : 'Import match details (paste JSON)'}
                  </button>
                  {showImport && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '8px', lineHeight: 1.5 }}>
                        Paste a match-details JSON block. Fixtures are matched by name (a new one is created if it doesn’t exist yet) and days are merged, so existing details aren’t lost. A backup is saved first, so this can be undone.
                      </div>
                      <textarea
                        value={importText}
                        onChange={e => setImportText(e.target.value)}
                        placeholder='{ "matches": [ … ] }'
                        style={{ width: '100%', minHeight: '120px', fontFamily: 'monospace', fontSize: '11px', padding: '8px', borderRadius: '4px', border: '1px solid var(--line)', boxSizing: 'border-box' }}
                      />
                      {importMsg && <div style={{ fontSize: '11px', color: 'var(--burgundy)', margin: '6px 0', lineHeight: 1.4 }}>{importMsg}</div>}
                      <button onClick={importMatchDetails} disabled={!importText.trim()} style={{ marginTop: '6px', background: 'var(--burgundy)', color: 'var(--cream)', border: 'none', padding: '8px 14px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', cursor: importText.trim() ? 'pointer' : 'default', opacity: importText.trim() ? 1 : 0.5 }}>Import</button>
                    </div>
                  )}
                </div>
              )}

              {captainMode && (
                <div style={{ maxWidth: '480px', margin: '0 auto 16px' }}>
                  {fixtureEditor && !fixtureEditor.id ? renderFixtureEditor() : (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={openAddFixture} style={{ flex: 1, background: 'var(--burgundy)', color: 'var(--cream)', border: 'none', padding: '10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>＋ Add fixture</button>
                      <button onClick={restoreOfficialFixtures} style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--muted)', padding: '10px 12px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' }}>↺ Official list</button>
                    </div>
                  )}
                </div>
              )}

              {ALL_MONTHS.filter(m => fixtures.some(f => f.month === m)).map(month => {
                const monthFixtures = fixtures.filter(f => f.month === month);
                if (monthFixtures.length === 0) return null;
                return (
                  <div key={month}>
                    <div className="month-header">
                      <span className="line" />
                      <span className="display" style={{ fontSize: '18px', color: 'var(--burgundy)' }}>{month}</span>
                      <span className="line" style={{ transform: 'scaleX(-1)' }} />
                    </div>

                    {monthFixtures.map((fx) => {
                      const registered = interest[fx.id] || [];
                      const teamsHere = teamSignups[fx.id] || [];
                      const fxDays = fixtureDays(fx);
                      const isExpanded = expandedId === fx.id;
                      return (
                        <div key={fx.id} data-fixture-id={fx.id} className={`fixture-card ${isExpanded ? 'expanded' : ''}`}>
                          <div className="fixture-header" onClick={() => toggleFixture(fx.id)}>
                            <div className="fixture-date">{fx.date}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="fixture-name">{fx.name}</div>
                              {fx.level && <div className="fixture-level">{fx.level}</div>}
                            </div>
                            <div className="fixture-meta">
                              {teamsHere.length > 0 ? (
                                <>
                                  <div className="fixture-count">{teamsHere.length}</div>
                                  <div>{teamsHere.length === 1 ? 'team' : 'teams'}</div>
                                </>
                              ) : registered.length > 0 ? (
                                <>
                                  <div className="fixture-count">{registered.length}</div>
                                  <div>signed up</div>
                                </>
                              ) : (
                                <div style={{ fontSize: '20px', color: 'var(--muted)', lineHeight: 1 }}>{isExpanded ? '−' : '+'}</div>
                              )}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="fixture-body reveal">
                              {fx.trophyKeeper && !(captainMode && fixtureDetails[fx.id]) && (
                                <div style={{ fontSize: '12px', color: 'var(--muted)', paddingTop: '12px', lineHeight: 1.4 }}>
                                  Trophy looked after by <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{fx.trophyKeeper}</span>
                                </div>
                              )}
                              {captainMode && (fixtureEditor?.id === fx.id ? (
                                <div style={{ paddingTop: '12px' }}>{renderFixtureEditor()}</div>
                              ) : (
                                <div style={{ paddingTop: '10px', textAlign: 'right' }}>
                                  <button onClick={() => openEditFixture(fx)} style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--burgundy)', padding: '5px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>✎ Edit fixture{fx.adhoc ? ' (ad hoc)' : ''}</button>
                                </div>
                              ))}
                              {/* ── Fixture match details ── */}
                              {(() => {
                                const det = fixtureDetails[fx.id];
                                const isEditingThis = captainMode && editingDetailsId === fx.id;
                                if (!det && !captainMode) return null;
                                // Members only see the draw once the captain publishes it.
                                if (det && !captainMode && !fx.detailsPublished) {
                                  return (
                                    <div style={{ textAlign: 'center', padding: '20px 16px', marginBottom: '14px', background: 'var(--cream-pale)', border: '1px solid var(--line)', borderRadius: '6px' }}>
                                      <div className="display" style={{ fontSize: '16px', color: 'var(--ink)', marginBottom: '4px' }}>The draw isn’t out yet</div>
                                      <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5 }}>
                                        Teams and times will appear here once the captain has published them.
                                      </div>
                                    </div>
                                  );
                                }
                                const fmtHcp = (h) => h === null || h === undefined ? '' : (h > 0 ? ' +' + h : h < 0 ? ' ' + h : ' 0');
                                return (
                                  <div style={{ marginBottom: '14px' }}>
                                    {!captainMode && det && (det.days || []).length > 0 && !isProgrammePublished(det) && (
                                      <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5, padding: '10px 12px', background: 'var(--cream-warm)', borderRadius: '6px', marginBottom: '10px' }}>
                                        The draw for this fixture is still being put together. It appears here as soon as the captain publishes it.
                                      </div>
                                    )}
                                    {det && det.days && (captainMode || isProgrammePublished(det)) && det.days.map((day, di) => (
                                      <div key={di} style={{ marginBottom: '18px' }}>
                                        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                                          <div style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--ink)', marginBottom: '2px' }}>{day.dateLabel}</div>
                                          {day.ground && <div style={{ fontSize: '12px', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--muted)' }}>{day.ground}</div>}
                                        </div>
                                        {(() => {
                                          const tmin = (raw) => {
                                            if (!raw || typeof raw !== 'string') return 1e9;
                                            const m = raw.trim().toLowerCase().match(/(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?/);
                                            if (!m) return 1e9;
                                            let h = parseInt(m[1], 10); const mn = m[2] ? parseInt(m[2], 10) : 0; const ap = m[3];
                                            if (ap === 'pm' && h < 12) h += 12;
                                            if (ap === 'am' && h === 12) h = 0;
                                            return h * 60 + mn;
                                          };
                                          const sched = [];
                                          (day.matches || []).forEach((match, mi) => sched.push({ kind: 'match', t: tmin(match.time), match, mi }));
                                          [day.prizegiving, day.prizegiving2, day.prizegiving3].forEach((pg, pi) => { if (pg) sched.push({ kind: 'prize', t: tmin(typeof pg === 'string' ? pg : ''), val: pg, pi }); });
                                          sched.forEach((it, i) => { it._i = i; });
                                          sched.sort((a, b) => a.t !== b.t ? a.t - b.t : a._i - b._i);
                                          return sched.map((it) => {
                                            if (it.kind === 'prize') {
                                              return (
                                                <div key={'pg' + it.pi} style={{ textAlign: 'center', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--line)' }}>
                                                  <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: '14px', textDecoration: 'underline', letterSpacing: '1px', color: 'var(--ink)', textTransform: 'uppercase' }}>
                                                    {typeof it.val === 'string' && it.val.trim() ? `${it.val} · Prizegiving` : 'Prizegiving'}
                                                  </div>
                                                </div>
                                              );
                                            }
                                            const match = it.match, mi = it.mi;
                                            return (
                                          <div key={mi} style={{ marginBottom: '14px', borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
                                            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                                              <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: '17px', textDecoration: 'underline', color: 'var(--ink)' }}>
                                                {match.time}{match.label ? ` ${match.label.toUpperCase()}` : ''}
                                              </div>
                                              {(match.teamA?.name || match.teamB?.name) && (
                                                <div style={{ fontWeight: 700, fontSize: '13px', letterSpacing: '0.5px', margin: '3px 0 2px', color: 'var(--ink)', textTransform: 'uppercase' }}>
                                                  {match.teamA?.name || 'TBC'} V {match.teamB?.name || 'TBC'}
                                                </div>
                                              )}
                                                {(match.scoreA != null || match.scoreB != null) && (() => {
                                                  const hsA = liveHeadStart(match, 'A');
                                                  const hsB = liveHeadStart(match, 'B');
                                                  const note = hsA > 0 ? `incl. +${fmtHalf(hsA)} on handicap to ${match.teamA?.name || 'Team A'}`
                                                             : hsB > 0 ? `incl. +${fmtHalf(hsB)} on handicap to ${match.teamB?.name || 'Team B'}`
                                                             : '';
                                                  return (
                                                    <>
                                                      <div style={{ fontWeight: 700, fontSize: '15px', letterSpacing: '0.5px', margin: '1px 0 2px', color: 'var(--burgundy)' }}>
                                                        {liveDisplayScore(match, 'A')} &ndash; {liveDisplayScore(match, 'B')}
                                                      </div>
                                                      {note && (
                                                        <div style={{ fontSize: '9px', color: 'var(--muted)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '3px' }}>{note}</div>
                                                      )}
                                                    </>
                                                  );
                                                })()}
                                              {match.umpires && (
                                                <div style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Umpires: {match.umpires}</div>
                                              )}
                                              {match.commentator && (
                                                <div style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Commentator: {match.commentator}</div>
                                              )}
                                              {match.goalJudges && (
                                                <div style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Goal judges: {match.goalJudges}</div>
                                              )}
                                              {match.timekeeper && (
                                                <div style={{ fontSize: '10px', color: 'var(--muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Timekeeper: {match.timekeeper}</div>
                                              )}
                                            </div>
                                            {((match.teamA?.players?.length > 0) || (match.teamB?.players?.length > 0)) && (
                                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
                                                {[match.teamA, match.teamB].map((team, ti) => team && (
                                                  <div key={ti} style={{ textAlign: 'center' }}>
                                                    <div style={{ fontWeight: 700, fontSize: '11px', letterSpacing: '0.3px', marginBottom: '3px', textTransform: 'uppercase' }}>
                                                      {team.name}{fmtHcp(team.handicap)}
                                                    </div>
                                                    {(team.players || []).map((pl, pi) => (
                                                      <div key={pi} style={{ fontSize: '11px', color: 'var(--ink)', lineHeight: 1.4 }}>
                                                        {pl.name}{fmtHcp(pl.handicap)}
                                                      </div>
                                                    ))}
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                            {match.notes && (
                                              <div style={{ fontSize: '10px', color: 'var(--muted)', textAlign: 'center', marginTop: '8px', fontStyle: 'italic', lineHeight: 1.5 }}>{match.notes}</div>
                                            )}
                                          </div>
                                              );
                                            });
                                        })()}
                                        {captainMode && det && (() => {
                                          const chukkaByDow = {};
                                          Object.values(DAY_CONFIG).forEach(cfg => {
                                            const sch = schedules[cfg.key];
                                            if (sch && sch.chukkas && sch.chukkas.length) chukkaByDow[cfg.dow] = { schedule: sch, throwInMin: throwInMins[cfg.key] };
                                          });
                                          const fail = (err) => alert('Could not generate PDF: ' + (err?.message || err));
                                          const solidBtn = { width: '100%', background: 'var(--burgundy)', color: 'var(--cream)', border: 'none', padding: '10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' };
                                          const outlineBtn = { ...solidBtn, background: 'transparent', color: 'var(--burgundy)', border: '1px solid var(--burgundy)' };
                                          const days = det.days || [];
                                          return (
                                            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                              <div style={{ paddingBottom: '10px', marginBottom: '2px', borderBottom: '1px solid var(--line)' }}>
                                                <button
                                                  onClick={() => saveFixtures(fixtures.map(f => f.id === fx.id ? { ...f, detailsPublished: !f.detailsPublished } : f))}
                                                  style={fx.detailsPublished ? outlineBtn : solidBtn}
                                                >
                                                  {fx.detailsPublished ? '🙈 Unpublish draw' : '📣 Publish draw to players'}
                                                </button>
                                                <div style={{ fontSize: '11px', color: fx.detailsPublished ? 'var(--burgundy)' : 'var(--muted)', textAlign: 'center', marginTop: '6px', lineHeight: 1.45 }}>
                                                  {fx.detailsPublished
                                                    ? 'Players can see this draw and follow it in Live Game.'
                                                    : 'Only you can see this draw. Build it, then publish when you’re ready.'}
                                                </div>
                                              </div>
                                              {days.map((day, dayIdx) => (
                                                <button key={dayIdx} onClick={async () => {
                                                  try {
                                                    // Single-day running-order programme: scores stripped so it prints clean.
                                                    const cleanDay = JSON.parse(JSON.stringify(day));
                                                    (cleanDay.matches || []).forEach(m => { m.scoreA = null; m.scoreB = null; });
                                                    await generateTournamentPdf(fx, det, chukkaByDow, { days: [cleanDay], subtitle: day.dateLabel || '', filenameDate: day.dateLabel || '', committee });
                                                  } catch (err) { fail(err); }
                                                }} style={outlineBtn}>
                                                  ↓ Day {dayIdx + 1} programme{day.dateLabel ? ` · ${day.dateLabel}` : ''}
                                                </button>
                                              ))}
                                              {days.length > 1 && (
                                                <button onClick={async () => {
                                                  try {
                                                    // Whole event in one document — same clean running order as the
                                                    // per-day programmes, every day back to back.
                                                    const cleanDays = days.map(day => {
                                                      const c = JSON.parse(JSON.stringify(day));
                                                      (c.matches || []).forEach(m => { m.scoreA = null; m.scoreB = null; });
                                                      return c;
                                                    });
                                                    await generateTournamentPdf(fx, det, chukkaByDow, { days: cleanDays, committee });
                                                  } catch (err) { fail(err); }
                                                }} style={outlineBtn}>
                                                  ↓ Full programme — all {days.length} days
                                                </button>
                                              )}
                                              <button onClick={async () => {
                                                try { await generateTournamentPdf(fx, det, {}, { resultsSummary: true, hideChukkas: true, committee }); }
                                                catch (err) { fail(err); }
                                              }} style={solidBtn}>
                                                ↓ Summary — all days with scores
                                              </button>
                                              {(det.days || []).some(d => (d.matches || []).some(m => (m.division || '').trim())) && (
                                                <button onClick={async () => {
                                                  try { await generateTournamentPdf(fx, det, {}, { divisionSheets: true, committee }); }
                                                  catch (err) { fail(err); }
                                                }} style={outlineBtn}>
                                                  ↓ Team sheets by division
                                                </button>
                                              )}
                                              <div style={{ marginTop: '4px' }}>
                                                <div className="label-eyebrow" style={{ fontSize: '10px', marginBottom: '4px' }}>Trophy looked after by</div>
                                                <input className="input-field" type="text" placeholder="Add the name once the trophy is won" value={trophyDraft[fx.id] ?? (fx.trophyKeeper || '')} onChange={e => setTrophyDraft(prev => ({ ...prev, [fx.id]: e.target.value }))} onBlur={() => { const d = trophyDraft[fx.id]; if (d === undefined) return; const val = d.trim(); if (val !== (fx.trophyKeeper || '')) saveFixtures(fixtures.map(f => f.id === fx.id ? { ...f, trophyKeeper: val } : f)); setTrophyDraft(prev => { const n = { ...prev }; delete n[fx.id]; return n; }); }} style={{ width: '100%', padding: '10px 12px', fontSize: '14px' }} />
                                              </div>
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    ))}
                                    {captainMode && !isEditingThis && (
                                      <button onClick={() => (isDesktop ? setBoardFixtureId(fx.id) : setEditingDetailsId(fx.id))} style={{ width: '100%', background: 'transparent', border: '1px dashed var(--line)', color: 'var(--muted)', padding: '7px', borderRadius: '4px', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer', marginBottom: '10px' }}>
                                        {isDesktop
                                          ? (det ? 'Open team board' : '+ Build the teams and draw')
                                          : (det ? 'Edit match details' : '+ Add match details')}
                                      </button>
                                    )}
                                    {isEditingThis && (() => {
                                      const draft = fixtureDetails[fx.id] || { days: [] };
                                      const setDraft = (next) => { saveFixtureDetails({ ...fixtureDetails, [fx.id]: next }); };
                                      const updDay = (di, updater) => { const days = draft.days.map((d,i) => i===di ? updater(d) : d); setDraft({...draft, days}); };
                                      const updMatch = (di, mi, updater) => { updDay(di, d => ({...d, matches: d.matches.map((m,i) => i===mi ? updater(m) : m)})); };
                                      const updTeam = (di, mi, tk, updater) => { updMatch(di, mi, m => ({...m, [tk]: updater(m[tk] || {})})); };
                                      // Nudge a match up/down the day's running order.
                                      const moveMatch = (di, mi, dir) => updDay(di, d => {
                                        const ms = [...(d.matches || [])];
                                        const j = mi + dir;
                                        if (j < 0 || j >= ms.length) return d;
                                        [ms[mi], ms[j]] = [ms[j], ms[mi]];
                                        return { ...d, matches: ms };
                                      });
                              // Combined team lookup: persisted teamsDb + teams in current draft days
                              const allTeams = (() => {
                                const map = { ...teamsDb };
                                (draft.days || []).forEach(day => {
                                  (day.matches || []).forEach(m => {
                                    ['teamA', 'teamB'].forEach(tk2 => {
                                      const t = m[tk2];
                                      if (t?.name?.trim()) {
                                        const k = t.name.trim().toLowerCase();
                                        if (!map[k] || (t.players?.length && (!map[k].players?.length))) {
                                          map[k] = { name: t.name.trim(), handicap: t.handicap ?? null, players: cleanSquad(t.players) };
                                        }
                                      }
                                    });
                                  });
                                });
                                return map;
                              })();
                                      // Teams that have signed up for THIS fixture — folded into the team
                                      // picker below so the captain can draw matches straight from sign-ups.
                                      const enteredTeams = teamSignups[fx.id] || [];
                                      const squadForDay = (signup, dayObj) => {
                                        const sd = signup.days || {};
                                        if (dayObj?.id && sd[dayObj.id]) return sd[dayObj.id];
                                        const lbl = (dayObj?.dateLabel || '').toLowerCase();
                                        const byLabel = Object.keys(sd).find(k => {
                                          const full = WEEKDAY_FULL[k.replace(/\d+$/, '')];
                                          return full && lbl.includes(full.toLowerCase());
                                        });
                                        if (byLabel) return sd[byLabel];
                                        return Object.values(sd).reduce((best, arr) => (arr && arr.length > best.length ? arr : best), []);
                                      };
                                      // One-tap scaffold: create a day block per fixture day (pre-labelled and
                                      // keyed so the day-aware fill matches automatically), pairing the entered
                                      // teams into draft matches with their per-day squads dropped in.
                                      const buildDaysFromEntered = () => {
                                        if (!enteredTeams.length) return;
                                        const fxd = fixtureDays(fx);
                                        const hasContent = (draft.days || []).some(d => (d.matches || []).length > 0 || (d.dateLabel || '').trim() || (d.ground || '').trim());
                                        if (hasContent && !window.confirm('Replace the current match details with days and matches built from the entered teams? Your current version is saved to backups first, so you can undo from the Fixtures screen.')) return;
                                        const START_MIN = 10 * 60; // first match 10:00
                                        const STEP_MIN = 75;        // 1h15 between matches
                                        const mkTeam = (s, d) => s
                                          ? { name: s.team, handicap: s.handicap ?? null, players: cleanSquad(squadForDay(s, { id: d.key, dateLabel: d.label })) }
                                          : { name: 'TBC', handicap: null, players: [] };
                                        const newDays = fxd.map(d => {
                                          const matches = [];
                                          for (let i = 0; i < enteredTeams.length; i += 2) {
                                            matches.push({
                                              id: 'm' + Date.now() + '-' + d.key + '-' + i + '-' + Math.random().toString(36).slice(2, 6),
                                              time: fmtTime(START_MIN + matches.length * STEP_MIN),
                                              label: '',
                                              teamA: mkTeam(enteredTeams[i], d),
                                              teamB: mkTeam(enteredTeams[i + 1], d),
                                              chukkas: 4, umpires: '', commentator: '', goalJudges: '', timekeeper: '', notes: '',
                                            });
                                          }
                                          return { id: d.key, dateLabel: d.label, ground: '', matches, prizegiving: false };
                                        });
                                        if (newDays.length) newDays[newDays.length - 1].prizegiving = true;
                                        writeBackup(fixtureDetails); // snapshot current state first so this is undoable
                                        setDraft({ ...draft, days: newDays });
                                      };
                                      return (
                                        <div style={{ background: 'var(--cream-pale)', border: '1px solid var(--line)', borderRadius: '6px', padding: '14px', marginBottom: '14px' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <div className="label-eyebrow" style={{ fontSize: '10px' }}>Match details</div>
                                            <button onClick={() => setEditingDetailsId(null)} style={{ background: 'none', border: 'none', fontSize: '20px', color: 'var(--muted)', cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
                                          </div>
                                          {enteredTeams.length > 0 && (
                                            <button onClick={buildDaysFromEntered} style={{ width: '100%', background: 'var(--burgundy)', color: 'var(--cream)', border: 'none', padding: '10px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', cursor: 'pointer', marginBottom: '12px' }}>
                                              ⚡ Build {fixtureDays(fx).length > 1 ? `${fixtureDays(fx).length} days` : 'day'} from {enteredTeams.length} entered team{enteredTeams.length === 1 ? '' : 's'}
                                            </button>
                                          )}
                                          {(draft.days || []).map((day, di) => (
                                            <div key={di} style={{ background: 'white', border: '1px solid var(--line)', borderRadius: '4px', padding: '10px', marginBottom: '10px' }}>
                                              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', alignItems: 'center' }}>
                                                <input className="input-field" placeholder="Day label e.g. Saturday 30th May" value={day.dateLabel || ''} onChange={e => updDay(di, d => ({...d, dateLabel: e.target.value}))} style={{ flex: 2, padding: '7px 10px', fontSize: '12px' }} />
                                                <select className="input-field select-field" value={day.ground || ''} onChange={e => updDay(di, d => ({...d, ground: e.target.value}))} style={{ flex: 1, padding: '7px 10px', fontSize: '12px' }}>
                                                  <option value="">Ground…</option>
                                                  {GROUND_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                                                </select>
                                                <button onClick={() => { const days = draft.days.filter((_,i) => i!==di); setDraft({...draft, days}); }} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '18px', cursor: 'pointer', flexShrink: 0, lineHeight: 1, padding: '0 4px' }}>×</button>
                                              </div>
                                              {[
                                                { field: 'prizegiving',  label: 'Prizegiving',     ph: 'Time e.g. 14:00 (optional)' },
                                                { field: 'prizegiving2', label: '2nd prizegiving', ph: 'Time e.g. 15:00 (optional)' },
                                                { field: 'prizegiving3', label: '3rd prizegiving', ph: 'Time e.g. 16:00 (optional)' },
                                              ].map(({ field, label, ph }) => (
                                                <div key={field} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', flexShrink: 0 }}>
                                                    <input type="checkbox" checked={!!day[field]} onChange={e => updDay(di, d => ({...d, [field]: e.target.checked ? (typeof d[field] === 'string' && d[field].trim() ? d[field] : true) : false}))} style={{ width: '16px', height: '16px', accentColor: 'var(--burgundy)' }} />
                                                    {label}
                                                  </label>
                                                  {!!day[field] && (
                                                    <input className="input-field" placeholder={ph} value={typeof day[field] === 'string' ? day[field] : ''} onChange={e => updDay(di, d => ({...d, [field]: e.target.value}))} style={{ flex: 1, minWidth: '140px', padding: '5px 8px', fontSize: '12px' }} />
                                                  )}
                                                </div>
                                              ))}
                                              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '11px', color: 'var(--ink)', cursor: 'pointer', userSelect: 'none', background: 'var(--cream-pale)', border: '1px solid var(--line)', borderRadius: '4px', padding: '8px 10px', margin: '2px 0 8px' }}>
                                                <input type="checkbox" checked={!!day.teamSheet} onChange={e => updDay(di, d => ({...d, teamSheet: e.target.checked}))} style={{ width: '16px', height: '16px', accentColor: 'var(--burgundy)', flexShrink: 0, marginTop: '1px' }} />
                                                <span>
                                                  <span style={{ fontWeight: 600 }}>Draw still TBC — print this day as a team sheet</span>
                                                  <span style={{ color: 'var(--muted)', display: 'block', lineHeight: 1.45, marginTop: '2px' }}>
                                                    Teams &amp; players grouped into divisions (from the Div box on each match), no times or running order. Any prizegiving is printed at the end.
                                                  </span>
                                                </span>
                                              </label>
                                              {(day.matches || []).map((match, mi) => (
                                                <div key={mi} style={{ background: 'var(--cream-pale)', border: '1px solid var(--line)', borderRadius: '4px', padding: '8px', marginBottom: '6px' }}>
                                                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: 'var(--muted)', marginBottom: '6px', cursor: 'pointer', userSelect: 'none' }}>
                                                    <input type="checkbox" checked={!!match.pageBreakBefore} onChange={e => updMatch(di, mi, m => ({...m, pageBreakBefore: e.target.checked}))} style={{ width: '14px', height: '14px', accentColor: 'var(--burgundy)' }} />
                                                    Start this match on a new page in the PDF
                                                  </label>
                                                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: 'var(--muted)', marginBottom: '6px', cursor: 'pointer', userSelect: 'none' }}>
                                                    <input type="checkbox" checked={!!match.teamListOnly} onChange={e => updMatch(di, mi, m => ({...m, teamListOnly: e.target.checked}))} style={{ width: '14px', height: '14px', accentColor: 'var(--burgundy)' }} />
                                                    Team list only — hide the “A v B” lines. Label becomes the heading, e.g. “Division 1”
                                                  </label>
                                                  <div style={{ display: 'flex', gap: '6px', marginBottom: '5px' }}>
                                                    <input className="input-field" placeholder="Time" value={match.time || ''} onChange={e => updMatch(di, mi, m => ({...m, time: e.target.value}))} style={{ width: '52px', padding: '5px 4px', fontSize: '11px', textAlign: 'center' }} />
                                                    <input className="input-field" type="number" min="1" placeholder="Ch" title="Chukkas in this match (used for the handicap goal start)" value={match.chukkas ?? ''} onChange={e => updMatch(di, mi, m => ({...m, chukkas: e.target.value === '' ? null : Math.max(1, parseInt(e.target.value, 10) || 1)}))} style={{ width: '34px', padding: '5px 2px', fontSize: '11px', textAlign: 'center' }} />
                                                    <input className="input-field" placeholder="Div" title="Division, e.g. I, II, III — groups this match's teams on the 'Team sheets by division' PDF. Order in the list doesn't matter." value={match.division || ''} onChange={e => updMatch(di, mi, m => ({...m, division: e.target.value}))} style={{ width: '38px', padding: '5px 2px', fontSize: '11px', textAlign: 'center' }} />
                                                    <input className="input-field" placeholder="Label e.g. Final" value={match.label || ''} onChange={e => updMatch(di, mi, m => ({...m, label: e.target.value}))} style={{ flex: 1, minWidth: 0, padding: '6px 8px', fontSize: '15px', fontWeight: 600 }} />
                                                    <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, gap: '1px' }}>
                                                      <button onClick={() => moveMatch(di, mi, -1)} disabled={mi === 0} title="Move up" style={{ background: 'none', border: 'none', color: mi === 0 ? 'var(--line)' : 'var(--burgundy)', fontSize: '10px', cursor: mi === 0 ? 'default' : 'pointer', lineHeight: 1, padding: '1px 3px' }}>▲</button>
                                                      <button onClick={() => moveMatch(di, mi, 1)} disabled={mi === (day.matches || []).length - 1} title="Move down" style={{ background: 'none', border: 'none', color: mi === (day.matches || []).length - 1 ? 'var(--line)' : 'var(--burgundy)', fontSize: '10px', cursor: mi === (day.matches || []).length - 1 ? 'default' : 'pointer', lineHeight: 1, padding: '1px 3px' }}>▼</button>
                                                    </div>
                                                    <button onClick={() => { const matches = day.matches.filter((_,i) => i!==mi); updDay(di, d => ({...d, matches})); }} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '16px', cursor: 'pointer', flexShrink: 0, lineHeight: 1, padding: '0 2px' }}>×</button>
                                                  </div>
                                                  <input className="input-field" placeholder="Umpires" value={match.umpires || ''} onChange={e => updMatch(di, mi, m => ({...m, umpires: e.target.value}))} style={{ width: '100%', padding: '5px 7px', fontSize: '12px', marginBottom: '5px' }} />
                                                  <input className="input-field" placeholder="Commentator" value={match.commentator || ''} onChange={e => updMatch(di, mi, m => ({...m, commentator: e.target.value}))} style={{ width: '100%', padding: '5px 7px', fontSize: '12px', marginBottom: '5px' }} />
                                                  <div style={{ display: 'flex', gap: '6px', marginBottom: '5px' }}>
                                                    <input className="input-field" placeholder="Goal judges" value={match.goalJudges || ''} onChange={e => updMatch(di, mi, m => ({...m, goalJudges: e.target.value}))} style={{ flex: 1, minWidth: 0, padding: '5px 7px', fontSize: '12px' }} />
                                                    <input className="input-field" placeholder="Timekeeper" value={match.timekeeper || ''} onChange={e => updMatch(di, mi, m => ({...m, timekeeper: e.target.value}))} style={{ flex: 1, minWidth: 0, padding: '5px 7px', fontSize: '12px' }} />
                                                  </div>
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                                                    <span style={{ fontSize: '11px', color: 'var(--burgundy)', fontWeight: 600, minWidth: '40px' }}>Score</span>
                                                    <input className="input-field" type="number" step="0.5" placeholder="A" value={match.scoreA ?? ''} onChange={e => updMatch(di, mi, m => ({...m, scoreA: e.target.value === '' ? null : Number(e.target.value)}))} style={{ width: '56px', padding: '5px 7px', fontSize: '12px', textAlign: 'center' }} />
                                                    <span style={{ fontSize: '12px', color: '#999' }}>vs</span>
                                                    <input className="input-field" type="number" step="0.5" placeholder="B" value={match.scoreB ?? ''} onChange={e => updMatch(di, mi, m => ({...m, scoreB: e.target.value === '' ? null : Number(e.target.value)}))} style={{ width: '56px', padding: '5px 7px', fontSize: '12px', textAlign: 'center' }} />
                                                  </div>
                                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '4px' }}>
                                                    {[['teamA', 'Team A'], ['teamB', 'Team B']].map(([tk, tl]) => {
                                                      const team = match[tk] || { name: '', handicap: null, players: [] };
                                                      return (
                                                        <div key={tk}>
                                                          <div style={{ display: 'flex', gap: '4px', marginBottom: '3px' }}>
                                                            <div style={{ position: 'relative', flex: 1 }}>
                                                              <input
                                                                className="input-field"
                                                                placeholder={tl + ' name'}
                                                                value={team.name || ''}
                                                                autoComplete="off"
                                                                autoCorrect="off"
                                                                autoCapitalize="words"
                                                                spellCheck={false}
                                                                onChange={e => {
                                                                  const val = e.target.value;
                                                                  updTeam(di, mi, tk, t => ({...t, name: val, _teamSugOpen: true}));
                                                                }}
                                                                onFocus={() => updTeam(di, mi, tk, t => ({...t, _teamSugOpen: true}))}
                                                                onBlur={() => setTimeout(() => updTeam(di, mi, tk, t => ({...t, _teamSugOpen: false})), 150)}
                                                                style={{ width: '100%', padding: '6px 8px', fontSize: '13px', boxSizing: 'border-box' }}
                                                              />
                                                              {team._teamSugOpen && (() => {
                                                                const q = (team.name || '').trim().toLowerCase();
                                                                const entered = enteredTeams.filter(s => !q || s.team.toLowerCase().includes(q));
                                                                const enteredNames = new Set(entered.map(s => s.team.toLowerCase()));
                                                                const hits = Object.values(allTeams).filter(t => q && t.name.toLowerCase().includes(q) && t.name.toLowerCase() !== q && !enteredNames.has(t.name.toLowerCase()));
                                                                if (!entered.length && !hits.length) return null;
                                                                return (
                                                                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid var(--line)', borderRadius: '3px', zIndex: 99, maxHeight: '180px', overflowY: 'auto', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                                                                    {entered.map(s => {
                                                                      const squad = squadForDay(s, day);
                                                                      return (
                                                                        <div key={'e' + s.id}
                                                                          onMouseDown={e => { e.preventDefault(); updTeam(di, mi, tk, tt => ({...tt, name: s.team, handicap: s.handicap ?? tt.handicap, players: cleanSquad(squad), _teamSugOpen: false})); }}
                                                                          style={{ padding: '6px 8px', fontSize: '11px', cursor: 'pointer', borderBottom: '1px solid var(--line)', lineHeight: 1.3, background: 'var(--cream-warm)' }}
                                                                          onMouseEnter={e => e.currentTarget.style.background='var(--cream)'}
                                                                          onMouseLeave={e => e.currentTarget.style.background='var(--cream-warm)'}
                                                                        >
                                                                          <span style={{ fontWeight: 600 }}>{s.team}</span>
                                                                          <span style={{ fontSize: '8px', color: 'var(--cream)', background: 'var(--burgundy)', borderRadius: '3px', padding: '1px 5px', marginLeft: '6px', textTransform: 'uppercase', letterSpacing: '0.5px', verticalAlign: 'middle' }}>Entered</span>
                                                                          {squad?.length ? <span style={{ color: 'var(--muted)', marginLeft: '4px' }}>{squad.map(p => p.name).join(', ')}</span> : null}
                                                                        </div>
                                                                      );
                                                                    })}
                                                                    {hits.map(t => (
                                                                      <div key={t.name}
                                                                        onMouseDown={e => { e.preventDefault(); updTeam(di, mi, tk, tt => ({...tt, name: t.name, handicap: t.handicap ?? tt.handicap, players: cleanSquad(t.players), _teamSugOpen: false})); }}
                                                                        style={{ padding: '6px 8px', fontSize: '11px', cursor: 'pointer', borderBottom: '1px solid var(--line)', lineHeight: 1.3 }}
                                                                        onMouseEnter={e => e.currentTarget.style.background='var(--cream)'}
                                                                        onMouseLeave={e => e.currentTarget.style.background='white'}
                                                                      >
                                                                        <span style={{ fontWeight: 600 }}>{t.name}</span>
                                                                        {t.players?.length ? <span style={{ color: 'var(--muted)', marginLeft: '4px' }}>{t.players.map(p=>p.name).join(', ')}</span> : null}
                                                                      </div>
                                                                    ))}
                                                                  </div>
                                                                );
                                                              })()}
                                                            </div>
                                                            <input className="input-field" placeholder="HCP" type="number" value={team.handicap !== null && team.handicap !== undefined ? team.handicap : ''} onChange={e => updTeam(di, mi, tk, t => ({...t, handicap: e.target.value === '' ? null : parseInt(e.target.value, 10)}))} style={{ width: '34px', padding: '4px 2px', fontSize: '10px', textAlign: 'center' }} />
                                                          </div>
                                                          {(team.players || []).map((pl, pi) => (
                                                            <div key={pi} style={{ display: 'flex', gap: '2px', marginBottom: '2px' }}>
                                                              <input className="input-field" list="playerdb-names" placeholder="Name" value={pl.name || ''} onChange={e => { const v = e.target.value; const rec = !v.includes('/') ? playerDb.find(x => (x.name || '').trim().toLowerCase() === v.trim().toLowerCase()) : null; updTeam(di, mi, tk, t => ({...t, players: t.players.map((p,i) => i===pi ? {...p, name: v, ...(rec && rec.handicap != null ? { handicap: rec.handicap } : {})} : p)})); }} style={{ flex: 1, minWidth: 0, padding: '4px 6px', fontSize: '12px' }} />
                                                              <input className="input-field" placeholder="HCP" type="number" value={pl.handicap !== null && pl.handicap !== undefined ? pl.handicap : ''} onChange={e => updTeam(di, mi, tk, t => ({...t, players: t.players.map((p,i) => i===pi ? {...p, handicap: e.target.value === '' ? null : parseInt(e.target.value, 10)} : p)}))} style={{ width: '28px', padding: '4px 1px', fontSize: '10px', textAlign: 'center' }} />
                                                              <input className="input-field" placeholder="G" type="number" step="0.5" value={pl.goals !== null && pl.goals !== undefined ? pl.goals : ''} onChange={e => updTeam(di, mi, tk, t => ({...t, players: t.players.map((p,i) => i===pi ? {...p, goals: e.target.value === '' ? null : parseFloat(e.target.value, 10)} : p)}))} style={{ width: '28px', padding: '4px 1px', fontSize: '10px', textAlign: 'center' }} />
                                                              <button onClick={() => updTeam(di, mi, tk, t => ({...t, players: t.players.filter((_,i) => i!==pi)}))} style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: '13px', cursor: 'pointer', lineHeight: 1, padding: '0 1px' }}>×</button>
                                                            </div>
                                                          ))}
                                                          {(team.players||[]).length < MAX_MATCH_PLAYERS && (<button onClick={() => updTeam(di, mi, tk, t => ((t.players||[]).length >= MAX_MATCH_PLAYERS ? t : {...t, players: [...(t.players||[]), {name:'', handicap: null}]}))} style={{ background: 'none', border: 'none', color: 'var(--burgundy)', fontSize: '10px', cursor: 'pointer', letterSpacing: '0.3px', padding: '1px 0' }}>+ player</button>)}
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                  <textarea className="input-field" placeholder="Notes…" value={match.notes || ''} onChange={e => updMatch(di, mi, m => ({...m, notes: e.target.value}))} style={{ width: '100%', padding: '5px 7px', fontSize: '10px', minHeight: '44px', resize: 'vertical' }} />
                                                </div>
                                              ))}
                                              {di > 0 && (draft.days[0]?.matches || []).length > 0 && (
                                                <button onClick={() => {
                                                  const srcDay = draft.days[0];
                                                  const copiedMatches = (srcDay.matches || []).map(m => ({
                                                    ...m,
                                                    id: 'm' + Date.now() + Math.random(),
                                                    time: '',
                                                    label: '',
                                                    chukkas: 4, umpires: '', commentator: '', goalJudges: '', timekeeper: '',
                                                    teamA: { name: m.teamA?.name || '', handicap: m.teamA?.handicap ?? null, players: cleanSquad(m.teamA?.players) },
                                                    teamB: { name: m.teamB?.name || '', handicap: m.teamB?.handicap ?? null, players: cleanSquad(m.teamB?.players) },
                                                  }));
                                                  updDay(di, d => ({...d, matches: copiedMatches}));
                                                }} style={{ width: '100%', background: 'transparent', border: '1px dashed var(--burgundy)', color: 'var(--burgundy)', padding: '5px', borderRadius: '3px', fontSize: '10px', cursor: 'pointer', letterSpacing: '0.5px', marginBottom: '2px', opacity: 0.75 }}>↩ Copy teams from Day 1</button>
                                              )}
                                              <button onClick={() => updDay(di, d => ({...d, matches: [...(d.matches||[]), {id:'m'+Date.now(), time:'', label:'', teamA:{name:'', handicap:null, players:[]}, teamB:{name:'', handicap:null, players:[]}, chukkas:4, umpires:'', commentator:'', goalJudges:'', timekeeper:'', notes:''}]}))} style={{ width: '100%', background: 'transparent', border: '1px dashed var(--line)', color: 'var(--muted)', padding: '5px', borderRadius: '3px', fontSize: '10px', cursor: 'pointer', letterSpacing: '0.5px', marginBottom: '2px' }}>+ Add match</button>
                                            </div>
                                          ))}
                                          <button onClick={() => setDraft({...draft, days: [...(draft.days||[]), {id:'d'+Date.now(), dateLabel:'', ground:'', matches:[], prizegiving:false}]})} style={{ width: '100%', background: 'transparent', border: '1px dashed var(--line)', color: 'var(--muted)', padding: '7px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>+ Add day</button>
                                          <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => { persistTeamsFromDetails(fixtureDetails); setEditingDetailsId(null); }} style={{ flex: 1, background: 'var(--burgundy)', color: 'var(--cream)', border: 'none', padding: '10px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>Done</button>
                                            {det && <button onClick={async () => { if (!window.confirm(`Delete all match details for “${fx.name}”? They’ll be saved to backups first, so you can restore them from the Fixtures screen.`)) return; await writeBackup(fixtureDetails); const next = { ...fixtureDetails }; delete next[fx.id]; saveFixtureDetails(next); setEditingDetailsId(null); }} style={{ background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)', padding: '10px 14px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Clear</button>}
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                );
                              })()}

                              {/* ── Tournament team sign-up ── */}
                              <div style={{ paddingTop: '10px' }}>
                                <div className="label-eyebrow" style={{ fontSize: '10px', marginBottom: '6px' }}>Teams Entered</div>
                                {teamsHere.length === 0 ? (
                                  <div className="display-italic" style={{ fontSize: '13px', color: 'var(--muted)', padding: '2px 0 6px' }}>
                                    No teams entered yet.
                                  </div>
                                ) : teamsHere.map(s => (
                                  <div key={s.id} className="team-entry">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      {s.handicap != null && <div className="mini-badge">{fmtH(s.handicap)}</div>}
                                      <div style={{ fontWeight: 600, fontSize: '15px', flex: 1, minWidth: 0 }}>{s.team}</div>
                                      {captainMode && (
                                        <button className="remove-btn" onClick={() => removeTeam(fx.id, s.id)} aria-label={`Remove ${s.team}`} style={{ fontSize: '18px' }}>×</button>
                                      )}
                                    </div>
                                    {(() => {
                                      if (!s.perDay) {
                                        const squad = s.days[fxDays[0].key] || [];
                                        return (
                                          <div className="squad-line">
                                            {fxDays.length > 1 && <span className="squad-day">Both days</span>}
                                            {squad.length === 0
                                              ? <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Squad TBC</span>
                                              : squad.map((p, i) => <span key={i} className="squad-chip">{p.name}{p.handicap != null && <em>{fmtH(p.handicap)}</em>}</span>)}
                                          </div>
                                        );
                                      }
                                      return fxDays.map(d => (
                                        <div key={d.key} className="squad-line">
                                          <span className="squad-day">{d.label}</span>
                                          {(s.days[d.key] || []).length === 0
                                            ? <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Squad TBC</span>
                                            : (s.days[d.key] || []).map((p, i) => <span key={i} className="squad-chip">{p.name}{p.handicap != null && <em>{fmtH(p.handicap)}</em>}</span>)}
                                        </div>
                                      ));
                                    })()}
                                    {captainMode && s.contact && (
                                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '6px' }}>
                                        Captain: {s.contact}
                                        {s.mobile && <> · <a href={`tel:${s.mobile.replace(/\s+/g, '')}`} className="phone-link" onClick={(e) => e.stopPropagation()}>{s.mobile}</a></>}
                                      </div>
                                    )}
                                  </div>
                                ))}

                                {!isTournamentActive(fx) && (showTeamForm ? (
                                  <div className="register-form" style={{ marginTop: '12px' }}>
                                    <div className="label-eyebrow" style={{ fontSize: '10px', marginBottom: '10px' }}>Enter a team</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                      <input
                                        className="input-field"
                                        list="known-team-names"
                                        type="text"
                                        placeholder="Team name"
                                        value={tName}
                                        onChange={(e) => onTeamNameChange(fx, e.target.value)}
                                        style={{ padding: '12px 14px', fontSize: '15px' }}
                                      />
                                      <datalist id="known-team-names">
                                        {Object.values(knownTeams()).map(t => <option key={t.name} value={t.name} />)}
                                      </datalist>
                                      <select
                                        className="input-field select-field"
                                        value={tHandicap}
                                        onChange={(e) => setTHandicap(e.target.value)}
                                        style={{ padding: '12px 14px', fontSize: '15px' }}
                                      >
                                        <option value="">Team handicap (optional)…</option>
                                        {TEAM_HANDICAP_OPTIONS.map(h => <option key={h} value={h}>{fmtH(h)}</option>)}
                                      </select>

                                      {fxDays.length > 1 && (
                                        <div className="perday-toggle">
                                          <button type="button" className={!tPerDay ? 'active' : ''} onClick={() => setTPerDay(false)}>Same team both days</button>
                                          <button type="button" className={tPerDay ? 'active' : ''} onClick={() => setTPerDay(true)}>Different per day</button>
                                        </div>
                                      )}

                                      {(tPerDay && fxDays.length > 1 ? fxDays : [fxDays[0]]).map(d => (
                                        <div key={d.key} className="squad-editor">
                                          <div className="squad-editor-head">
                                            {tPerDay && fxDays.length > 1 ? d.label : (fxDays.length > 1 ? 'Squad — both days' : 'Squad')}
                                          </div>
                                          {(tSquads[d.key] || []).map((row, idx) => (
                                            <div key={idx} className="squad-row">
                                              <input
                                                className="input-field"
                                                type="text"
                                                list="playerdb-names"
                                                placeholder={`Player ${idx + 1}`}
                                                value={row.name}
                                                onChange={(e) => { const v = e.target.value; setSquadPlayer(d.key, idx, 'name', v); const rec = playerDb.find(p => (p.name || '').toLowerCase() === v.trim().toLowerCase()); if (rec && rec.handicap != null) setSquadPlayer(d.key, idx, 'handicap', String(rec.handicap)); }}
                                                style={{ flex: 1, minWidth: 0, padding: '10px 12px', fontSize: '14px' }}
                                              />
                                              <select
                                                className="input-field select-field"
                                                value={row.handicap}
                                                onChange={(e) => setSquadPlayer(d.key, idx, 'handicap', e.target.value)}
                                                style={{ width: '70px', flexShrink: 0, padding: '10px 4px', fontSize: '14px' }}
                                              >
                                                <option value="">–</option>
                                                {HANDICAP_OPTIONS.map(h => <option key={h} value={h}>{fmtH(h)}</option>)}
                                              </select>
                                              {(tSquads[d.key] || []).length > 1 && (
                                                <button type="button" className="remove-btn" onClick={() => removeSquadPlayer(d.key, idx)} aria-label="Remove player" style={{ fontSize: '18px', flexShrink: 0 }}>×</button>
                                              )}
                                            </div>
                                          ))}
                                          <button type="button" className="add-player-btn" onClick={() => addSquadPlayer(d.key)}>＋ Add player</button>
                                        </div>
                                      ))}

                                      <input
                                        className="input-field"
                                        type="text"
                                        placeholder="Team captain name (optional)"
                                        value={tContact}
                                        onChange={(e) => setTContact(e.target.value)}
                                        style={{ padding: '12px 14px', fontSize: '15px' }}
                                      />
                                      <input
                                        className="input-field"
                                        type="tel"
                                        placeholder="Captain mobile (optional, captain only)"
                                        value={tMobile}
                                        onChange={(e) => setTMobile(e.target.value)}
                                        style={{ padding: '12px 14px', fontSize: '15px' }}
                                      />
                                      <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: 1.45, marginTop: '-2px' }}>
                                        Start typing a team name to pull through last season's squad.{fxDays.length > 1 ? ' Choose “Different per day” if your Saturday and Sunday line-ups differ.' : ''}
                                      </div>
                                      {tError && (
                                        <div style={{ fontSize: '12px', color: 'var(--danger)', padding: '8px 12px', background: '#fbf2f2', borderRadius: '4px', borderLeft: '3px solid var(--danger)' }}>
                                          {tError}
                                        </div>
                                      )}
                                      <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="btn-primary" onClick={() => registerTeam(fx)} style={{ flex: 1, padding: '13px', fontSize: '12px' }}>Enter Team</button>
                                        <button onClick={() => setShowTeamForm(false)} style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--muted)', padding: '13px 16px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <button className="enter-team-btn" onClick={() => { resetTeamForm(fx); setShowTeamForm(true); }}>
                                    ＋ Enter a team for this fixture
                                  </button>
                                ))}
                              </div>

                              {registered.length > 0 ? (
                                <div style={{ paddingTop: '10px' }}>
                                  <div className="label-eyebrow" style={{ fontSize: '10px', marginBottom: '4px' }}>Registered Interest</div>
                                  {registered.map(p => (
                                    <div key={p.id} className="interested-row">
                                      <div className="mini-badge">{fmtH(p.handicap)}</div>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 500, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                                        {captainMode && (p.mobile || p.email) && (
                                          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px', display: 'flex', flexWrap: 'wrap', gap: '4px 10px' }}>
                                            {p.mobile && (
                                              <a href={`tel:${p.mobile.replace(/\s+/g, '')}`} className="phone-link" onClick={(e) => e.stopPropagation()}>
                                                {p.mobile}
                                              </a>
                                            )}
                                            {p.email && (
                                              <a href={`mailto:${p.email}`} className="phone-link" onClick={(e) => e.stopPropagation()} style={{ textTransform: 'none', letterSpacing: 0 }}>
                                                {p.email}
                                              </a>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      {captainMode && (
                                        <button className="remove-btn" onClick={() => removeInterest(fx.id, p.id)} aria-label={`Remove ${p.name}`} style={{ fontSize: '18px' }}>×</button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div style={{ paddingTop: '14px', textAlign: 'center', fontSize: '13px', color: 'var(--muted)' }} className="display-italic">
                                  Be the first to register.
                                </div>
                              )}

                              {!isTournamentActive(fx) ? (
                              <div className="register-form">
                                <div className="label-eyebrow" style={{ fontSize: '10px', marginBottom: '10px' }}>Register your interest</div>
                                {(() => {
                                  const closesAt = interestClosesAt(fx);
                                  if (!closesAt) return null;
                                  const closed = isInterestClosed(fx);
                                  const when = closesAt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
                                  return (
                                    <div style={{ fontSize: '11.5px', lineHeight: 1.5, padding: '9px 12px', borderRadius: '5px', marginBottom: '10px',
                                                  background: closed ? '#fbf2f2' : 'var(--cream-warm)',
                                                  color: closed ? 'var(--danger)' : 'var(--muted)',
                                                  border: `1px solid ${closed ? 'var(--danger)' : 'var(--line)'}` }}>
                                      {closed
                                        ? <><strong>Registering has closed.</strong> It shut at the end of {when}, the day before the fixture.{captainMode ? ' As captain you can still add someone below.' : ' Please contact the captain if you still want to play.'}</>
                                        : <>Registering closes at the end of <strong>{when}</strong> — the day before the fixture.</>}
                                    </div>
                                  );
                                })()}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                  <input
                                    className="input-field"
                                    type="text"
                                    placeholder="Your name"
                                    value={fName}
                                    onChange={(e) => setFName(e.target.value)}
                                    style={{ padding: '12px 14px', fontSize: '15px' }}
                                  />
                                  <select
                                    className="input-field select-field"
                                    value={fHandicap}
                                    onChange={(e) => setFHandicap(e.target.value)}
                                    style={{ padding: '12px 14px', fontSize: '15px' }}
                                  >
                                    <option value="">Select your handicap…</option>
                                    {HANDICAP_OPTIONS.map(h => (
                                      <option key={h} value={h}>{fmtH(h)}</option>
                                    ))}
                                  </select>
                                  <input
                                    className="input-field"
                                    type="tel"
                                    placeholder="Mobile (optional, captain only)"
                                    value={fMobile}
                                    onChange={(e) => setFMobile(e.target.value)}
                                    style={{ padding: '12px 14px', fontSize: '15px' }}
                                  />
                                  <input
                                    className="input-field"
                                    type="email"
                                    placeholder="Email (optional, captain only)"
                                    value={fEmail}
                                    onChange={(e) => setFEmail(e.target.value)}
                                    style={{ padding: '12px 14px', fontSize: '15px' }}
                                  />
                                  <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: 1.45, marginTop: '-2px' }}>
                                    Your name and handicap will be visible to other members. Mobile and email are visible only to the Captain — used for fixture coordination.
                                  </div>
                                  {fError && (
                                    <div style={{ fontSize: '12px', color: 'var(--danger)', padding: '8px 12px', background: '#fbf2f2', borderRadius: '4px', borderLeft: '3px solid var(--danger)' }}>
                                      {fError}
                                    </div>
                                  )}
                                  <button className="btn-primary" onClick={() => registerInterest(fx.id)} style={{ padding: '13px', fontSize: '12px' }}>
                                    Register Interest
                                  </button>
                                </div>
                              </div>
                              ) : (
                                <div style={{ margin: '4px 0 8px', padding: '12px 14px', background: 'var(--cream-warm)', border: '1px solid var(--line)', borderRadius: '4px', textAlign: 'center' }}>
                                  <div className="display-italic" style={{ fontSize: '13px', color: 'var(--muted)' }}>Tournament underway — sign-ups are closed.</div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              <div style={{ textAlign: 'center', marginTop: '28px', padding: '18px 0 4px', borderTop: '1px solid var(--line)' }}>
                <div className="display-italic" style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '10px' }}>
                  Source: the club's official 2026 fixture cards
                </div>
                <a
                  href="https://www.druidspolo.co.uk/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '11px', color: 'var(--burgundy)', letterSpacing: '1.5px', textTransform: 'uppercase', textDecoration: 'none', borderBottom: '1px solid var(--gold)', paddingBottom: '2px' }}
                >
                  View fixture cards on druidspolo.co.uk ↗
                </a>
              </div>
            </div>
          )}

          {activeTab === 'live' && (
            <div style={{ maxWidth: '760px', margin: '0 auto' }}>
              <div style={{ fontWeight: 700, fontSize: '20px', letterSpacing: '0.5px', color: 'var(--burgundy)', textTransform: 'uppercase', marginBottom: '4px' }}>Live Game</div>
              <div style={{ fontSize: '12px', color: '#777', marginBottom: '16px' }}>Live scores update automatically as matches are played.</div>
              {(
                (() => {
                  // Members only get published draws here; captains see everything.
                  const fixtureDetails = visibleFixtureDetails;
                  const liveFixtureIds = Object.keys(fixtureDetails).filter(fid => (fixtureDetails[fid].days || []).some(d => (d.matches || []).length > 0));
                  const fixtureName = (fid) => { const f = fixtures.find(x => x.id === fid); return f ? f.name : fid; };
                  const curFd = liveFixtureId ? fixtureDetails[liveFixtureId] : null;
                  const curDays = curFd ? (curFd.days || []) : [];
                  const curDay = curDays.find(d => d.id === liveDayId) || null;
                  const curMatches = curDay ? (curDay.matches || []) : [];
                  const curMatch = curMatches.find(m => m.id === liveMatchId) || null;
                  return (
                    <div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                        <select value={liveDate || ''} onChange={e => { setLiveDate(e.target.value || null); setLiveFixtureId(null); setLiveDayId(null); setLiveMatchId(null); }} style={{ flex: 1, minWidth: '160px', padding: '8px', fontSize: '13px' }}>
                          <option value="">Select date…</option>
                          {Array.from(new Set(Object.keys(fixtureDetails).flatMap(fid => (fixtureDetails[fid] && fixtureDetails[fid].days || []).map(d => d.dateLabel).filter(Boolean)))).sort((a, b) => dayLabelTime(b) - dayLabelTime(a)).map(dl => <option key={dl} value={dl}>{dl}</option>)}
                        </select>
                        <select value={liveFixtureId || ''} disabled={!liveDate} onChange={e => { const fid = e.target.value || null; setLiveFixtureId(fid); const fx = fid ? fixtureDetails[fid] : null; const day = fx ? (fx.days || []).find(d => d.dateLabel === liveDate) : null; setLiveDayId(day ? day.id : null); setLiveMatchId(null); }} style={{ flex: 1, minWidth: '180px', padding: '8px', fontSize: '13px' }}>
                          <option value="">Select tournament…</option>
                          {Object.keys(fixtureDetails).filter(fid => (fixtureDetails[fid] && fixtureDetails[fid].days || []).some(d => d.dateLabel === liveDate)).map(fid => <option key={fid} value={fid}>{fixtureName(fid)}</option>)}
                        </select>
                        <select value={liveMatchId || ''} disabled={!liveFixtureId} onChange={e => setLiveMatchId(e.target.value || null)} style={{ flex: 1, minWidth: '160px', padding: '8px', fontSize: '13px' }}>
                          <option value="">Select match…</option>
                          {curMatches.map(m => <option key={m.id} value={m.id}>{(m.time ? m.time + ' ' : '') + ((m.teamA && m.teamA.name) || 'Team A') + ' v ' + ((m.teamB && m.teamB.name) || 'Team B')}</option>)}
                        </select>
                      </div>
                      {!curMatch ? (
                        <div style={{ textAlign: 'center', color: '#999', fontSize: '13px', padding: '30px 0' }}>Select a tournament, day and match to begin live scoring.</div>
                      ) : (() => {
                        // Colour precedence: what this match was set to, else what the squad
                        // wore last time, else the blue/white default.
                        const colA = teamColour(curMatch.liveColorA)
                          || teamColour(teamColourKey((curMatch.teamA || {}).name)) || teamColour('blue');
                        const colB = teamColour(curMatch.liveColorB)
                          || teamColour(teamColourKey((curMatch.teamB || {}).name)) || teamColour('white');
                        const nameA = (curMatch.teamA && curMatch.teamA.name) || 'Team A';
                        const nameB = (curMatch.teamB && curMatch.teamB.name) || 'Team B';
                        const hA = teamHandicap(curMatch.teamA);
                        const hB = teamHandicap(curMatch.teamB);
                        const fmtHcp = (h) => h == null ? null : (h > 0 ? '+' + h : h < 0 ? '−' + Math.abs(h) : '0');
                        const nCk = matchChukkas(curMatch);
                        const ended = curMatch.liveChukka === 'ended';
                        const curCk = ended ? nCk : Math.max(0, Math.min(nCk, Number(curMatch.liveChukka) || 0));
                        const weekday = (curDay && curDay.dateLabel) ? String(curDay.dateLabel).split(' ')[0] : '';
                        const ctxLeft = [weekday, curDay && curDay.ground].filter(Boolean).join(' · ').toUpperCase();
                        // Remember the colour against the team as well as the match, so the
                        // same squad keeps its shirts across every match of the tournament and
                        // arrives pre-coloured when a captain next picks it.
                        const setColour = (teamKey, key) => {
                          updLiveMatch(liveFixtureId, liveDayId, liveMatchId, m => ({ ...m, [teamKey === 'teamA' ? 'liveColorA' : 'liveColorB']: key }));
                          const nm = ((curMatch[teamKey] || {}).name || '').trim();
                          if (nm) rememberTeamColour(nm, key);
                        };
                        const setChukka = (v) => updLiveMatch(liveFixtureId, liveDayId, liveMatchId, m => ({ ...m, liveChukka: v }));
                        const tile = (col) => (
                          <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: col.hex, color: col.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: '30px', border: '1px solid rgba(0,0,0,0.12)', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}>{col.name.charAt(0)}</div>
                        );
                        const status = ended
                          ? <span style={{ color: 'var(--muted)', fontSize: '12px', letterSpacing: '1.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '7px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#b9b2a4' }} /> FULL TIME</span>
                          : curCk > 0
                            ? <span style={{ color: '#2f7a4f', fontSize: '12px', letterSpacing: '1.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '7px' }}><span className="live-dot" /> LIVE · {ordinalUpper(curCk)} CHUKKA</span>
                            : <span style={{ color: 'var(--muted)', fontSize: '12px', letterSpacing: '1.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '7px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', border: '2px solid #cfc7b6', boxSizing: 'border-box' }} /> NOT STARTED</span>;
                        return (
                        <div>
                          <div style={{ background: '#fff', border: '1px solid #e5e0d8', borderRadius: '10px', padding: '20px 22px' }}>
                            {curMatch.label && <div style={{ textAlign: 'center', color: 'var(--burgundy)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700, marginBottom: '12px' }}>{curMatch.label}</div>}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '18px', flexWrap: 'wrap' }}>
                              <div style={{ color: 'var(--burgundy)', fontSize: '11px', letterSpacing: '1.5px', fontWeight: 700 }}>{ctxLeft || '\u00A0'}</div>
                              {status}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '9px', textAlign: 'center' }}>
                                {tile(colA)}
                                <div style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', color: 'var(--ink)', lineHeight: 1.15 }}>{nameA}</div>
                                {fmtHcp(hA) != null && <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Team handicap {fmtHcp(hA)}</div>}
                                {liveHeadStart(curMatch, 'A') > 0 && <div style={{ fontSize: '11px', color: 'var(--burgundy)' }}>starts +{fmtHalf(liveHeadStart(curMatch, 'A'))}</div>}
                              </div>
                              <div style={{ alignSelf: 'center', fontFamily: "'Fraunces', serif", fontSize: '48px', fontWeight: 600, color: 'var(--burgundy)', whiteSpace: 'nowrap', padding: '6px 2px 0' }}>{liveDisplayScore(curMatch, 'A')}<span style={{ opacity: 0.4, margin: '0 5px' }}>–</span>{liveDisplayScore(curMatch, 'B')}</div>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '9px', textAlign: 'center' }}>
                                {tile(colB)}
                                <div style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', color: 'var(--ink)', lineHeight: 1.15 }}>{nameB}</div>
                                {fmtHcp(hB) != null && <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Team handicap {fmtHcp(hB)}</div>}
                                {liveHeadStart(curMatch, 'B') > 0 && <div style={{ fontSize: '11px', color: 'var(--burgundy)' }}>starts +{fmtHalf(liveHeadStart(curMatch, 'B'))}</div>}
                              </div>
                            </div>
                            <div style={{ borderTop: '1px solid #eee', marginTop: '20px', paddingTop: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ color: 'var(--burgundy)', fontSize: '11px', letterSpacing: '1.5px', fontWeight: 700, flexShrink: 0 }}>CHUKKAS</div>
                              <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', flex: 1 }}>
                                {Array.from({ length: nCk }).map((_, i) => {
                                  const n = i + 1;
                                  const bg = ended ? 'var(--burgundy)' : n < curCk ? 'var(--burgundy)' : n === curCk ? '#c9a24b' : '#e8e2d6';
                                  return captainMode
                                    ? <button key={n} onClick={() => setChukka(n === curCk && !ended ? 0 : n)} title={'Chukka ' + n} style={{ flex: 1, minWidth: '24px', maxWidth: '50px', height: '9px', borderRadius: '5px', background: bg, border: 'none', cursor: 'pointer', padding: 0 }} />
                                    : <span key={n} style={{ flex: 1, minWidth: '24px', maxWidth: '50px', height: '9px', borderRadius: '5px', background: bg }} />;
                                })}
                              </div>
                            </div>
                          </div>

                          {captainMode && (
                            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              <div style={{ display: 'flex', gap: '12px' }}>
                                {['teamA', 'teamB'].map(tk => {
                                  const nm = tk === 'teamA' ? nameA : nameB;
                                  const raw = tk === 'teamA' ? (curMatch.scoreA || 0) : (curMatch.scoreB || 0);
                                  return (
                                    <div key={tk} style={{ flex: 1, textAlign: 'center', background: '#fff', border: '1px solid var(--line)', borderRadius: '8px', padding: '12px 8px' }}>
                                      <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--ink)', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nm}</div>
                                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                                        <button onClick={() => bumpTeamScore(liveFixtureId, liveDayId, liveMatchId, tk, -1)} style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid #ccc', background: '#f7f4ef', fontSize: '20px', fontWeight: 700, cursor: 'pointer', color: '#555' }}>&minus;</button>
                                        <span style={{ minWidth: '28px', fontSize: '22px', fontWeight: 800, color: 'var(--burgundy)' }}>{raw}</span>
                                        <button onClick={() => bumpTeamScore(liveFixtureId, liveDayId, liveMatchId, tk, 1)} style={{ width: '40px', height: '40px', borderRadius: '50%', border: 'none', background: 'var(--burgundy)', color: '#fff', fontSize: '20px', fontWeight: 700, cursor: 'pointer' }}>+</button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div style={{ background: '#fff', border: '1px solid var(--line)', borderRadius: '8px', padding: '12px' }}>
                                <div style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '6px' }}>Chukka in play</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                  <button onClick={() => setChukka(0)} style={{ height: '34px', padding: '0 10px', borderRadius: '8px', border: (curCk === 0 && !ended) ? 'none' : '1px solid var(--line)', background: (curCk === 0 && !ended) ? 'var(--burgundy)' : '#fff', color: (curCk === 0 && !ended) ? '#fff' : 'var(--muted)', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>Not started</button>
                                  {Array.from({ length: nCk }).map((_, i) => {
                                    const n = i + 1;
                                    const on = !ended && n === curCk;
                                    return <button key={n} onClick={() => setChukka(n)} style={{ minWidth: '34px', height: '34px', borderRadius: '8px', border: on ? 'none' : '1px solid var(--line)', background: on ? 'var(--burgundy)' : '#fff', color: on ? '#fff' : 'var(--ink)', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>{n}</button>;
                                  })}
                                  <button onClick={() => setChukka('ended')} style={{ height: '34px', padding: '0 12px', borderRadius: '8px', border: ended ? 'none' : '1px solid var(--line)', background: ended ? 'var(--burgundy)' : '#fff', color: ended ? '#fff' : 'var(--muted)', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>Ended</button>
                                </div>
                              </div>
                            </div>
                          )}

                          <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
                            <button onClick={() => setLivePlayersOpen(o => !o)} style={{ background: 'none', border: 'none', color: 'var(--burgundy)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px', cursor: 'pointer', textTransform: 'uppercase' }}>{livePlayersOpen ? '▴ Hide players' : '▾ Show players'}</button>
                            {captainMode && <button onClick={() => setLiveColoursOpen(o => !o)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px', cursor: 'pointer', textTransform: 'uppercase' }}>{liveColoursOpen ? '▴ Shirt colours' : '▾ Shirt colours'}</button>}
                          </div>

                          {livePlayersOpen && (
                            <div style={{ marginTop: '8px', background: '#fff', border: '1px solid var(--line)', borderRadius: '8px', padding: '14px', display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                              {['teamA', 'teamB'].map(tk => {
                                const team = curMatch[tk] || {};
                                const nm = tk === 'teamA' ? nameA : nameB;
                                const col = tk === 'teamA' ? colA : colB;
                                const ps = team.players || [];
                                // Order the line-up by shirt number once numbers are allocated;
                                // unnumbered players keep their original order at the end. We keep
                                // each player's ORIGINAL index (pi) so the goal/shirt controls,
                                // which mutate team.players by index, still target the right player.
                                const orderedPs = ps
                                  .map((p, origIdx) => ({ p, origIdx }))
                                  .sort((a, b) => {
                                    const va = a.p.shirtNo, vb = b.p.shirtNo;
                                    const ea = va == null || String(va).trim() === '';
                                    const eb = vb == null || String(vb).trim() === '';
                                    if (ea && eb) return a.origIdx - b.origIdx;
                                    if (ea) return 1;
                                    if (eb) return -1;
                                    const na = Number(va), nb = Number(vb);
                                    if (Number.isFinite(na) && Number.isFinite(nb)) return (na - nb) || (a.origIdx - b.origIdx);
                                    return String(va).localeCompare(String(vb), undefined, { numeric: true }) || (a.origIdx - b.origIdx);
                                  });
                                return (
                                  <div key={tk} style={{ flex: 1, minWidth: '240px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
                                      <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: col.hex, border: '1px solid rgba(0,0,0,0.2)' }} />
                                      <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--burgundy)' }}>{nm}</span>
                                      {captainMode && <span style={{ fontSize: '10px', color: 'var(--muted)', marginLeft: 'auto' }}>#&nbsp;=&nbsp;shirt no.</span>}
                                    </div>
                                    {ps.length === 0 && <div style={{ fontSize: '12px', color: '#aaa' }}>No players listed.</div>}
                                    {orderedPs.map(({ p, origIdx: pi }) => (
                                      <div key={pi} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '6px 0', borderBottom: '1px solid #f0ece4' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                          {captainMode ? (
                                            <input value={p.shirtNo || ''} onChange={e => setPlayerShirt(liveFixtureId, liveDayId, liveMatchId, tk, pi, e.target.value.replace(/[^0-9A-Za-z]/g, '').slice(0, 2))} placeholder="#" maxLength={2} inputMode="numeric" style={{ width: '32px', height: '30px', textAlign: 'center', border: '1px solid var(--line)', borderRadius: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--ink)', padding: 0, flexShrink: 0 }} />
                                          ) : (
                                            (p.shirtNo != null && String(p.shirtNo) !== '') && <span style={{ width: '26px', height: '26px', flexShrink: 0, borderRadius: '6px', background: col.hex, color: col.text, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, border: '1px solid rgba(0,0,0,0.15)' }}>{p.shirtNo}</span>
                                          )}
                                          <span style={{ fontSize: '13px', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name || 'Player ' + (pi + 1)}{Number.isFinite(Number(p.handicap)) && <span style={{ color: 'var(--muted)', marginLeft: '6px', fontSize: '11px' }}>{fmtH(Number(p.handicap))}</span>}</span>
                                        </div>
                                        {captainMode ? (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                            <button onClick={() => bumpPlayerGoals(liveFixtureId, liveDayId, liveMatchId, tk, pi, -1)} style={{ width: '26px', height: '26px', borderRadius: '50%', border: '1px solid #ccc', background: '#f7f4ef', fontSize: '14px', cursor: 'pointer', color: '#555' }}>&minus;</button>
                                            <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 700, fontSize: '14px', color: 'var(--burgundy)' }}>{p.goals == null ? 0 : p.goals}</span>
                                            <button onClick={() => bumpPlayerGoals(liveFixtureId, liveDayId, liveMatchId, tk, pi, 1)} style={{ width: '26px', height: '26px', borderRadius: '50%', border: 'none', background: 'var(--burgundy)', color: '#fff', fontSize: '14px', cursor: 'pointer' }}>+</button>
                                          </div>
                                        ) : (
                                          (Number(p.goals) || 0) > 0 && <span style={{ color: 'var(--burgundy)', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>{Number(p.goals)} {Number(p.goals) === 1 ? 'goal' : 'goals'}</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {captainMode && liveColoursOpen && (
                            <div style={{ marginTop: '8px', background: '#fff', border: '1px solid var(--line)', borderRadius: '8px', padding: '14px' }}>
                              {['teamA', 'teamB'].map(tk => {
                                const remembered = teamColourKey((curMatch[tk] || {}).name);
                                const sel = tk === 'teamA'
                                  ? (curMatch.liveColorA || remembered || 'blue')
                                  : (curMatch.liveColorB || remembered || 'white');
                                const nm = tk === 'teamA' ? nameA : nameB;
                                return (
                                  <div key={tk} style={{ marginBottom: '12px' }}>
                                    <div style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '5px' }}>{nm} · shirts</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                      {TEAM_COLOURS.map(c => (
                                        <button key={c.key} onClick={() => setColour(tk, c.key)} title={c.name} style={{ width: '30px', height: '30px', borderRadius: '8px', background: c.hex, cursor: 'pointer', border: sel === c.key ? '3px solid var(--burgundy)' : '1px solid rgba(0,0,0,0.15)', boxShadow: sel === c.key ? '0 0 0 1px #fff inset' : 'none' }} />
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        );
                      })()}
                    </div>
                  );
                })()
              )}
              {!captainMode && (
                <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid var(--line)', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#777', marginBottom: '10px' }}>Scores are visible to everyone. Only captains can update them.</div>
                  <button onClick={() => setPinModalOpen(true)} style={{ background: 'none', border: '1px solid var(--burgundy)', color: 'var(--burgundy)', borderRadius: '6px', padding: '9px 18px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.5px' }}>Enter Captain PIN to enter scores</button>
                </div>
              )}
            </div>
          )}

          {/* ─── SHOP (captain only, preview — Stripe to follow) ─── */}
          {activeTab === 'shop' && captainMode && (
            <div className="reveal">
              <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                <div className="label-eyebrow">Club Shop · Preview</div>
                <h2 className="display" style={{ margin: '2px 0 0', fontSize: '24px' }}>Shop</h2>
              </div>

              <div style={{ background: 'var(--cream-pale)', borderLeft: '3px solid var(--gold)', borderRadius: '4px', padding: '12px 14px', fontSize: '12px', lineHeight: 1.55, color: 'var(--muted)', marginBottom: '20px' }}>
                Work in progress — only you can see this. Members won't see a Shop tab until it's switched on.
                Checkout is not connected yet; the buttons below are placeholders for Stripe.
              </div>

              <div className="shop-grid">
                {SHOP_PRODUCTS.map(p => (
                  <div key={p.id} className="shop-card">
                    <div className="shop-img-wrap">
                      <img src={p.image} alt={p.name} className="shop-img" loading="lazy" />
                    </div>
                    <div style={{ padding: '14px' }}>
                      <div style={{ fontFamily: "'Fraunces', serif", fontSize: '17px', fontWeight: 600, color: 'var(--ink)', lineHeight: 1.25 }}>{p.name}</div>
                      <div style={{ fontSize: '16px', color: 'var(--burgundy)', fontWeight: 600, margin: '6px 0 8px' }}>{fmtPence(p.pricePence)}</div>
                      {p.blurb && <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '10px' }}>{p.blurb}</div>}
                      {p.options && (
                        <div style={{ marginBottom: '10px' }}>
                          <label style={{ fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>{p.options.label}</label>
                          <select
                            className="input-field select-field"
                            value={shopOptions[p.id] ?? p.options.values[0]}
                            onChange={(e) => setShopOptions(prev => ({ ...prev, [p.id]: e.target.value }))}
                            style={{ padding: '8px 10px', fontSize: '13px' }}
                          >
                            {p.options.values.map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                      )}
                      <button
                        className="btn-primary"
                        disabled
                        title="Stripe checkout is not connected yet"
                        style={{ opacity: 0.5, cursor: 'not-allowed', width: '100%', padding: '11px', fontSize: '12px' }}
                      >
                        {p.inStock ? 'Buy · Stripe coming soon' : 'Out of stock'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: 1.5, marginTop: '18px', textAlign: 'center' }}>
                To add a product, drop a photo into <code>/public/shop/</code> and add an entry to <code>SHOP_PRODUCTS</code>.
              </div>
            </div>
          )}

          {activeTab === 'players' && captainMode && (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                <button onClick={() => setPlayersView('players')} style={{ flex: 1, minWidth: '70px', padding: '9px 4px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.3px', textTransform: 'uppercase', cursor: 'pointer', border: playersView === 'players' ? 'none' : '1px solid var(--line)', background: playersView === 'players' ? 'var(--burgundy)' : 'transparent', color: playersView === 'players' ? 'var(--cream)' : 'var(--muted)' }}>Players</button>
                <button onClick={() => setPlayersView('subsidies')} style={{ flex: 1, minWidth: '70px', padding: '9px 4px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.3px', textTransform: 'uppercase', cursor: 'pointer', border: playersView === 'subsidies' ? 'none' : '1px solid var(--line)', background: playersView === 'subsidies' ? 'var(--burgundy)' : (lowSubsidies.length > 0 ? '#fbf2f2' : 'transparent'), color: playersView === 'subsidies' ? 'var(--cream)' : (lowSubsidies.length > 0 ? 'var(--danger)' : 'var(--muted)') }}>Subsidies{lowSubsidies.length > 0 ? ` (${lowSubsidies.length})` : ''}</button>
                <button onClick={() => setPlayersView('lessons')} style={{ flex: 1, minWidth: '70px', padding: '9px 4px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.3px', textTransform: 'uppercase', cursor: 'pointer', border: playersView === 'lessons' ? 'none' : '1px solid var(--line)', background: playersView === 'lessons' ? 'var(--burgundy)' : 'transparent', color: playersView === 'lessons' ? 'var(--cream)' : 'var(--muted)' }}>Lessons</button>
                <button onClick={() => setPlayersView('checkout')} style={{ flex: 1, minWidth: '70px', padding: '9px 4px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.3px', textTransform: 'uppercase', cursor: 'pointer', border: playersView === 'checkout' ? 'none' : '1px solid var(--line)', background: playersView === 'checkout' ? 'var(--burgundy)' : 'transparent', color: playersView === 'checkout' ? 'var(--cream)' : 'var(--muted)' }}>Checkout</button>
              </div>

              {playersView === 'players' && (<>
              <div style={{ fontWeight: 700, fontSize: '20px', letterSpacing: '0.5px', color: 'var(--burgundy)', textTransform: 'uppercase', marginBottom: '4px' }}>Player Database</div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px' }}>
                {playerDb.length} player{playerDb.length === 1 ? '' : 's'} &middot; captain only &middot; synced across devices
              </div>

              {pdbError && (
                <div style={{ fontSize: '12px', color: 'var(--burgundy)', padding: '8px 12px', background: 'var(--cream-pale)', borderRadius: '4px', borderLeft: '3px solid var(--gold)', marginBottom: '12px' }}>{pdbError}</div>
              )}

              {!playerEditor && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                  <input className="input-field" type="text" placeholder="Search players…" value={playerSearch} onChange={e => setPlayerSearch(e.target.value)} style={{ flex: 1, minWidth: '140px', padding: '10px 12px', fontSize: '14px' }} />
                  <button onClick={openNewPlayer} style={{ background: 'var(--burgundy)', color: 'var(--cream)', border: 'none', padding: '10px 16px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', cursor: 'pointer' }}>+ Add</button>
                  <button onClick={importEveryone} style={{ background: 'transparent', color: 'var(--muted)', border: '1px solid var(--line)', padding: '10px 14px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Import all</button>
                </div>
              )}

              {playerEditor && (
                <div style={{ border: '1px solid var(--line)', borderRadius: '6px', padding: '14px', marginBottom: '16px', background: 'var(--cream-pale)' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--burgundy)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{playerEditor.id ? 'Edit player' : 'New player'}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <input className="input-field" type="text" placeholder="Full name" value={playerEditor.name} onChange={e => setPlayerEditor({ ...playerEditor, name: e.target.value })} style={{ padding: '11px 13px', fontSize: '15px' }} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select className="input-field select-field" value={playerEditor.handicap} onChange={e => setPlayerEditor({ ...playerEditor, handicap: e.target.value })} style={{ width: '120px', flexShrink: 0, padding: '11px 8px', fontSize: '14px' }}>
                        <option value="">Handicap…</option>
                        {HANDICAP_OPTIONS.map(h => <option key={h} value={h}>{h > 0 ? `+${h}` : h}</option>)}
                      </select>
                      <select className="input-field select-field" value={playerEditor.membership || 'none'} onChange={e => setPlayerEditor({ ...playerEditor, membership: e.target.value })} style={{ flex: 1, padding: '11px 8px', fontSize: '14px' }}>
                        {MEMBERSHIP_TYPES_2026.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                      </select>
                    </div>
                    <div style={{ marginTop: '-4px' }}>
                      <a
                        href="https://hpa-polo.co.uk/hpa-search-tool/"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => copyNameForHpa(playerEditor.name, 'editor')}
                        title={(playerEditor.name || '').trim() ? "Copies the name so you can paste it into the HPA member search" : "Open the HPA member search to find a handicap"}
                        style={{ fontSize: '11px', color: 'var(--burgundy)', textDecoration: 'none', fontWeight: 600 }}
                      >
                        {hpaCopied === 'editor' ? 'Name copied — paste it into the HPA search ↗' : 'Look up a handicap on HPA ↗'}
                      </a>
                    </div>
                    <div style={{ fontSize: '11px', color: membershipById(playerEditor.membership || 'none').chukkasIncluded ? 'var(--burgundy)' : 'var(--muted)', marginTop: '-4px', lineHeight: 1.45 }}>
                      {membershipById(playerEditor.membership || 'none').chukkasIncluded
                        ? '✓ Chukka fees included — booking adds them straight to the roster.'
                        : 'Pays per chukka — booking sends them to checkout to pay first.'}
                    </div>
                    <input className="input-field" type="email" placeholder="Email" value={playerEditor.email} onChange={e => setPlayerEditor({ ...playerEditor, email: e.target.value })} style={{ padding: '11px 13px', fontSize: '14px' }} />
                    <input className="input-field" type="tel" placeholder="Mobile" value={playerEditor.mobile} onChange={e => setPlayerEditor({ ...playerEditor, mobile: e.target.value })} style={{ padding: '11px 13px', fontSize: '14px' }} />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--ink)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!playerEditor.student} onChange={e => setPlayerEditor({ ...playerEditor, student: e.target.checked })} />
                      Student (eligible for subsidies)
                    </label>
                    {playerEditor.student && (
                      <input className="input-field" type="text" placeholder="Regiment / unit (optional)" value={playerEditor.unit} onChange={e => setPlayerEditor({ ...playerEditor, unit: e.target.value })} style={{ padding: '11px 13px', fontSize: '14px' }} />
                    )}
                    {playerEditor.student && (
                      <div style={{ border: '1px solid var(--line)', borderRadius: '6px', padding: '10px 12px', background: '#fff' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '8px' }}>Subsidies</div>
                        {activeSubsidies.length === 0 ? (
                          <div style={{ fontSize: '12px', color: 'var(--muted)' }}>No subsidies defined yet — add them under the Subsidies tab.</div>
                        ) : (
                          activeSubsidies.map(s => (
                            <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--ink)', cursor: 'pointer', padding: '3px 0' }}>
                              <input type="checkbox" checked={(playerEditor.subsidies || []).includes(s.id)} onChange={e => {
                                const cur = new Set(playerEditor.subsidies || []);
                                if (e.target.checked) cur.add(s.id); else cur.delete(s.id);
                                setPlayerEditor({ ...playerEditor, subsidies: [...cur] });
                              }} />
                              {s.name} <span style={{ color: 'var(--muted)' }}>(−£{fmtMoney(subsidyDiscount(s))}/lesson)</span>
                            </label>
                          ))
                        )}
                        {(playerEditor.subsidies || []).length > 0 && (
                          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--line)' }}>
                            Subsidies are applied to lesson bookings (see the Lessons tab), drawing down each pot.
                          </div>
                        )}
                      </div>
                    )}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--ink)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={playerEditor.active !== false} onChange={e => setPlayerEditor({ ...playerEditor, active: e.target.checked })} />
                      Active member
                    </label>
                    <textarea className="input-field" placeholder="Notes (optional)" value={playerEditor.notes} onChange={e => setPlayerEditor({ ...playerEditor, notes: e.target.value })} rows={2} style={{ padding: '11px 13px', fontSize: '13px', resize: 'vertical' }} />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                      <button onClick={savePlayer} style={{ flex: 1, background: 'var(--burgundy)', color: 'var(--cream)', border: 'none', padding: '12px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>Save</button>
                      <button onClick={() => { setPlayerEditor(null); setPdbError(''); }} style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--muted)', padding: '12px 16px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                      {playerEditor.id && (
                        <button onClick={() => deletePlayer(playerEditor.id)} style={{ background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '12px 14px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Delete</button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!playerEditor && (
                visiblePlayers.length === 0 ? (
                  <div style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'center', padding: '28px 12px', lineHeight: 1.5 }}>
                    {playerDb.length === 0 ? 'No players yet. Add one, or import from the members directory.' : 'No players match your search.'}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {visiblePlayers.map(p => (
                      <div key={p.id} onClick={() => openEditPlayer(p)} style={{ border: '1px solid var(--line)', borderRadius: '6px', padding: '12px 14px', background: '#fff', cursor: 'pointer', opacity: p.active === false ? 0.55 : 1 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                          <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--ink)' }}>{p.name}</span>
                          {p.handicap != null && <span style={{ fontSize: '13px', color: 'var(--muted)' }}>({p.handicap > 0 ? `+${p.handicap}` : p.handicap})</span>}
                          <span style={{ marginLeft: 'auto', display: 'flex', gap: '5px' }}>
                            {!membershipById(p.membership || 'none').chukkasIncluded && <span title="Pays per chukka — no chukka-inclusive membership" style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--muted)', border: '1px solid var(--line)', padding: '2px 6px', borderRadius: '3px' }}>£/chukka</span>}
                            {p.student && <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--cream)', background: 'var(--gold)', padding: '2px 6px', borderRadius: '3px', textTransform: 'uppercase' }}>Stu</span>}
                            {p.active === false && <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--muted)', border: '1px solid var(--line)', padding: '2px 6px', borderRadius: '3px', textTransform: 'uppercase' }}>Inactive</span>}
                          </span>
                        </div>
                        {(p.email || p.mobile || p.unit) && (
                          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '3px' }}>
                            {[p.unit, p.mobile, p.email].filter(Boolean).join('  ·  ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}
              </>)}

              {playersView === 'subsidies' && (
                <div>
                  <div style={{ fontWeight: 700, fontSize: '20px', letterSpacing: '0.5px', color: 'var(--burgundy)', textTransform: 'uppercase', marginBottom: '4px' }}>Subsidies</div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px', lineHeight: 1.5 }}>
                    Pots the captain tops up through the year. Each gives a fixed £/chukka discount to the student players assigned to it; spending at checkout draws the pot down.
                  </div>

                  {subError && (
                    <div style={{ fontSize: '12px', color: 'var(--burgundy)', padding: '8px 12px', background: 'var(--cream-pale)', borderRadius: '4px', borderLeft: '3px solid var(--gold)', marginBottom: '12px' }}>{subError}</div>
                  )}

                  {lowSubsidies.length > 0 && !subsidyEditor && (
                    <div style={{ fontSize: '12px', color: 'var(--danger)', padding: '10px 12px', background: '#fbf2f2', borderRadius: '4px', borderLeft: '3px solid var(--danger)', marginBottom: '12px', lineHeight: 1.5 }}>
                      <strong>Running low:</strong> {lowSubsidies.map(s => s.name).join(', ')}. Time to apply for more funds.
                    </div>
                  )}

                  {!subsidyEditor && (
                    <button onClick={openNewSubsidy} style={{ background: 'var(--burgundy)', color: 'var(--cream)', border: 'none', padding: '10px 16px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', cursor: 'pointer', marginBottom: '14px' }}>+ Add subsidy</button>
                  )}

                  {subsidyEditor && (
                    <div style={{ border: '1px solid var(--line)', borderRadius: '6px', padding: '14px', marginBottom: '16px', background: 'var(--cream-pale)' }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--burgundy)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{subsidyEditor.id ? 'Edit subsidy' : 'New subsidy'}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <input className="input-field" type="text" placeholder="Subsidy name e.g. RA Charitable Fund" value={subsidyEditor.name} onChange={e => setSubsidyEditor({ ...subsidyEditor, name: e.target.value })} style={{ padding: '11px 13px', fontSize: '15px' }} />
                        {!subsidyEditor.id && (
                          <label style={{ fontSize: '12px', color: 'var(--muted)' }}>Opening balance (£)
                            <input className="input-field" type="number" inputMode="decimal" min="0" step="0.01" placeholder="1000" value={subsidyEditor.balance} onChange={e => setSubsidyEditor({ ...subsidyEditor, balance: e.target.value })} style={{ padding: '11px 13px', fontSize: '14px', marginTop: '4px' }} />
                          </label>
                        )}
                        <label style={{ fontSize: '12px', color: 'var(--muted)' }}>Discount per lesson (£)
                          <input className="input-field" type="number" inputMode="decimal" min="0" step="0.01" placeholder="25" value={subsidyEditor.discountPerLesson} onChange={e => setSubsidyEditor({ ...subsidyEditor, discountPerLesson: e.target.value })} style={{ padding: '11px 13px', fontSize: '14px', marginTop: '4px' }} />
                        </label>
                        <label style={{ fontSize: '12px', color: 'var(--muted)' }}>Warn when balance falls to (£)
                          <input className="input-field" type="number" inputMode="decimal" min="0" step="0.01" placeholder="100" value={subsidyEditor.lowThreshold} onChange={e => setSubsidyEditor({ ...subsidyEditor, lowThreshold: e.target.value })} style={{ padding: '11px 13px', fontSize: '14px', marginTop: '4px' }} />
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--ink)', cursor: 'pointer' }}>
                          <input type="checkbox" checked={subsidyEditor.active !== false} onChange={e => setSubsidyEditor({ ...subsidyEditor, active: e.target.checked })} />
                          Active
                        </label>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                          <button onClick={saveSubsidy} style={{ flex: 1, background: 'var(--burgundy)', color: 'var(--cream)', border: 'none', padding: '12px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>Save</button>
                          <button onClick={() => { setSubsidyEditor(null); setSubError(''); }} style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--muted)', padding: '12px 16px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
                          {subsidyEditor.id && (
                            <button onClick={() => deleteSubsidy(subsidyEditor.id)} style={{ background: 'transparent', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '12px 14px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Delete</button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {!subsidyEditor && (
                    subsidies.length === 0 ? (
                      <div style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'center', padding: '28px 12px', lineHeight: 1.5 }}>No subsidies yet. Add one to start managing a pot.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {subsidies.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(s => {
                          const bal = Number(s.balance) || 0;
                          const low = bal <= (Number(s.lowThreshold) || 0);
                          const assigned = playerDb.filter(p => Array.isArray(p.subsidies) && p.subsidies.includes(s.id)).length;
                          return (
                            <div key={s.id} style={{ border: `1px solid ${low ? 'var(--danger)' : 'var(--line)'}`, borderRadius: '6px', padding: '12px 14px', background: '#fff', opacity: s.active === false ? 0.55 : 1 }}>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--ink)' }}>{s.name}</span>
                                {s.active === false && <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px', color: 'var(--muted)', border: '1px solid var(--line)', padding: '2px 6px', borderRadius: '3px', textTransform: 'uppercase' }}>Off</span>}
                                <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '15px', color: low ? 'var(--danger)' : 'var(--burgundy)' }}>£{fmtMoney(bal)}</span>
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '3px' }}>
                                −£{fmtMoney(subsidyDiscount(s))}/lesson &middot; {assigned} player{assigned === 1 ? '' : 's'} &middot; warn ≤ £{fmtMoney(s.lowThreshold)}
                              </div>
                              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                <button onClick={() => topUpSubsidy(s.id)} style={{ background: 'var(--burgundy)', color: 'var(--cream)', border: 'none', padding: '8px 14px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', cursor: 'pointer' }}>Top up</button>
                                <button onClick={() => openEditSubsidy(s)} style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--muted)', padding: '8px 14px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Edit</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>
              )}

              {playersView === 'checkout' && (() => {
                const pl = playerDb.find(p => p.id === checkout.playerId) || null;
                const bd = pl ? priceBooking(pl, checkout.chukkas, checkout.ponyLevel) : null;
                const n = bd ? bd.chukkas : 0;
                const dayLabels = Object.fromEntries(DAY_KEYS.map(k => [k, DAY_CONFIG[k].label]));
                const ponyOpts = [['none', 'No pony hire (own pony)'], ['club', 'Club chukka'], ['league', 'League / up to 0 goal match'], ['match', '2 goal and above (POA — confirm with the office)']];
                const methods = [['cash', 'Cash'], ['transfer', 'Bank transfer'], ['card', 'Card (manual)'], ['other', 'Other']];
                return (
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '20px', letterSpacing: '0.5px', color: 'var(--burgundy)', textTransform: 'uppercase', marginBottom: '4px' }}>Checkout</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px', lineHeight: 1.5 }}>
                      Record a payment (cash, transfer or card) and add the player to a day's roster. Subsidy pots draw down automatically. Online card via Stripe wires in here later.
                    </div>

                    {coError && (
                      <div style={{ fontSize: '12px', color: 'var(--burgundy)', padding: '8px 12px', background: 'var(--cream-pale)', borderRadius: '4px', borderLeft: '3px solid var(--gold)', marginBottom: '12px', lineHeight: 1.5 }}>{coError}</div>
                    )}

                    {(() => {
                      const due = transactions.filter(t => t.status === 'due');
                      if (due.length === 0) return null;
                      const dayNames = Object.fromEntries(DAY_KEYS.map(k => [k, DAY_CONFIG[k].fullLabel]));
                      const methodOpts = [['cash', 'Cash'], ['transfer', 'Transfer'], ['card', 'Card'], ['other', 'Other']];
                      return (
                        <div style={{ marginBottom: '22px' }}>
                          <div style={{ fontWeight: 700, fontSize: '14px', letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--danger)', marginBottom: '4px' }}>To invoice ({due.length})</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '12px', lineHeight: 1.5 }}>Outstanding charges — chukkas owed by players on a roster, plus lessons booked to settle later. Mark paid once settled (this draws down any subsidy pots), or Void the charge if it's no longer owed.</div>
                          {DAY_KEYS.filter(dk => due.some(t => t.day === dk && t.kind !== 'lesson' && t.kind !== 'entry')).map(dk => (
                            <div key={dk} style={{ marginBottom: '12px' }}>
                              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '6px' }}>{dayNames[dk] || dk}</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {due.filter(t => t.day === dk && t.kind !== 'lesson' && t.kind !== 'entry').map(t => (
                                  <div key={t.id} style={{ border: '1px solid var(--danger)', borderRadius: '6px', padding: '10px 12px', background: '#fff' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                                      <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>{t.playerName}</span>
                                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--danger)' }}>£{fmtMoney(t.total)}</span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                                      {t.chukkas} chukka{t.chukkas === 1 ? '' : 's'}{t.ponyLevel === 'none' ? ' · own pony' : ' · pony hire'}{t.subsidyDeductions && t.subsidyDeductions.length ? ` · ${t.subsidyDeductions.map(d => `${d.name} −£${fmtMoney(d.amount)}`).join(', ')}` : ''}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                                      <select value={dueMethod[t.id] || 'cash'} onChange={e => setDueMethod({ ...dueMethod, [t.id]: e.target.value })} className="input-field select-field" style={{ flex: 1, padding: '8px', fontSize: '12px' }}>
                                        {methodOpts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                                      </select>
                                      <button onClick={() => markDuePaid(t.id, dueMethod[t.id] || 'cash')} style={{ background: 'var(--burgundy)', color: 'var(--cream)', border: 'none', padding: '8px 14px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', cursor: 'pointer' }}>Mark paid</button>
                                      <button onClick={() => voidDue(t.id)} title="Remove this charge" style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--muted)', padding: '8px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Void</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                          {due.some(t => t.kind === 'lesson') && (
                            <div style={{ marginBottom: '12px' }}>
                              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '6px' }}>Lessons</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {due.filter(t => t.kind === 'lesson').map(t => (
                                  <div key={t.id} style={{ border: '1px solid var(--danger)', borderRadius: '6px', padding: '10px 12px', background: '#fff' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                                      <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>{t.playerName}</span>
                                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--danger)' }}>£{fmtMoney(t.total)}</span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                                      {t.lessonLabel || 'Lesson'}{t.studentRate ? ' · student rate' : ''}{t.subsidyDeductions && t.subsidyDeductions.length ? ` · ${t.subsidyDeductions.map(d => `${d.name} −£${fmtMoney(d.amount)}`).join(', ')}` : ''}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                                      <select value={dueMethod[t.id] || 'cash'} onChange={e => setDueMethod({ ...dueMethod, [t.id]: e.target.value })} className="input-field select-field" style={{ flex: 1, padding: '8px', fontSize: '12px' }}>
                                        {methodOpts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                                      </select>
                                      <button onClick={() => markDuePaid(t.id, dueMethod[t.id] || 'cash')} style={{ background: 'var(--burgundy)', color: 'var(--cream)', border: 'none', padding: '8px 14px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', cursor: 'pointer' }}>Mark paid</button>
                                      <button onClick={() => voidDue(t.id)} title="Remove this charge" style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--muted)', padding: '8px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Void</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {due.some(t => t.kind === 'entry') && (
                            <div style={{ marginBottom: '12px' }}>
                              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '6px' }}>Tournament entries</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {due.filter(t => t.kind === 'entry').map(t => (
                                  <div key={t.id} style={{ border: '1px solid var(--danger)', borderRadius: '6px', padding: '10px 12px', background: '#fff' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                                      <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>{t.team || 'Team'}</span>
                                      <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--danger)' }}>£{fmtMoney(t.total)}</span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                                      {t.fixtureName || 'Fixture'} · {ENTRY_CATEGORY_LABEL[t.category] || t.category} · {t.entryLabel}{t.contact ? ` · ${t.contact}` : ''}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                                      <select value={dueMethod[t.id] || 'transfer'} onChange={e => setDueMethod({ ...dueMethod, [t.id]: e.target.value })} className="input-field select-field" style={{ flex: 1, padding: '8px', fontSize: '12px' }}>
                                        {methodOpts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                                      </select>
                                      <button onClick={() => markDuePaid(t.id, dueMethod[t.id] || 'transfer')} style={{ background: 'var(--burgundy)', color: 'var(--cream)', border: 'none', padding: '8px 14px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', cursor: 'pointer' }}>Mark paid</button>
                                      <button onClick={() => voidDue(t.id)} title="Remove this charge" style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--muted)', padding: '8px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Void</button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div style={{ fontWeight: 600, fontSize: '12px', letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '8px' }}>Take a payment manually</div>
                    <label style={{ fontSize: '12px', color: 'var(--muted)' }}>Player
                      <select className="input-field select-field" value={checkout.playerId} onChange={e => {
                        setCoError('');
                        const pid = e.target.value;
                        const player = playerDb.find(p => p.id === pid);
                        let lvl = checkout.ponyLevel;
                        if (player) {
                          for (const dk of DAY_KEYS) {
                            const entry = (rosters[dk] || []).find(r => (r.name || '').trim().toLowerCase() === (player.name || '').trim().toLowerCase());
                            if (entry) { lvl = entry.ponyHire === false ? 'none' : 'club'; break; }
                          }
                        }
                        setCheckout({ ...checkout, playerId: pid, ponyLevel: lvl });
                      }} style={{ padding: '11px 8px', fontSize: '14px', marginTop: '4px' }}>
                        <option value="">Select a registered player…</option>
                        {playerDb.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(p => (
                          <option key={p.id} value={p.id}>{p.name}{membershipById(p.membership || 'none').chukkasIncluded ? ' · member' : ''}</option>
                        ))}
                      </select>
                    </label>

                    {pl && (
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '12px', color: bd.freeToRoster ? 'var(--burgundy)' : 'var(--muted)' }}>
                          {membershipById(pl.membership || 'none').label}{pl.student ? ' · student' : ''}
                          {bd.freeToRoster ? ' — no charge' : ` — £${fmtMoney(bd.total)}`}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <select className="input-field select-field" value={checkout.day} onChange={e => setCheckout({ ...checkout, day: e.target.value })} style={{ flex: 1, padding: '11px 8px', fontSize: '14px' }}>
                            {DAY_KEYS.map(d => <option key={d} value={d}>{dayLabels[d] || d}</option>)}
                          </select>
                          <select className="input-field select-field" value={checkout.chukkas} onChange={e => setCheckout({ ...checkout, chukkas: e.target.value })} style={{ width: '110px', flexShrink: 0, padding: '11px 8px', fontSize: '14px' }}>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(c => <option key={c} value={String(c)}>{c} chukka{c === 1 ? '' : 's'}</option>)}
                          </select>
                        </div>

                        <select className="input-field select-field" value={checkout.ponyLevel} onChange={e => setCheckout({ ...checkout, ponyLevel: e.target.value })} style={{ padding: '11px 8px', fontSize: '14px' }}>
                          {ponyOpts.map(([k, l]) => <option key={k} value={k}>{k === 'none' ? l : `Pony hire: ${l} (£${PONY_HIRE_2026[k]})`}</option>)}
                        </select>

                        {bd.freeToRoster ? (
                          <div style={{ fontSize: '13px', color: 'var(--burgundy)', padding: '12px', background: 'var(--cream-pale)', borderRadius: '6px', border: '1px solid var(--line)' }}>
                            No charge for this booking — they'll be added straight to the roster.
                          </div>
                        ) : (
                          <>
                            <div style={{ border: '1px solid var(--line)', borderRadius: '6px', padding: '12px 14px', background: 'var(--cream-pale)', fontSize: '13px', color: 'var(--ink)' }}>
                              {bd.ponyHire > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>Pony hire × {n}</span><span>£{fmtMoney(bd.ponyHire * n)}</span></div>}
                              {bd.chukkaFee > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}><span>Chukka fee × {n}</span><span>£{fmtMoney(bd.chukkaFee * n)}</span></div>}
                              {bd.studentDiscount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: 'var(--muted)' }}><span>Student discount × {n}</span><span>−£{fmtMoney(bd.studentDiscount)}</span></div>}
                              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0', marginTop: '6px', borderTop: '1px solid var(--line)', fontWeight: 700, fontSize: '15px', color: 'var(--burgundy)' }}><span>Total</span><span>£{fmtMoney(bd.total)}</span></div>
                            </div>
                            <select className="input-field select-field" value={checkout.method} onChange={e => setCheckout({ ...checkout, method: e.target.value })} style={{ padding: '11px 8px', fontSize: '14px' }}>
                              {methods.map(([k, l]) => <option key={k} value={k}>Paid by: {l}</option>)}
                            </select>
                            <input className="input-field" type="text" placeholder="Note (optional)" value={checkout.note} onChange={e => setCheckout({ ...checkout, note: e.target.value })} style={{ padding: '11px 13px', fontSize: '14px' }} />
                          </>
                        )}

                        <button onClick={doMarkPaid} style={{ background: 'var(--burgundy)', color: 'var(--cream)', border: 'none', padding: '13px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>
                          {bd.freeToRoster ? `Add to ${dayLabels[checkout.day] || checkout.day} roster` : `Mark paid £${fmtMoney(bd.total)} & add to roster`}
                        </button>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '22px 0 8px' }}>
                      <div style={{ fontWeight: 600, fontSize: '12px', letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--muted)' }}>Recent payments</div>
                      {transactions.filter(t => t.status !== 'due').length > 0 && (
                        <button onClick={clearHistory} style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--muted)', padding: '5px 10px', borderRadius: '4px', fontSize: '10px', letterSpacing: '0.5px', textTransform: 'uppercase', cursor: 'pointer' }}>Clear</button>
                      )}
                    </div>
                    {transactions.filter(t => t.status !== 'due').length === 0 ? (
                      <div style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', padding: '16px 12px' }}>No payments recorded yet.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {transactions.filter(t => t.status !== 'due').slice(0, 25).map(tx => (
                          <div key={tx.id} style={{ border: '1px solid var(--line)', borderRadius: '6px', padding: '10px 12px', background: '#fff' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                              <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>{tx.kind === 'entry' ? (tx.team || 'Team') : tx.playerName}</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--burgundy)' }}>£{fmtMoney(tx.total)}</span>
                                <button onClick={() => deleteTx(tx.id)} title="Remove this record" style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '16px', lineHeight: 1, cursor: 'pointer', padding: '0 2px' }}>×</button>
                              </span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                              {new Date(tx.date).toLocaleDateString('en-GB')} &middot; {tx.kind === 'lesson' ? (tx.lessonLabel || 'Lesson') : tx.kind === 'entry' ? `${tx.fixtureName ? tx.fixtureName + ' · ' : ''}entry` : `${tx.chukkas} chukka${tx.chukkas === 1 ? '' : 's'}`} &middot; {tx.method}
                              {tx.subsidyDeductions && tx.subsidyDeductions.length ? ` · ${tx.subsidyDeductions.map(d => `${d.name} −£${fmtMoney(d.amount)}`).join(', ')}` : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {playersView === 'lessons' && (() => {
                const sortedPl = [...playerDb].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                const pl = playerDb.find(p => p.id === lesson.playerId);
                const bd = pl ? priceLesson(pl, lesson.lessonId) : null;
                const ok = lessonError && (lessonError.indexOf('Recorded') === 0 || lessonError.indexOf('Booked') === 0);
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                      Book and take payment for a coaching session. Student players get the student rate; any subsidy pots assigned to the player are drawn down against the lesson.
                    </div>
                    <label style={{ fontSize: '12px', color: 'var(--muted)' }}>Player
                      <select className="select-field" value={lesson.playerId} onChange={e => { setLessonError(''); setLesson({ ...lesson, playerId: e.target.value }); }} style={{ padding: '11px 13px', fontSize: '14px', marginTop: '4px' }}>
                        <option value="">— Select player —</option>
                        {sortedPl.map(p => (
                          <option key={p.id} value={p.id}>{p.name}{p.student ? ' (Stu)' : ''}{(p.subsidies || []).length ? ' ★' : ''}</option>
                        ))}
                      </select>
                    </label>
                    {playerDb.length === 0 && (
                      <div style={{ fontSize: '12px', color: 'var(--danger)' }}>No players yet — add them under the Players tab first.</div>
                    )}
                    <label style={{ fontSize: '12px', color: 'var(--muted)' }}>Lesson
                      <select className="select-field" value={lesson.lessonId} onChange={e => { setLessonError(''); setLesson({ ...lesson, lessonId: e.target.value }); }} style={{ padding: '11px 13px', fontSize: '14px', marginTop: '4px' }}>
                        {LESSON_TYPES_2026.map(l => (
                          <option key={l.id} value={l.id}>{l.label} — £{l.std} / £{l.student} student</option>
                        ))}
                      </select>
                    </label>
                    {bd && (
                      <div style={{ border: '1px solid var(--line)', borderRadius: '6px', padding: '12px 14px', background: 'var(--cream-pale)', fontSize: '13px', color: 'var(--ink)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                          <span>{bd.lessonLabel} ({bd.studentRate ? 'student' : 'standard'} rate)</span><span>£{fmtMoney(bd.base)}</span>
                        </div>
                        {bd.subsidyDeductions.map(d => (
                          <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: d.capped ? 'var(--danger)' : 'var(--muted)' }}>
                            <span>{d.name}{d.capped ? ' (pot capped)' : ''}</span><span>−£{fmtMoney(d.amount)}</span>
                          </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0 0', marginTop: '4px', borderTop: '1px solid var(--line)', fontWeight: 700 }}>
                          <span>Total</span><span>£{fmtMoney(bd.total)}</span>
                        </div>
                      </div>
                    )}
                    <label style={{ fontSize: '12px', color: 'var(--muted)' }}>Method
                      <select className="select-field" value={lesson.method} onChange={e => setLesson({ ...lesson, method: e.target.value })} style={{ padding: '11px 13px', fontSize: '14px', marginTop: '4px' }}>
                        <option value="cash">Cash</option>
                        <option value="transfer">Bank transfer</option>
                        <option value="card">Card</option>
                        <option value="other">Other</option>
                      </select>
                    </label>
                    <input className="input-field" placeholder="Note (optional)" value={lesson.note} onChange={e => setLesson({ ...lesson, note: e.target.value })} style={{ padding: '11px 13px', fontSize: '13px' }} />
                    {lessonError && (
                      <div style={{ fontSize: '12px', color: ok ? 'var(--burgundy)' : 'var(--danger)', background: ok ? '#f2f6f2' : '#fbf2f2', border: `1px solid ${ok ? 'var(--line)' : 'var(--danger)'}`, borderRadius: '6px', padding: '9px 12px' }}>{lessonError}</div>
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={doLessonPaid} disabled={!pl} style={{ flex: 1, background: pl ? 'var(--burgundy)' : 'var(--line)', color: 'var(--cream)', border: 'none', padding: '13px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', cursor: pl ? 'pointer' : 'not-allowed' }}>
                        {pl && bd ? `Mark paid £${fmtMoney(bd.total)}` : 'Mark paid'}
                      </button>
                      <button onClick={doLessonDue} disabled={!pl} style={{ flex: 1, background: 'transparent', color: pl ? 'var(--burgundy)' : 'var(--muted)', border: `1px solid ${pl ? 'var(--burgundy)' : 'var(--line)'}`, padding: '13px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', cursor: pl ? 'pointer' : 'not-allowed' }}>
                        Book — invoice later
                      </button>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '-4px' }}>“Book — invoice later” adds the charge to the Checkout “To invoice” list; pots are drawn down when you settle it.</div>
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === 'teams' && captainMode && (() => {
            const opts = entryOptions(teamReg.category);
            const sel = entryOptionById(teamReg.category, teamReg.optionId) || opts[0];
            const fee = sel ? sel.fee : 0;
            const ready = !!(teamReg.fixtureId && (teamReg.team || '').trim() && sel);
            const ok = teamRegError && (teamRegError.indexOf('Recorded') === 0 || teamRegError.indexOf('Registered') === 0);
            const knownTeams = Array.from(new Set([
              ...Object.values(teamsDb || {}).map(t => t && t.name).filter(Boolean),
              ...Object.values(teamSignups || {}).flatMap(list => Array.isArray(list) ? list.map(s => s && s.team) : []).filter(Boolean),
            ])).sort((a, b) => a.localeCompare(b));
            const entries = transactions.filter(t => t.kind === 'entry');
            const fixtureIds = Array.from(new Set(entries.map(e => e.fixtureId)));
            return (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px', lineHeight: 1.5 }}>
                  Register a team into a tournament and take the entry fee. Fees come from the 2026 price list by category and handicap band. Pay now, or invoice later and settle from Checkout.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--muted)' }}>Fixture
                    <select className="input-field select-field" value={teamReg.fixtureId} onChange={e => { setTeamRegError(''); setTeamReg({ ...teamReg, fixtureId: e.target.value }); }} style={{ padding: '11px 8px', fontSize: '14px', marginTop: '4px' }}>
                      <option value="">— Select fixture —</option>
                      {fixtures.map(f => <option key={f.id} value={f.id}>{f.date} — {f.name}</option>)}
                    </select>
                  </label>
                  <label style={{ fontSize: '12px', color: 'var(--muted)' }}>Team
                    <input className="input-field" list="teamreg-teams" placeholder="Team name" value={teamReg.team} onChange={e => { setTeamRegError(''); setTeamReg({ ...teamReg, team: e.target.value }); }} style={{ padding: '11px 13px', fontSize: '14px', marginTop: '4px' }} />
                    <datalist id="teamreg-teams">{knownTeams.map(n => <option key={n} value={n} />)}</datalist>
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <label style={{ flex: 1, fontSize: '12px', color: 'var(--muted)' }}>Contact (optional)
                      <input className="input-field" placeholder="Captain / contact" value={teamReg.contact} onChange={e => setTeamReg({ ...teamReg, contact: e.target.value })} style={{ padding: '11px 13px', fontSize: '14px', marginTop: '4px' }} />
                    </label>
                    <label style={{ flex: 1, fontSize: '12px', color: 'var(--muted)' }}>Mobile (optional)
                      <input className="input-field" inputMode="tel" placeholder="07…" value={teamReg.mobile} onChange={e => setTeamReg({ ...teamReg, mobile: e.target.value })} style={{ padding: '11px 13px', fontSize: '14px', marginTop: '4px' }} />
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <label style={{ flex: 1, fontSize: '12px', color: 'var(--muted)' }}>Category
                      <select className="input-field select-field" value={teamReg.category} onChange={e => { const c = e.target.value; const first = (entryOptions(c)[0] || {}).id || ''; setTeamRegError(''); setTeamReg({ ...teamReg, category: c, optionId: first }); }} style={{ padding: '11px 8px', fontSize: '14px', marginTop: '4px' }}>
                        <option value="member">Members</option>
                        <option value="nonmember">Non-Members</option>
                        <option value="student">Student</option>
                      </select>
                    </label>
                    <label style={{ flex: 1.4, fontSize: '12px', color: 'var(--muted)' }}>Entry band
                      <select className="input-field select-field" value={teamReg.optionId} onChange={e => { setTeamRegError(''); setTeamReg({ ...teamReg, optionId: e.target.value }); }} style={{ padding: '11px 8px', fontSize: '14px', marginTop: '4px' }}>
                        {opts.map(o => <option key={o.id} value={o.id}>{o.label} — £{o.fee}</option>)}
                      </select>
                    </label>
                  </div>
                  {sel && (
                    <div style={{ border: '1px solid var(--line)', borderRadius: '6px', padding: '12px 14px', background: 'var(--cream-pale)', fontSize: '13px', color: 'var(--ink)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{ENTRY_CATEGORY_LABEL[teamReg.category]} · {sel.label}</span>
                        <span style={{ fontWeight: 700 }}>£{fmtMoney(fee)}</span>
                      </div>
                    </div>
                  )}
                  <label style={{ fontSize: '12px', color: 'var(--muted)' }}>Method
                    <select className="input-field select-field" value={teamReg.method} onChange={e => setTeamReg({ ...teamReg, method: e.target.value })} style={{ padding: '11px 8px', fontSize: '14px', marginTop: '4px' }}>
                      <option value="cash">Cash</option>
                      <option value="transfer">Bank transfer</option>
                      <option value="card">Card</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <input className="input-field" placeholder="Note (optional)" value={teamReg.note} onChange={e => setTeamReg({ ...teamReg, note: e.target.value })} style={{ padding: '11px 13px', fontSize: '13px' }} />
                  {teamRegError && (
                    <div style={{ fontSize: '12px', color: ok ? 'var(--burgundy)' : 'var(--danger)', background: ok ? '#f2f6f2' : '#fbf2f2', border: `1px solid ${ok ? 'var(--line)' : 'var(--danger)'}`, borderRadius: '6px', padding: '9px 12px' }}>{teamRegError}</div>
                  )}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={doEntryPaid} disabled={!ready} style={{ flex: 1, background: ready ? 'var(--burgundy)' : 'var(--line)', color: 'var(--cream)', border: 'none', padding: '13px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', cursor: ready ? 'pointer' : 'not-allowed' }}>
                      {ready ? `Mark paid £${fmtMoney(fee)}` : 'Mark paid'}
                    </button>
                    <button onClick={doEntryDue} disabled={!ready} style={{ flex: 1, background: 'transparent', color: ready ? 'var(--burgundy)' : 'var(--muted)', border: `1px solid ${ready ? 'var(--burgundy)' : 'var(--line)'}`, padding: '13px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', cursor: ready ? 'pointer' : 'not-allowed' }}>
                      Register — invoice later
                    </button>
                  </div>
                </div>
                {entries.length > 0 && (
                  <div style={{ marginTop: '24px' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--burgundy)', marginBottom: '10px' }}>Registered teams ({entries.length})</div>
                    {fixtureIds.map(fid => {
                      const list = entries.filter(e => e.fixtureId === fid);
                      const fxLabel = (list[0] && list[0].fixtureName) || (fixtures.find(f => f.id === fid) || {}).name || 'Fixture';
                      return (
                        <div key={fid || 'none'} style={{ marginBottom: '14px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '6px' }}>{fxLabel}</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {list.map(t => (
                              <div key={t.id} style={{ border: `1px solid ${t.status === 'due' ? 'var(--danger)' : 'var(--line)'}`, borderRadius: '6px', padding: '10px 12px', background: '#fff' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                                  <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--ink)' }}>{t.team}</span>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontWeight: 700, fontSize: '14px', color: t.status === 'due' ? 'var(--danger)' : 'var(--burgundy)' }}>£{fmtMoney(t.total)}</span>
                                    <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: t.status === 'due' ? 'var(--danger)' : 'var(--burgundy)' }}>{t.status === 'due' ? 'Due' : 'Paid'}</span>
                                  </span>
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                                  {ENTRY_CATEGORY_LABEL[t.category] || t.category} · {t.entryLabel}{t.contact ? ` · ${t.contact}` : ''}{t.mobile ? ` · ${t.mobile}` : ''}{t.status !== 'due' && t.method ? ` · ${t.method}` : ''}
                                </div>
                                {t.status === 'due' ? (
                                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                                    <select value={dueMethod[t.id] || 'transfer'} onChange={e => setDueMethod({ ...dueMethod, [t.id]: e.target.value })} className="input-field select-field" style={{ flex: 1, padding: '8px', fontSize: '12px' }}>
                                      <option value="cash">Cash</option><option value="transfer">Transfer</option><option value="card">Card</option><option value="other">Other</option>
                                    </select>
                                    <button onClick={() => markDuePaid(t.id, dueMethod[t.id] || 'transfer')} style={{ background: 'var(--burgundy)', color: 'var(--cream)', border: 'none', padding: '8px 14px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', cursor: 'pointer' }}>Mark paid</button>
                                    <button onClick={() => voidDue(t.id)} title="Remove this charge" style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--muted)', padding: '8px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Void</button>
                                  </div>
                                ) : (
                                  <div style={{ marginTop: '8px', textAlign: 'right' }}>
                                    <button onClick={() => deleteTx(t.id)} style={{ background: 'transparent', border: '1px solid var(--line)', color: 'var(--muted)', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Remove record</button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

        </main>

        <footer style={{ textAlign: 'center', padding: '22px 20px', borderTop: '1px solid var(--line)', fontSize: '10px', color: 'var(--muted)', letterSpacing: '2px', textTransform: 'uppercase', background: 'var(--cream-warm)' }}>
          <div>Druids Lodge Polo Club · Druids Lodge, Salisbury, Wiltshire SP3 4UN</div>
          <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', textTransform: 'none', letterSpacing: '0.4px', fontSize: '11px' }}>
            <a href="tel:+441722782597" style={{ color: 'var(--muted)', textDecoration: 'none' }}>01722 782597</a>
            <span style={{ opacity: 0.3 }}>·</span>
            <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'var(--muted)', textDecoration: 'none' }}>{CONTACT_EMAIL}</a>
            <span style={{ opacity: 0.3 }}>·</span>
            <a href="https://www.druidspolo.co.uk" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--muted)', textDecoration: 'none' }}>druidspolo.co.uk</a>
          </div>
          <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', textTransform: 'none', letterSpacing: '0.4px', fontSize: '11px' }}>
            <a href="https://www.instagram.com/druidslodgepolo/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Instagram</a>
            <span style={{ opacity: 0.3 }}>·</span>
            <a href="https://www.facebook.com/druidslodgepolo/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--muted)', textDecoration: 'none' }}>Facebook</a>
          </div>
          <div style={{ marginTop: '10px', fontSize: '9px', opacity: 0.7 }}>© ACT Systems Ltd. 2026</div>
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setPrivacyOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                fontSize: '10px',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                cursor: 'pointer',
                padding: 0,
                opacity: 0.7,
              }}
            >
              Privacy
            </button>
            <span style={{ opacity: 0.3 }}>·</span>
            {captainMode ? (
              <>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--burgundy)', fontWeight: 600 }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--burgundy)', display: 'inline-block' }} />
                  Captain mode
                </span>
                <button
                  onClick={lockCaptainMode}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    fontSize: '10px',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px',
                  }}
                >
                  Lock
                </button>
              </>
            ) : (
              <button
                onClick={openPinModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: '10px',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  padding: 0,
                  opacity: 0.6,
                }}
              >
                captain
              </button>
            )}
          </div>
        </footer>

        {/* Floating refresh button — fixed bottom-right, respects iPhone safe area */}
        <button
          onClick={hardRefresh}
          disabled={refreshing}
          aria-label={refreshing ? 'Refreshing…' : 'Refresh app'}
          title="Refresh"
          style={{
            position: 'fixed',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
            right: 'calc(env(safe-area-inset-right, 0px) + 16px)',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: '#ffffff',
            border: '1px solid rgba(107, 31, 42, 0.6)',
            color: 'var(--burgundy, #231F20)',
            fontSize: '20px',
            fontWeight: 600,
            lineHeight: 1,
            cursor: refreshing ? 'progress' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation',
            zIndex: 90,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              transformOrigin: 'center',
              animation: refreshing ? 'spin 0.7s linear infinite' : 'none',
            }}
          >
            ↻
          </span>
        </button>

        {/* PIN modal — captain access */}
        {pinModalOpen && (
          <div className="share-backdrop" onClick={() => setPinModalOpen(false)}>
            <div className="share-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '340px' }}>
              <div className="share-head">
                <h3>Captain access</h3>
                <button className="share-close" onClick={() => setPinModalOpen(false)} aria-label="Close">×</button>
              </div>
              <div className="share-body">
                <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--muted)', lineHeight: 1.55, textAlign: 'center' }}>
                  Enter the 4-digit captain PIN to unlock team management.
                </p>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && pinInput.length === 4) submitPin(); }}
                  autoFocus
                  style={{
                    width: '100%',
                    textAlign: 'center',
                    fontSize: '32px',
                    letterSpacing: '14px',
                    padding: '14px 0 14px 14px',
                    border: '1px solid var(--line)',
                    borderRadius: '4px',
                    fontFamily: "'Outfit', sans-serif",
                    color: 'var(--ink)',
                    background: '#fff',
                    boxSizing: 'border-box',
                  }}
                />
                {pinError && (
                  <div style={{ color: 'var(--danger)', fontSize: '13px', marginTop: '10px', textAlign: 'center' }}>
                    {pinError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
                  <button className="btn-secondary" onClick={() => setPinModalOpen(false)} style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button
                    onClick={submitPin}
                    disabled={pinInput.length !== 4}
                    style={{
                      flex: 1,
                      background: pinInput.length === 4 ? '#231F20' : '#bbb',
                      color: '#FAF9F7',
                      border: 'none',
                      padding: '12px 14px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      cursor: pinInput.length === 4 ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Unlock
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Privacy notice modal */}
        {privacyOpen && (
          <div className="share-backdrop" onClick={() => setPrivacyOpen(false)}>
            <div
              className="share-modal"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '520px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
            >
              <div className="share-head">
                <h3>Privacy notice</h3>
                <button className="share-close" onClick={() => setPrivacyOpen(false)} aria-label="Close">×</button>
              </div>
              <div
                className="share-body"
                style={{
                  overflowY: 'auto',
                  fontSize: '13px',
                  lineHeight: 1.6,
                  color: 'var(--ink)',
                  textAlign: 'left',
                  paddingRight: '4px',
                }}
              >
                <p style={{ marginTop: 0, fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                  Last updated: May 2026
                </p>
                <p>
                  This notice explains how the Committee of Druids Lodge Polo Club handles your personal information when you use this club chukkas booking page. We aim to comply with UK GDPR and the Data Protection Act 2018.
                </p>

                <h4 style={{ marginBottom: '4px', fontFamily: "'Fraunces', serif", fontSize: '15px' }}>Who we are</h4>
                <p style={{ marginTop: 0 }}>
                  The Committee of Druids Lodge Polo Club, Salisbury, Wiltshire is the data controller for the information you provide via this page. For any privacy queries — including requests to access, correct or delete your data — contact the Club Captain.
                </p>

                <h4 style={{ marginBottom: '4px', fontFamily: "'Fraunces', serif", fontSize: '15px' }}>What we collect</h4>
                <ul style={{ marginTop: 0, paddingLeft: '18px' }}>
                  <li>Your name (when you sign up to play or register interest in a fixture)</li>
                  <li>Your mobile number (optional — only if you choose to give it)</li>
                  <li>Your polo handicap</li>
                  <li>How many chukkas you'd like to play, and your earliest available start time</li>
                </ul>

                <h4 style={{ marginBottom: '4px', fontFamily: "'Fraunces', serif", fontSize: '15px' }}>Why we collect it</h4>
                <p style={{ marginTop: 0 }}>
                  Solely to organise club chukkas and 2026 club fixtures. The Captain uses your details to draw balanced teams and chukka schedules, contact you about your booking when necessary, and track who is interested in upcoming matches. Our lawful basis for processing is <strong>legitimate interest</strong> — coordinating member play at a sports club — under Article 6(1)(f) of UK GDPR.
                </p>

                <h4 style={{ marginBottom: '4px', fontFamily: "'Fraunces', serif", fontSize: '15px' }}>Where it's stored</h4>
                <p style={{ marginTop: 0 }}>
                  Data is stored in Google Cloud Firestore, hosted within the EU region. Google Cloud Platform is a UK GDPR-compliant processor that publishes its own data protection terms. We do not transfer your data outside the EU/UK in normal operation.
                </p>

                <h4 style={{ marginBottom: '4px', fontFamily: "'Fraunces', serif", fontSize: '15px' }}>Who can see it</h4>
                <ul style={{ marginTop: 0, paddingLeft: '18px' }}>
                  <li><strong>Mobile numbers</strong> are visible only to the Captain (PIN-protected)</li>
                  <li><strong>Names and handicaps</strong> on the roster are visible to anyone with the page URL — this is intentional, so members can see who's signed up</li>
                  <li>The Captain can see and edit everything via the PIN-gated management view</li>
                </ul>

                <h4 style={{ marginBottom: '4px', fontFamily: "'Fraunces', serif", fontSize: '15px' }}>How long we keep it</h4>
                <p style={{ marginTop: 0 }}>
                  Roster entries are overwritten when the Captain clears the roster for the next week. The members directory (names + handicaps for autofill) is retained while this booking page is in use. Fixture interest data is retained until the end of the 2026 season. You can request earlier deletion at any time.
                </p>

                <h4 style={{ marginBottom: '4px', fontFamily: "'Fraunces', serif", fontSize: '15px' }}>Your rights</h4>
                <p style={{ marginTop: 0, marginBottom: '4px' }}>
                  Under UK GDPR you have the right to:
                </p>
                <ul style={{ marginTop: 0, paddingLeft: '18px' }}>
                  <li>Access the personal data we hold about you</li>
                  <li>Have inaccurate data corrected</li>
                  <li>Request deletion of your data</li>
                  <li>Object to processing or restrict it</li>
                  <li>Lodge a complaint with the UK Information Commissioner's Office at{' '}
                    <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--burgundy)' }}>ico.org.uk</a>
                  </li>
                </ul>
                <p>
                  To exercise any of these rights, ask the Club Captain to remove or amend your details — typically done in person at the club or via WhatsApp.
                </p>

                <h4 style={{ marginBottom: '4px', fontFamily: "'Fraunces', serif", fontSize: '15px' }}>Cookies and tracking</h4>
                <p style={{ marginTop: 0 }}>
                  This page does not set tracking cookies or run analytics. We use your browser's session storage only to remember whether you've entered the Captain PIN (cleared automatically when you close the tab).
                </p>

                <h4 style={{ marginBottom: '4px', fontFamily: "'Fraunces', serif", fontSize: '15px' }}>Children</h4>
                <p style={{ marginTop: 0 }}>
                  This page is intended for use by polo-playing members of the club, who are typically adults. If a member under 18 wishes to sign up, a parent or guardian should do so on their behalf or contact the Captain directly.
                </p>

                <h4 style={{ marginBottom: '4px', fontFamily: "'Fraunces', serif", fontSize: '15px' }}>Changes to this notice</h4>
                <p style={{ marginTop: 0 }}>
                  We may update this notice from time to time. The "Last updated" date at the top reflects the most recent version. Material changes will be communicated to members via the WhatsApp group.
                </p>
              </div>
              <div style={{ padding: '14px 18px', borderTop: '1px solid var(--line)' }}>
                <button
                  onClick={() => setPrivacyOpen(false)}
                  style={{
                    width: '100%',
                    background: '#231F20',
                    color: '#FAF9F7',
                    border: 'none',
                    padding: '12px 14px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation modal — used for destructive actions (Clear roster, Replace roster) */}
        {confirmModal && (
          <div className="share-backdrop" onClick={() => setConfirmModal(null)}>
            <div className="share-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px' }}>
              <div className="share-head">
                <h3>{confirmModal.title}</h3>
                <button className="share-close" onClick={() => setConfirmModal(null)} aria-label="Close">×</button>
              </div>
              <div className="share-body">
                <p style={{ margin: '0 0 18px', fontSize: '14px', color: 'var(--ink)', lineHeight: 1.55 }}>
                  {confirmModal.message}
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn-secondary" onClick={() => setConfirmModal(null)} style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button
                    onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
                    style={{
                      flex: 1,
                      background: '#231F20',
                      color: '#FAF9F7',
                      border: 'none',
                      padding: '12px 14px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                  >
                    {confirmModal.confirmLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
