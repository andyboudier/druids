// The Home screen's look, carried across the whole app: the club's burgundy,
// gold and cream on a near-black ground, Fraunces for names and numbers.
//
// It is an overlay, not a rewrite. PoloChukkas.jsx and the boards draw almost
// everything from the colour variables on .polo-app, so most of the work is
// giving those variables dark values here. Two of them cannot simply flip:
//   --cream is the page colour AND the text on every burgundy button, so it
//     stays cream and the page ground is set directly;
//   --burgundy is a button colour AND a text and border colour, and burgundy
//     text vanishes on near-black — so it stays for fills, and burgundy text
//     and borders are re-pointed at gold by matching the inline style that
//     names them. React writes inline styles as "prop: value; prop: value",
//     so "; color: var(--burgundy)" never matches "background-color: …".
// Hard-coded white panels (inline '#fff', which the browser serialises as
// rgb(255, 255, 255)) get the card colour the same way.
//
// Applied with the `lux` class on .polo-app, and rendered after the app's own
// stylesheet so equal selectors win. Take the class off and the app is exactly
// as it was — which is how the clubs can keep their light look if they want it.
//
// The colours are the club's own dark palette, TERMS_CLUB in terms.js, so this
// file is the same in every app.

import { TERMS_CLUB } from './terms';

const K = TERMS_CLUB.colors;
const hex = (h) => String(h || '').replace('#', '').match(/.{2}/g).map((x) => parseInt(x, 16)).join(', ');
// The app's own burgundy as the browser serialises it (rgb(107, 31, 42) for
// TPPC): it is written inline in a few places and needs re-pointing at gold.
const BURG = hex(TERMS_CLUB.burgundy || K.burg);

