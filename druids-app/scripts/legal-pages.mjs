// Writes the club's public legal pages from the same text the app shows:
//   public/privacy.html         privacy.js  — the privacy policy URL the App
//                               Store and Google Play listings point at
//   public/terms.html           terms.js    — the booking terms
//   public/delete-account.html  privacy.js  — how to delete an account, the
//                               URL Google Play's Data safety form asks for
// Run by `npm run build` before Vite, so the pages can never drift from the
// app. Plain HTML, no script: a reviewer, a crawler or a phone with
// JavaScript off reads the same thing. The files are committed as well, so a
// build that skips this step still serves the last good copy.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TERMS_CLUB, TERMS_SECTIONS, TERMS_DRAFT, TERMS_VERSION } from '../src/terms.js';
import { PRIVACY_CLUB, PRIVACY_SECTIONS, PRIVACY_DRAFT, PRIVACY_UPDATED } from '../src/privacy.js';

const here = dirname(fileURLToPath(import.meta.url));
const out = (name) => join(here, '..', 'public', name);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Email addresses and the deletion page become links.
const linkify = (s) => esc(s)
  .replace(/([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi, '<a href="mailto:$1">$1</a>')
  .replace(/\/delete-account\.html/g, '<a href="/delete-account.html">/delete-account.html</a>')
  .replace(/ico\.org\.uk/g, '<a href="https://ico.org.uk">ico.org.uk</a>');

const body = (sections) => sections.map((s) => {
  const parts = [];
  let list = [];
  const flush = () => { if (list.length) { parts.push(`<ul>${list.map((t) => `<li>${linkify(t)}</li>`).join('')}</ul>`); list = []; } };
  s.p.forEach((t) => { if (t.startsWith('• ')) list.push(t.slice(2)); else { flush(); parts.push(`<p>${linkify(t)}</p>`); } });
  flush();
  return `<h2>${esc(s.h)}</h2>\n${parts.join('\n')}`;
}).join('\n');

const page = ({ title, updated, draft, content }) => `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)} · ${esc(TERMS_CLUB.name)}</title>
<meta name="description" content="${esc(title)} for the ${esc(TERMS_CLUB.name)} app.">
<link rel="icon" href="/favicon-32.png">
<style>
  :root{--accent:${TERMS_CLUB.burgundy};--ink:#2b2520;--muted:#6f655a;--paper:#faf6ee;--card:#fffdf8;--line:#e7ddc9;}
  @media (prefers-color-scheme: dark){:root{--ink:${TERMS_CLUB.colors.cream};--muted:${TERMS_CLUB.colors.muted};--paper:${TERMS_CLUB.colors.bg};--card:${TERMS_CLUB.colors.card};--line:${TERMS_CLUB.colors.line};--accent:${TERMS_CLUB.colors.gold2};}}
  *{box-sizing:border-box}
  body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
  .wrap{max-width:720px;margin:0 auto;padding:24px 16px 64px}
  header{display:flex;align-items:center;gap:14px;margin-bottom:18px}
  header img{width:56px;height:56px;object-fit:contain;${TERMS_CLUB.crestRound ? 'border-radius:50%;background:#fff;' : ''}}
  .club{font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--muted)}
  h1{font-family:Georgia,serif;font-weight:500;font-size:30px;margin:0;color:var(--accent)}
  .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:22px 20px}
  .meta{font-size:12px;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin:0 0 12px}
  .draft{border:1px dashed var(--accent);border-radius:10px;padding:8px 12px;font-size:13px;margin:0 0 14px}
  h2{font-family:Georgia,serif;font-weight:500;font-size:20px;margin:24px 0 6px}
  p{margin:0 0 12px} ul{margin:0 0 12px;padding-left:20px} li{margin:0 0 6px}
  a{color:var(--accent)}
  footer{text-align:center;color:var(--muted);font-size:13px;margin-top:22px}
</style>
</head>
<body>
<div class="wrap">
<header><img src="${esc(TERMS_CLUB.crest)}" alt=""><div><div class="club">${esc(TERMS_CLUB.name)}</div><h1>${esc(title)}</h1></div></header>
<div class="card">
${updated ? `<p class="meta">${esc(updated)}</p>` : ''}
${draft ? '<p class="draft">Draft — awaiting committee review. Points in [square brackets] are still to be decided.</p>' : ''}
${content}
</div>
<footer><a href="/privacy.html">Privacy notice</a> · <a href="/terms.html">Booking terms</a> · <a href="/delete-account.html">Delete your account</a> · <a href="/">Open the app</a></footer>
</div>
</body>
</html>
`;

writeFileSync(out('privacy.html'), page({
  title: 'Privacy notice', updated: `Last updated ${PRIVACY_UPDATED}`, draft: PRIVACY_DRAFT, content: body(PRIVACY_SECTIONS),
}));
writeFileSync(out('terms.html'), page({
  title: 'Booking terms', updated: `Version ${TERMS_VERSION}`, draft: TERMS_DRAFT, content: body(TERMS_SECTIONS),
}));
const del = PRIVACY_SECTIONS.find((s) => /^Deleting your account/.test(s.h));
writeFileSync(out('delete-account.html'), page({
  title: 'Delete your account', updated: '', draft: false,
  content: `<p>You can delete your ${esc(TERMS_CLUB.name)} app account, and the information that goes with it, at any time.</p>
<h2>In the app</h2>
<ol><li>Open the app and sign in.</li><li>On Home, tap <strong>Your profile</strong>.</li><li>At the bottom, tap <strong>Delete my account</strong>, then confirm with your password, or with Google or Apple.</li></ol>
<p>Your sign-in, your profile and picture, and your notification settings are deleted straight away.</p>
<h2>Without the app</h2>
<p>Email <a href="mailto:${esc(PRIVACY_CLUB.email)}?subject=Delete%20my%20account">${esc(PRIVACY_CLUB.email)}</a> from the address you sign in with, and ask us to delete your account. We will do it within one month and confirm by email.</p>
<h2>What is kept</h2>
${del ? body([{ h: '', p: del.p.slice(0, 1) }]).replace('<h2></h2>\n', '') : ''}
<p>See the <a href="/privacy.html">privacy notice</a> for how long the club keeps each kind of record.</p>`,
}));
console.log('legal pages written: privacy.html, terms.html, delete-account.html');
