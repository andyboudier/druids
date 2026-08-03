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
const cache = new Map(); // `${collection}/${key}` → value

// Memoised promise for the one-shot bulk prime (see primeShared below), so the
// network fetch runs at most once per session even if primeShared is called
// again (e.g. loadAll re-running on a remote change).
let primeSharedPromise = null;

// Restore-only blobs kept OUT of the cold-start prime (see primeShared). The
// fixture-details backup history is ~900KB — the bulk of the whole dataset —
// and is only read when the captain opens the backups/restore UI, so it's
// fetched on demand instead of sitting on the critical path of every app open.
const PRIME_EXCLUDE_KEYS = ['fixture-details-backups'];

const storage = {
  async get(key, shared = false) {
    const cacheKey = `${collectionName(shared)}/${key}`;
    if (cache.has(cacheKey)) {
      return { key, value: cache.get(cacheKey), shared };
    }
    const snap = await getDoc(doc(db, collectionName(shared), key));
    if (snap.exists()) {
      const value = snap.data().value;
      cache.set(cacheKey, value);
      return { key, value, shared };
    }
    return null;
  },

  async set(key, value, shared = false) {
    const cacheKey = `${collectionName(shared)}/${key}`;
    cache.set(cacheKey, value);
    // Firestore rules require an authenticated client to write. Wait for the
    // silent anonymous sign-in so the first write of a session isn't rejected.
    await authReady;
    await setDoc(doc(db, collectionName(shared), key), { value });
    return { key, value, shared };
  },

  async delete(key, shared = false) {
    const cacheKey = `${collectionName(shared)}/${key}`;
    cache.delete(cacheKey);
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
        const data = d.data();
        if (data && Object.prototype.hasOwnProperty.call(data, 'value')) {
          cache.set(`${collectionName(true)}/${d.id}`, data.value);
        }
      });
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
  onSnapshot(doc(db, 'shared', key), (snap) => {
    if (snap.exists()) {
      cache.set(cacheKey, snap.data().value);
    } else {
      cache.delete(cacheKey);
    }
    // Tell the app a remote change happened so it can re-render
    window.dispatchEvent(new CustomEvent('storage-changed', { detail: { key } }));
  });
});

// Make the storage object globally available — DruidsApp.jsx already uses
// `window.storage.get(...)` so this preserves the existing API exactly.
if (typeof window !== 'undefined') {
  window.storage = storage;
}

export default storage;
