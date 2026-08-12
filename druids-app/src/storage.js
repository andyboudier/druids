// Replaces the artifact's window.storage with a Firestore-backed implementation.
// Keeps the exact same API (get/set/delete/list) so DruidsApp.jsx works unchanged.
// Adds live cross-device sync: when one club member adds a player, every other
// device with the page open sees the update within milliseconds.

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
  documentId,
} from 'firebase/firestore';
// Single shared Firestore instance (initialised with an on-device IndexedDB
// cache in firebase.js) — do NOT initialise a second app/Firestore here.
import { db, authReady } from './firebase';

const collectionName = (shared) => (shared ? 'shared' : 'private');

// In-memory cache that the live listeners keep up to date.
// When DruidsApp.jsx calls get(), we return the cached value (synced from Firestore).
// When it calls set(), we write to Firestore — and the listener pushes the change
// out to all other devices in real time.
const cache = new Map(); // `${collection}/${key}` → value | ABSENT

// Sentinel meaning "this document is known NOT to exist". Caching absence is as
// important as caching values: loadAll reads the per-day keys for every chukka
// day plus `committee`, and most of those have no document at all (days with no
// roster yet, a draw not published, a session not closed). getDoc on a missing
// doc returns null, so without this every one of them missed the cache and cost
// a full server round-trip — in series, inside loadAll's await loops — on EVERY
// load, not just the first. That was the single largest contributor to cold
// start.
const ABSENT = Symbol('absent');

// Memoised promise for the one-shot bulk prime (see primeShared below), so the
// network fetch runs at most once per session even if primeShared is called
// again (e.g. loadAll re-running on a remote change).
let primeSharedPromise = null;

// The ids actually present in `shared` as of the bulk prime, kept current by
// set/delete and the live listeners. Because primeShared reads the WHOLE
// collection (bar PRIME_EXCLUDE_KEYS), any key missing from this set after the
// prime resolves is genuinely absent — which is what lets get() answer without
// a round-trip.
const sharedDocIds = new Set();
let sharedPrimed = false;

// Restore-only blobs kept OUT of the cold-start prime (see primeShared). The
// fixture-details backup history is ~900KB — the bulk of the whole dataset —
// and is only read when the captain opens the backups/restore UI, so it's
// fetched on demand instead of sitting on the critical path of every app open.
const PRIME_EXCLUDE_KEYS = ['fixture-details-backups'];

const storage = {
  async get(key, shared = false) {
    const cacheKey = `${collectionName(shared)}/${key}`;
    if (cache.has(cacheKey)) {
      const value = cache.get(cacheKey);
      return value === ABSENT ? null : { key, value, shared };
    }
    // The bulk prime read the entire `shared` collection, so once it has
    // resolved, a key it didn't return has no document — answer from that
    // knowledge instead of paying a round-trip to be told the same thing. The
    // deliberately-skipped keys are the one exception: those still need a real
    // read, because the prime never looked at them.
    if (shared && sharedPrimed && !sharedDocIds.has(key) && !PRIME_EXCLUDE_KEYS.includes(key)) {
      cache.set(cacheKey, ABSENT);
      return null;
    }
    const snap = await getDoc(doc(db, collectionName(shared), key));
    if (snap.exists()) {
      const value = snap.data().value;
      if (shared) sharedDocIds.add(key);
      cache.set(cacheKey, value);
      return { key, value, shared };
    }
    return null;
  },

  async set(key, value, shared = false) {
    const cacheKey = `${collectionName(shared)}/${key}`;
    cache.set(cacheKey, value);
    if (shared) sharedDocIds.add(key);
    // Firestore rules require an authenticated client to write. Wait for the
    // silent anonymous sign-in so the first write of a session isn't rejected.
    await authReady;
    await setDoc(doc(db, collectionName(shared), key), { value });
    return { key, value, shared };
  },

  async delete(key, shared = false) {
    const cacheKey = `${collectionName(shared)}/${key}`;
    // Record the absence rather than dropping the entry: a deleted doc is a
    // thing we KNOW doesn't exist, so the next read should not go to the server
    // to rediscover that. This matters right after the roster auto-clear, which
    // deletes up to three keys per day.
    cache.set(cacheKey, ABSENT);
    if (shared) sharedDocIds.delete(key);
    await authReady;
    await deleteDoc(doc(db, collectionName(shared), key));
    return { key, deleted: true, shared };
  },

  async list(prefix = '', shared = false) {
    const snap = await getDocs(collection(db, collectionName(shared)));
    const keys = [];
    snap.forEach((d) => {
      if (!prefix || d.id.startsWith(prefix)) keys.push(d.id);
    });
    return { keys, prefix, shared };
  },

  // Warm the in-memory cache with a SINGLE bulk read of the whole `shared`
  // collection. The app's first load (loadAll in the club component) reads ~50
  // shared keys; without this, each is a separate getDoc round-trip run one
  // after another, which is what makes a cold start take ~30s. Priming turns
  // all of those into cache hits behind one collection fetch. Memoised so the
  // network round-trip happens at most once per session; the live onSnapshot
  // listeners below keep the cache fresh afterwards.
  primeShared() {
    if (primeSharedPromise) return primeSharedPromise;
    const populate = (snap) => {
      snap.forEach((d) => {
        // Record the id whether or not it carries a `value` field, so a doc
        // that exists in an odd shape is never mistaken for an absent one.
        sharedDocIds.add(d.id);
        const data = d.data();
        if (data && Object.prototype.hasOwnProperty.call(data, 'value')) {
          cache.set(`${collectionName(true)}/${d.id}`, data.value);
        }
      });
      sharedPrimed = true;
    };
    const shared = collection(db, collectionName(true));
    // Fetch everything EXCEPT the big restore-only backup blobs. If the
    // documentId not-in filter is ever rejected, fall back to reading the whole
    // collection so a cold start still primes (just a little heavier).
    primeSharedPromise = getDocs(query(shared, where(documentId(), 'not-in', PRIME_EXCLUDE_KEYS)))
      .then(populate)
      .catch(() => getDocs(shared).then(populate))
      .catch(() => { primeSharedPromise = null; /* let a later call retry */ });
    return primeSharedPromise;
  },
};

