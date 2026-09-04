// The club's trophy photographs, and which fixture uses which.
//
// A trophy outlives the tournament: the same cup is played for every year, so a
// photo is uploaded once and picked from the library thereafter. A fixture
// stores only `trophyKey`, and the picture lives here.
//
// WHY ITS OWN COLLECTION. Photographs are large and the shared collection is
// not the place for them: storage.js primes the whole of `shared` on cold start
// and keeps one live listener on it, so a few hundred kilobytes of JPEG would be
// downloaded by every device on every app open and re-streamed on every
// unrelated change. `trophy-images` is read only when a photo is actually shown,
// and never subscribed to.
//
// The small index — names and sizes, no image data — does live in `shared`, so
// the picker can list the library without fetching a single photograph.

import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'trophy-images';
const INDEX_KEY = 'trophies';

// A Firestore document must stay under 1 MB, and base64 inflates by a third, so
// this is the ceiling for the encoded string. Well clear of the limit, because
// the index and the field names cost a little too.
const MAX_DATA_URL = 700000;

// Longest edge, in pixels. A trophy on a PDF cover is ~60mm wide; 1000px is
// generous for that and for a retina thumbnail in the app.
const MAX_EDGE = 1000;

// Photos already fetched this session. Trophy pictures never change silently —
// a captain has to replace one — so this is safe to hold for the session.
const imageCache = new Map();

// "The India Trophy" and "India Trophy" are the same cup, so both land on the
// same key and next year's fixture finds last year's photograph.
export const trophyKeyFor = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

// ── The index: what the library holds ────────────────────────────────────
export async function loadTrophyIndex() {
  try {
    const rec = await window.storage.get(INDEX_KEY, true);
    return rec && rec.value ? JSON.parse(rec.value) : {};
  } catch (e) {
    return {};
  }
}

async function saveTrophyIndex(index) {
  await window.storage.set(INDEX_KEY, JSON.stringify(index), true);
}

// ── The photographs themselves ───────────────────────────────────────────
export async function loadTrophyImage(key) {
  if (!key) return null;
  if (imageCache.has(key)) return imageCache.get(key);
  try {
    const snap = await getDoc(doc(db, COLLECTION, key));
    const data = snap.exists() ? snap.data() : null;
    imageCache.set(key, data);
    return data;
  } catch (e) {
    return null;
  }
}

export async function saveTrophyImage(key, { name, dataUrl, w, h }) {
  const record = { name, dataUrl, w, h, bytes: dataUrl.length, updated: Date.now() };
  await setDoc(doc(db, COLLECTION, key), record);
  imageCache.set(key, record);
  const index = await loadTrophyIndex();
  index[key] = { name, w, h, bytes: record.bytes, updated: record.updated };
  await saveTrophyIndex(index);
  return record;
}

export async function deleteTrophyImage(key) {
  await deleteDoc(doc(db, COLLECTION, key));
  imageCache.delete(key);
  const index = await loadTrophyIndex();
  delete index[key];
  await saveTrophyIndex(index);
}

// ── Getting a phone photo down to a sensible size ────────────────────────
// A photo straight off a phone is several megabytes and far larger than any
// use here. Scale the longest edge to MAX_EDGE and re-encode as JPEG, dropping
// quality in steps until it is comfortably inside a Firestore document. Throws
// only if even the smallest encoding is too big, which a photograph never is.
export function prepareTrophyImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not an image the browser can open.'));
      img.onload = () => {
        try {
          const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
          let w = Math.max(1, Math.round(img.width * scale));
          let h = Math.max(1, Math.round(img.height * scale));
          const draw = (width, height, quality) => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            // A trophy shot on a transparent PNG would otherwise composite onto
            // black; white matches the paper and the app's cards.
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            return canvas.toDataURL('image/jpeg', quality);
          };
          let out = draw(w, h, 0.82);
          const steps = [0.72, 0.62, 0.52, 0.42];
          for (let i = 0; i < steps.length && out.length > MAX_DATA_URL; i++) {
            out = draw(w, h, steps[i]);
          }
          // Still too big — a very large, very detailed image. Shrink as well.
          while (out.length > MAX_DATA_URL && w > 300) {
            w = Math.round(w * 0.8);
            h = Math.round(h * 0.8);
            out = draw(w, h, 0.7);
          }
          if (out.length > MAX_DATA_URL) {
            reject(new Error('That image is too large to store, even shrunk. Try a smaller photo.'));
            return;
          }
          resolve({ dataUrl: out, w, h });
        } catch (e) {
          reject(new Error('Could not process that image.'));
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