export const LUX_CSS = `
.polo-app.lux {
  --cream-warm: ${K.card2 || K.card};
  --cream-pale: ${K.card};
  --ink: ${K.cream};
  --muted: ${K.muted};
  --line: ${K.line};
  --danger: #e07070;
  --white-team: #efe6d0;
  --burgundy: ${K.burg};
  --lux-bg: ${K.bg};
  --lux-card: ${K.card};
  --lux-card2: ${K.card2 || K.card};
  --lux-gold: ${K.gold2};
  --lux-dim: ${K.dim || K.muted};
  background: var(--lux-bg);
  color: var(--ink);
  color-scheme: dark;
}
.polo-app.lux .app-footer { background: var(--lux-bg) !important; border-top-color: var(--line) !important; color: var(--lux-dim) !important; }
.polo-app.lux .app-footer button { color: var(--lux-dim) !important; }
.polo-app.lux .refresh-fab { background: var(--lux-card) !important; border-color: var(--gold) !important; color: var(--lux-gold) !important; }
.polo-app.lux .label-eyebrow { color: var(--muted); }

/* Burgundy text and borders read as gold on the dark ground. */
.polo-app.lux [style^="color: var(--burgundy)"],
.polo-app.lux [style*="; color: var(--burgundy)"] { color: var(--lux-gold) !important; }
.polo-app.lux [style*="solid var(--burgundy)"] { border-color: var(--gold) !important; }
.polo-app.lux [style^="color: var(--burgundy-deep)"],
.polo-app.lux [style*="; color: var(--burgundy-deep)"] { color: var(--lux-gold) !important; }
/* Ink fills (a selected chip, say) were dark-on-cream; ink is light now, so
   they take the burgundy selected look instead. */
.polo-app.lux [style*="background: var(--ink)"] { background: var(--burgundy) !important; color: var(--cream) !important; }
.polo-app.lux [style*="solid var(--ink)"] { border-color: var(--gold) !important; }
/* White panels become cards. */
.polo-app.lux [style*="background: rgb(255, 255, 255)"],
.polo-app.lux [style*="background-color: rgb(255, 255, 255)"],
.polo-app.lux [style*="background: white"] { background: var(--lux-card) !important; }

/* Surfaces */
.polo-app.lux .card { background: var(--lux-card); border-color: var(--line); border-radius: 16px; }
.polo-app.lux .share-backdrop { background: rgba(0, 0, 0, 0.66); }
.polo-app.lux .share-modal { background: var(--lux-card); border: 1px solid var(--line); border-radius: 20px; box-shadow: 0 24px 60px -12px rgba(0,0,0,.8); }
.polo-app.lux .share-head h3 { color: var(--ink); }
.polo-app.lux .share-close:hover { color: var(--ink); }

/* Inputs */
.polo-app.lux .input-field { background-color: var(--lux-card2); border-color: var(--line); color: var(--ink); border-radius: 12px; }
.polo-app.lux .input-field:focus { background-color: var(--lux-card2); border-color: var(--lux-gold); box-shadow: 0 0 0 3px color-mix(in srgb, var(--lux-gold) 18%, transparent); }
.polo-app.lux .input-field::placeholder { color: var(--lux-dim); }
/* The arrow is drawn once, at the right. Kept here as well as on the base
   .select-field because .input-field:focus is the stronger rule: without
   these the arrow tiled across the whole box the moment it was tapped. */
.polo-app.lux .select-field, .polo-app.lux .select-field:focus { background-repeat: no-repeat; background-position: right 16px center; }
.polo-app.lux .select-field { background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3e%3cpath fill='none' stroke='%23${K.muted.replace('#', '')}' stroke-width='1.5' d='M1 1.5l5 5 5-5'/%3e%3c/svg%3e"); }
.polo-app.lux select option { background: var(--lux-card); color: var(--ink); }
/* Controls styled inline rather than with .input-field (Live's pickers, the
   captain's small editors): same dark field, whatever their inline colours. */
.polo-app.lux select:not(.input-field),
.polo-app.lux textarea:not(.input-field),
.polo-app.lux input:not(.input-field):not(.hd-input):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="color"]) {
  background-color: var(--lux-card2) !important; color: var(--ink) !important; border-color: var(--line) !important;
}
.polo-app.lux select:disabled, .polo-app.lux input:disabled { opacity: .5; }
.polo-app.lux input[type="checkbox"], .polo-app.lux input[type="radio"] { accent-color: var(--gold); }
.polo-app.lux input[type="date"], .polo-app.lux input[type="time"] { color-scheme: dark; }

/* Buttons */
.polo-app.lux .btn-primary { border: 1px solid var(--gold); border-radius: 14px; box-shadow: 0 10px 24px -14px rgba(${BURG}, .9); }
.polo-app.lux .btn-secondary { color: var(--lux-gold); border-color: var(--gold); border-radius: 14px; }
.polo-app.lux .btn-secondary:hover { background: var(--burgundy); color: var(--cream); }

/* Chukkas tab */
.polo-app.lux .day-menu-btn { background: var(--lux-card); border-color: var(--line); color: var(--ink); border-radius: 14px; }
.polo-app.lux .day-menu-btn:hover { border-color: var(--gold); }
.polo-app.lux .day-menu-btn.active { background: var(--lux-card2); border-color: var(--lux-gold); }
.polo-app.lux .day-menu-btn.active .day-menu-day { color: var(--lux-gold); }
.polo-app.lux .day-menu-btn.active .day-menu-blurb { color: var(--muted); }
.polo-app.lux .player-row { background: var(--lux-card); border-color: var(--line); border-radius: 14px; }
.polo-app.lux .player-row:hover { background: var(--lux-card2); }
.polo-app.lux .handicap-badge { background: var(--lux-card2); color: var(--lux-gold); border-color: var(--line); }
.polo-app.lux .chukka-pill { background: var(--lux-card2); color: var(--ink); border-color: var(--line); }
.polo-app.lux .step-btn { background: var(--lux-card2); color: var(--ink); border-color: var(--line); }
.polo-app.lux .step-btn:hover:not(:disabled) { border-color: var(--lux-gold); color: var(--lux-gold); }
.polo-app.lux .remove-btn:hover { color: var(--danger); }
.polo-app.lux .segmented { background: var(--lux-card2); border-color: var(--line); }
.polo-app.lux .seg-btn { color: var(--muted); }
.polo-app.lux .seg-btn.active { background: var(--burgundy); color: var(--cream); }
.polo-app.lux .pref-tag { background: var(--lux-card2); color: var(--muted); border-color: var(--line); }
.polo-app.lux .team-card { background: var(--lux-card); border-color: var(--line); }
.polo-app.lux .chukka-card { background: var(--lux-card); border-color: var(--line); border-radius: 16px; }
.polo-app.lux .chukka-head { background: var(--lux-card2); border-color: var(--line); }
.polo-app.lux .chukka-num, .polo-app.lux .chukka-time { color: var(--ink); }
.polo-app.lux .team-mini-row:hover { background: var(--lux-card2); }
.polo-app.lux .team-mini-row.selected { background: var(--lux-card2); }
.polo-app.lux .action-bar { background: var(--lux-card); border-color: var(--line); }
.polo-app.lux .action-btn { background: var(--lux-card2); color: var(--ink); border-color: var(--line); }
.polo-app.lux .action-btn:hover:not(:disabled) { border-color: var(--lux-gold); color: var(--lux-gold); }
.polo-app.lux .add-trigger, .polo-app.lux .add-pick { background: var(--lux-card2); color: var(--ink); border-color: var(--line); }
.polo-app.lux .suggestion-chip { background: var(--lux-card2); color: var(--ink); border-color: var(--line); }
.polo-app.lux .suggestion-chip:hover { border-color: var(--lux-gold); }
.polo-app.lux .view-toggle { background: var(--lux-card2); border-color: var(--line); }
.polo-app.lux .view-toggle-btn { color: var(--muted); }
.polo-app.lux .view-toggle-btn.active { background: var(--burgundy); color: var(--cream); }
.polo-app.lux .wa-card { background: var(--lux-card); border-color: var(--line); }
.polo-app.lux .edit-hint { color: var(--muted); }
/* The printed-style draw table keeps its paper look: it is what gets exported. */
.polo-app.lux .captain-table-wrap { background: #fff; border-radius: 12px; color: #1c1612; }

/* Classes in the app's stylesheet that colour text or borders burgundy. */
.polo-app.lux .chukka-pill, .polo-app.lux .step-count, .polo-app.lux .chukka-num,
.polo-app.lux .action-btn, .polo-app.lux .suggestion-chip, .polo-app.lux .share-link.secondary,
.polo-app.lux .fixture-level, .polo-app.lux .fixture-count, .polo-app.lux .squad-day,
.polo-app.lux .squad-chip em, .polo-app.lux .enter-team-btn, .polo-app.lux .squad-editor-head,
.polo-app.lux .add-player-btn, .polo-app.lux .add-trigger:hover, .polo-app.lux .step-btn { color: var(--lux-gold); }
.polo-app.lux .day-menu-btn:hover, .polo-app.lux .chukka-card.early, .polo-app.lux .add-trigger:hover,
.polo-app.lux .add-pick:hover, .polo-app.lux .suggestion-chip:hover, .polo-app.lux .share-textarea:focus,
.polo-app.lux .share-link.secondary, .polo-app.lux .team-entry, .polo-app.lux .perday-toggle button.active { border-color: var(--gold); }
.polo-app.lux .chukka-warning { background: #2e2416; border-top-color: #5a4524; color: #e8c47e; }
.polo-app.lux .share-status.warn { background: #2e2416; color: #e8c47e; }
.polo-app.lux .register-form, .polo-app.lux .team-entry { background: var(--lux-card); }
.polo-app.lux .share-textarea { background: var(--lux-card2); color: var(--ink); border-color: var(--line); }
.polo-app.lux .team-mini-row.white .hcp { color: #4a1419; }
/* Hex burgundy written inline (the browser serialises #6b1f2a as rgb). */
.polo-app.lux [style^="color: rgb(${BURG})"],
.polo-app.lux [style*="; color: rgb(${BURG})"] { color: var(--lux-gold) !important; }
.polo-app.lux [style*="solid rgb(${BURG})"], .polo-app.lux [style*="solid rgba(${BURG}"] { border-color: color-mix(in srgb, var(--gold) 50%, transparent) !important; }
/* The Blue team's text on the dark ground. */
.polo-app.lux [style^="color: var(--blue)"],
.polo-app.lux [style*="; color: var(--blue)"] { color: #9db8dc !important; }

/* Fixtures, shop and the rest */
.polo-app.lux .fixture-card { background: var(--lux-card); border-color: var(--line); border-radius: 16px; }
.polo-app.lux .fixture-card.expanded { border-color: var(--lux-gold); }
.polo-app.lux .shop-card { background: var(--lux-card); border-color: var(--line); border-radius: 16px; }
.polo-app.lux .shop-img-wrap { background: var(--lux-card2); }
.polo-app.lux .notice-banner { color: var(--ink); }
`;
