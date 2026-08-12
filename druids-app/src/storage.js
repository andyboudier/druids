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

  // Resolves once the shared collection has been read into the cache, so the
  // app's first load can treat every window.storage.get(...) as a cache hit
  // instead of ~50 separate round-trips.
  //
  // There is no fetch of its own here any more: the single live listener below
  // delivers the whole collection in its first snapshot, and that snapshot IS
  // the prime. Issuing a getDocs as well would have pulled the same ~185KB
  // twice on every cold start. Still memoised — callers share one promise.
  primeShared() {
    return primeSharedPromise;
  },
};

// ── Live sync: ONE listener for the whole shared collection ────────────
// When Firestore changes (from this device OR any other), update the cache AND
// dispatch a window-level event so React components can re-read.
//
// This used to be one onSnapshot per key — 32 of them. They shared a single
// WebChannel, but the SDK flushes target registrations as separate sequential
// POSTs, so cold start paid ~19 round-trips just to say "subscribe" before any
// data moved. One collection listener is one target: one round-trip.
//
// It also removes a standing footgun. The old list had to be maintained by
// hand, and any persistent shared key missing from it silently never synced
// across devices. A collection listener covers every key by construction.
//
// The excluded restore-only blobs stay out of the subscription: they are
// ~900KB, only the backups/restore UI reads them, and re-streaming that on
// every unrelated change was pure cost. get() still fetches them on demand.
const sharedCollection = collection(db, collectionName(true));

const applySnapshot = (snap, { dispatch }) => {
  snap.docChanges().forEach((change) => {
    const key = change.doc.id;
    const cacheKey = `${collectionName(true)}/${key}`;
    if (change.type === 'removed') {
      // Cache the absence rather than clearing the entry: a listener reporting
      // a removal is authoritative, so the next get() can answer from it.
      sharedDocIds.delete(key);
      cache.set(cacheKey, ABSENT);
    } else {
      sharedDocIds.add(key);
      const data = change.doc.data();
      if (data && Object.prototype.hasOwnProperty.call(data, 'value')) {
        cache.set(cacheKey, data.value);
      }
    }
    // The FIRST snapshot is the initial read, not a remote change — every doc
    // arrives as an 'added' change. Dispatching for it made the app reload
    // everything once per key on every boot, so it is suppressed; the prime and
    // the app's own first load already cover it.
    if (dispatch) {
      window.dispatchEvent(new CustomEvent('storage-changed', { detail: { key } }));
    }
  });
};

let settlePrime;
primeSharedPromise = new Promise((resolve) => { settlePrime = resolve; });
const settleOnce = () => { if (settlePrime) { settlePrime(); settlePrime = null; } };

// Last resort: never let a stalled subscription wedge the app's first load. If
// no snapshot has arrived by now, release loadAll to do its own per-key reads —
// slower, but the old behaviour, and it always terminates.
const primeTimeout = setTimeout(settleOnce, 5000);

let firstSnapshotSeen = false;

const subscribe = (q, { withFallback }) => onSnapshot(
  q,
  (snap) => {
    applySnapshot(snap, { dispatch: firstSnapshotSeen });
    firstSnapshotSeen = true;
    // Only treat the collection as fully known once it has come from the
    // server. A cache-only snapshot may be partial, and negative caching must
    // never be switched on from a partial view.
    if (!snap.metadata.fromCache) sharedPrimed = true;
    clearTimeout(primeTimeout);
    settleOnce();
  },
  () => {
    // The documentId not-in filter was rejected. Fall back to subscribing to
    // the whole collection so live sync survives, exactly as the bulk read used
    // to fall back. Only one retry — a second failure releases the prime and
    // leaves the app on per-key reads rather than looping.
    if (withFallback) {
      subscribe(sharedCollection, { withFallback: false });
    } else {
      clearTimeout(primeTimeout);
      settleOnce();
    }
  },
);

subscribe(query(sharedCollection, where(documentId(), 'not-in', PRIME_EXCLUDE_KEYS)), { withFallback: true });

// Make the storage object globally available — DruidsApp.jsx already uses
// `window.storage.get(...)` so this preserves the existing API exactly.
if (typeof window !== 'undefined') {
  window.storage = storage;
}

export default storage;
