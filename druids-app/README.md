# Druids PoloACT — Druids Lodge Polo Club

Tournament and club-chukka management for **Druids Lodge Polo Club (DLPC)**.
One React codebase runs as a public **website** and, via Capacitor, as native
**iOS and Android apps** — all sharing a single live Firebase dataset.

What it does:

- **Club chukka booking** — members sign up per day (Thu 17:30 / Sat 11:00 /
  Sun 11:00), set availability and preferences; the app draws balanced
  4-a-side chukkas (3-a-side in the Arena).
- **Tournament fixtures** — the full 2026 season fixture list, team sign-ups,
  match details, and squads.
- **Live match scoring** — a public scoreboard with captain-entered scores,
  HPA head-start handicapping, and an iOS Lock-Screen / Dynamic-Island Live Activity.
- **PDF programmes** — printable single-day, full-tournament, results-summary and
  division team-sheet programmes, with an embedded Jost typeface.
- **Player & team management** — a player database, team database, subsidies,
  lessons and payment tracking.
- **Captain mode** — a PIN-gated editing mode; everyone else sees a read-only view.

British spelling throughout: *colour*, *programme*, *chukkas*.

Total hosting cost: **£0/month** on Firebase's and Vercel's free tiers.

---

## Documentation

| Doc | For | Covers |
|---|---|---|
| **[docs/SETUP.md](docs/SETUP.md)** | Whoever stands the app up | Firebase, Vercel, App Store and Play Console setup, click by click, plus the club settings worth changing. |
| **[docs/USER_GUIDE.md](docs/USER_GUIDE.md)** | Members & captains | Booking chukkas, captain mode, running a tournament, live scoring, printing programmes, payments. |
| **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** | Developers | Codebase layout, storage & live-sync model, backups, native apps, the deploy pipeline, gotchas. |
| **[docs/DOMAIN_RULES.md](docs/DOMAIN_RULES.md)** | Developers | The polo/HPA rules the code implements — head-start formula, team-handicap-by-shirt-number, the chukka draw, score rendering, divisions. |

Start with the **User Guide** if you run the club; start with **Architecture** if you
change the code.

---

## Repository layout

The app is **not** at the repo root — it lives in [`druids-app/`](.).
Run every command from there.

```
druids-app/
├── index.html                 ← entry HTML with PWA meta tags
├── package.json               ← dependencies & scripts
├── vite.config.js             ← Vite build config
├── vercel.json                ← cache headers (keeps the ~90s web-update path working)
├── capacitor.config.ts        ← native app config (remote-load wrapper)
├── public/                    ← PWA manifest, icons, static pages
├── resources/                 ← native icon.png / splash.png sources
├── ios/                       ← Capacitor iOS project (+ Live Activity widget)
├── android/                   ← Capacitor Android project
└── src/
    ├── main.jsx               ← React entry point
    ├── firebase.js            ← Firebase config for project "druids-lodge-polo"
    ├── storage.js             ← Firestore-backed storage + live cross-device sync
    ├── DruidsApp.jsx        ← the whole app (~7,700 lines)
    ├── tournamentPdf.js       ← PDF programme generation + shared handicap logic
    ├── pdfFonts.js            ← embedded Jost font subsets for the PDFs
    └── liveScoreActivity.js   ← iOS Live Activity bridge (no-op off iOS)
```

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for what each module does.

---

## Quick start (local development)

```bash
cd druids-app
npm install
npm run dev            # Vite dev server, usually http://localhost:5173
```

The Firebase config is already wired to the club's live project
(`druids-lodge-polo`) in `src/firebase.js`, so a fresh checkout syncs against
real club data immediately. Open two browser tabs and add a player in one — it
appears in the other within milliseconds. That is the Firestore live-sync
working (`src/storage.js`).

### Validate & build

```bash
# Type-check a JSX edit without a full build:
esbuild src/DruidsApp.jsx --loader:.jsx=jsx --outfile=/dev/null

# Production build (outputs to dist/):
npm run build
```

For any handicap / scheduling / scoring change, write a small Node simulation and
run it — **do not** grep raw PDF output to verify formulae (special characters
such as `½` and `–` are encoded as WinAnsi bytes, so UTF-8 substring search on the
raw PDF is unreliable). See **[docs/DOMAIN_RULES.md](docs/DOMAIN_RULES.md)**.

---

## How it's deployed

- **Web:** Vercel auto-deploys from `main`. A commit reaches the live web app in
  ~90 seconds. Each branch/PR also gets a Vercel preview build — check that first.
- **Installed iOS apps:** the native app is a **remote-load wrapper**
  (`capacitor.config.ts` points at `https://druids-poloact.vercel.app`), so web
  changes reach already-installed iOS apps within ~90 seconds too — **no rebuild**.
- **Native changes** (splash screen, plugins, the Live Activity widget) do **not**
  ride that path — they go through **Xcode Cloud → TestFlight** on the next iOS build.
- **Android:** a manual GitHub Actions workflow
  (`.github/workflows/android-release.yml`) builds a signed `.aab` for the Play
  Console; it does not run on every commit.

Full detail — including the caching rules that keep the ~90s path working — is in
**[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

---

## Data & access model

- **Firestore**, project `druids-lodge-polo`: public unauthenticated reads/writes.
- All editing is gated behind **captain mode**, unlocked with a 4-digit PIN. This is
  a soft gate for a club setting, **not** hard security — do not treat it as such,
  and never commit the PIN or any secret to the repo.
- Two collections: `shared` (everything club-wide) and `private`. Every shared key
  the app relies on must be listed in `src/storage.js` or it will not live-sync
  across devices — see the Architecture doc.

---

## Contributing

1. Work on a branch; open a PR. Check the branch's Vercel preview before asking for
   a merge to `main`.
2. Validate JSX with the `esbuild` command above before committing.
3. Keep British spelling.
4. Mind the gotchas (documented in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**):
   don't add `@capacitor/filesystem` or `@capacitor/share` (they break Xcode
   Cloud's committed `Package.resolved`), and make surgical edits to `package.json`
   so local Capacitor entries aren't clobbered.
</content>
</invoke>
