#!/usr/bin/env node
// Regenerates every raster icon/splash in the repo from public/crest.svg.
//
//   cd druids-app && npm install --no-save sharp && node scripts/generate-icons.mjs
//
// Swap public/crest.svg for the club's official artwork and re-run — nothing
// else needs touching. Covers: PWA icons, favicon, Apple touch icon, the iOS
// AppIcon set + Splash.imageset, the Watch app icon, and the Android launcher
// icons + splash screens.

import sharp from 'sharp';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CREST = resolve(ROOT, 'public/crest.svg');

// Club palette — keep in step with the CSS variables in src/DruidsApp.jsx.
const INK = { r: 0x1b, g: 0x19, b: 0x19, alpha: 1 };

const out = (p) => resolve(ROOT, p);

async function write(path, buffer) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, buffer);
  console.log('  ✓', path.slice(ROOT.length + 1));
}

// Crest rendered at `inner` px, centred on a `size`px tile.
// `background: null` leaves the tile transparent (Android adaptive foreground).
async function tile(size, innerRatio, background = INK) {
  const inner = Math.round(size * innerRatio);
  const crest = await sharp(CREST, { density: 600 })
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: background ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: crest, gravity: 'centre' }])
    .png()
    .toBuffer();
}

// Landscape/portrait splash: crest centred on a solid ink field.
async function splash(width, height) {
  const inner = Math.round(Math.min(width, height) * 0.34);
  const crest = await sharp(CREST, { density: 600 })
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({ create: { width, height, channels: 4, background: INK } })
    .composite([{ input: crest, gravity: 'centre' }])
    .png()
    .toBuffer();
}

// Circular-masked variant for Android's ic_launcher_round.
async function round(size) {
  const square = await tile(size, 0.68);
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
  );
  return sharp(square)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
}

console.log('PWA + web icons');
await write(out('public/icon-192.png'), await tile(192, 0.78));
await write(out('public/icon-512.png'), await tile(512, 0.78));
// Maskable icons are cropped to a circle by the launcher, so the crest sits
// inside the 80% safe zone with room to spare.
await write(out('public/icon-maskable-192.png'), await tile(192, 0.56));
await write(out('public/icon-maskable-512.png'), await tile(512, 0.56));
await write(out('public/apple-touch-icon.png'), await tile(180, 0.78));
await write(out('public/favicon-32.png'), await tile(32, 0.86));

console.log('Capacitor resources');
await write(out('resources/icon.png'), await tile(1024, 0.78));
await write(out('resources/splash.png'), await splash(2732, 2732));

console.log('iOS AppIcon set');
const appIconDir = 'ios/App/App/Assets.xcassets/AppIcon.appiconset';
const contents = JSON.parse(await readFile(out(`${appIconDir}/Contents.json`), 'utf8'));
for (const image of contents.images) {
  if (!image.filename) continue;
  const [w] = image.size.split('x').map(Number);
  const scale = Number(String(image.scale).replace('x', ''));
  const px = Math.round(w * scale);
  await write(out(`${appIconDir}/${image.filename}`), await tile(px, 0.78));
}

console.log('iOS launch splash');
const splashDir = 'ios/App/App/Assets.xcassets/Splash.imageset';
const splash2732 = await splash(2732, 2732);
// The brand is dark in both appearances, so light and dark share the artwork.
await write(out(`${splashDir}/Default@1x~universal~anyany.png`), splash2732);
await write(out(`${splashDir}/Default@1x~universal~anyany-dark.png`), splash2732);

console.log('Apple Watch app icon');
await write(
  out('ios/App/DLPC Watch Watch App/Assets.xcassets/AppIcon.appiconset/DLPC-Watch-AppIcon-1024.png'),
  await tile(1024, 0.78),
);

console.log('Android launcher icons');
const MIPMAP = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const ADAPTIVE = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
for (const [dpi, size] of Object.entries(MIPMAP)) {
  await write(out(`android/app/src/main/res/mipmap-${dpi}/ic_launcher.png`), await tile(size, 0.68));
  await write(out(`android/app/src/main/res/mipmap-${dpi}/ic_launcher_round.png`), await round(size));
}
for (const [dpi, size] of Object.entries(ADAPTIVE)) {
  // Adaptive foreground: transparent, crest inside the 66% safe zone.
  await write(
    out(`android/app/src/main/res/mipmap-${dpi}/ic_launcher_foreground.png`),
    await tile(size, 0.46, null),
  );
  await write(
    out(`android/app/src/main/res/drawable-${dpi}/ic_launcher_background.png`),
    await sharp({ create: { width: size, height: size, channels: 4, background: INK } }).png().toBuffer(),
  );
}

console.log('Android splash screens');
const SPLASHES = {
  'drawable': [480, 320],
  'drawable-land-mdpi': [480, 320],
  'drawable-land-hdpi': [800, 480],
  'drawable-land-xhdpi': [1280, 720],
  'drawable-land-xxhdpi': [1600, 960],
  'drawable-land-xxxhdpi': [1920, 1280],
  'drawable-port-mdpi': [320, 480],
  'drawable-port-hdpi': [480, 800],
  'drawable-port-xhdpi': [720, 1280],
  'drawable-port-xxhdpi': [960, 1600],
  'drawable-port-xxxhdpi': [1280, 1920],
};
for (const [dir, [w, h]] of Object.entries(SPLASHES)) {
  await write(out(`android/app/src/main/res/${dir}/splash.png`), await splash(w, h));
}

console.log('\nDone.');