// ── Live sync: subscribe to every shared key the app uses ────────────
// When Firestore changes (from this device OR any other), update the cache
// AND dispatch a window-level event so React components can re-read.
// IMPORTANT: every persistent *shared* key must appear here or it silently won't
// sync across devices. Per-day keys follow DruidsApp.jsx's storageKey scheme:
// `base-<day>` for every chukka day. Keep DAYS in step with DAY_KEYS there.
const DAYS = ['thu', 'sat', 'sun'];
const perDay = (base) => DAYS.map((d) => `${base}-${d}`);

const SYNC_KEYS = [
  ...perDay('roster'),          // rosters for every day
  ...perDay('roster-week'),     // roster week-stamps (drive auto-clear)
  ...perDay('schedule'),        // drawn chukka schedules
  ...perDay('throwin'),         // per-day throw-in times
  ...perDay('ground'),          // which ground that day is played on
  ...perDay('booking-closed'),  // captain's manual "session full" toggle
  ...perDay('draw-published'),  // whether the draw is visible to players
  'fixture-interest',
  'wa-link',
  'members',
  'team-signups',
  'fixtures',
  'players',                 // captain-managed player database
  'subsidies',               // captain-managed subsidy pots (payment screen)
  'transactions',            // recorded payments (manual mark-paid / Stripe later)
  'fixture-details',         // match details / teams shown on the fixtures tab
  'teams-db',
  'roster-backups',          // gzip snapshots of the chukka rosters (retention 50)
];

SYNC_KEYS.forEach((key) => {
  const cacheKey = `shared/${key}`;
  // Every listener fires once immediately on registration with the current
  // server state. That first callback is the INITIAL READ, not a remote change:
  // primeShared and the app's own first load already cover it. Dispatching for
  // it made the app reload everything once per key on every boot, so the cache
  // is still updated but the event is suppressed.
  let primed = false;
  onSnapshot(doc(db, 'shared', key), (snap) => {
    if (snap.exists()) {
      sharedDocIds.add(key);
      cache.set(cacheKey, snap.data().value);
    } else {
      // Cache the absence instead of clearing the entry. A live listener that
      // says "no document" is authoritative, so a later get() can answer from
      // it; clearing sent the next read back to the server.
      sharedDocIds.delete(key);
      cache.set(cacheKey, ABSENT);
    }
    if (!primed) { primed = true; return; }
    // Tell the app a genuine remote change happened so it can re-render
    window.dispatchEvent(new CustomEvent('storage-changed', { detail: { key } }));
  });
});

// Make the storage object globally available — DruidsApp.jsx already uses
// `window.storage.get(...)` so this preserves the existing API exactly.
if (typeof window !== 'undefined') {
  window.storage = storage;
}

export default storage;
