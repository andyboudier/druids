// What this club is, for the emails the app sends (_bookingEmail.js and
// _reminders.js). Those two files name no club and are the same in every app;
// this one is the club's own.
//
//   CLUB      name, short name and place, from the same block the app's own
//             screens read (TERMS_CLUB in src/terms.js), and its dark colours
//   CREST     the badge for the top of an email — a PNG, because mail clients
//             do not draw SVG — and whether to set it in a white round
//   PROJECT   the Firebase project to read when a build sets no VITE_FIREBASE_*
//   APP_URL   where the app lives, when APP_URL is not set on the project
//   DAYS      the chukka days — mirrors DAY_CONFIG in src/DruidsApp.jsx:
//             weekday, names and default throw-ins. Keep the two in step.
//   storageKey  how a day's keys are suffixed: Druids suffixes every day
//   SESSION_NAMES  the club sessions sold from Lessons, by `kind`; Druids
//             has none

import { TERMS_CLUB } from '../src/terms.js';

export const CLUB = TERMS_CLUB;
export const CREST = { src: '/icon-192.png', round: false };
export const PROJECT = { projectId: 'druids-lodge-polo', apiKey: '' };
export const APP_URL = 'https://druids.poloact.co.uk';

export const DAYS = {
  thu: { dow: 4, day: 'Thursday', name: 'Thursday Chukkas', start: '17:30' },
  sat: { dow: 6, day: 'Saturday', name: 'Saturday Chukkas', start: '11:00' },
  sun: { dow: 0, day: 'Sunday', name: 'Sunday Chukkas', start: '11:00' },
};
export const storageKey = (base, dk) => `${base}-${dk}`;

export const SESSION_NAMES = {};
