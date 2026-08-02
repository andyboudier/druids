# Setup — Druids PoloACT

The code in this repo is complete, but three external services still need
wiring up by hand, because they need your logins. Do them in this order.

Hosting cost is **£0/month** — Vercel and Firebase free tiers cover a club of
this size comfortably.

---

## 1. Firebase (the live database)

The app has no server of its own. Every roster, draw, fixture and live score
lives in one Firestore database that all devices share.

1. Go to **[console.firebase.google.com](https://console.firebase.google.com)**
   → **Create a project**. Name it `druids-lodge-polo` (or anything — just note
   the real project ID Firebase assigns). Google Analytics is optional.
2. In the project, click the **Web** icon (`</>`) to *Add an app*. Nickname it
   `Druids PoloACT`. **Do not** tick "Also set up Firebase Hosting" — Vercel
   does the hosting.
3. Firebase shows you a `firebaseConfig` block with six values. Copy them into
   [`src/firebase.js`](../src/firebase.js), replacing the `REPLACE_WITH_…`
   placeholders. **A Firebase web config is not a secret** — it is safe to
   commit, and access is controlled by the rules in step 6.
   *(Alternatively set `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
   `VITE_FIREBASE_MESSAGING_SENDER_ID` and `VITE_FIREBASE_APP_ID` as environment
   variables in Vercel — they take precedence over the file.)*
4. **Build → Firestore Database → Create database.** Choose region
   **`europe-west2` (London)** or **`eur3` (Europe)**.
   ⚠️ **The region is permanent** — it cannot be changed later.
   Start in **production mode**; step 6 replaces the rules.
5. **Build → Authentication → Get started → Sign-in method → Anonymous →
   Enable.** The app signs every device in silently in the background; nobody
   ever sees a login screen. Locked writes depend on this.
6. **Firestore Database → Rules**, paste this, and **Publish**:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read: if true;                  // public scoreboard + Watch app
         allow write: if request.auth != null; // only the app (anon-signed-in)
       }
     }
   }
   ```

> **Order matters.** Deploy the app (step 2 below) and enable the Anonymous
> provider *before* publishing these rules. Publish them first and writes get
> rejected until the app is live and signing in.

---

## 2. Vercel (the website)

1. Go to **[vercel.com](https://vercel.com)** → **Add New → Project** and
   *Continue with GitHub*. Import this repository. If it isn't listed, adjust
   the Vercel GitHub app's repository permissions.
2. ⚠️ **Set Root Directory to `druids-app`.** This is the single most common
   mistake — leave it at the repo root and you get a 404 or a blank page.
   Framework auto-detects as **Vite**; build command `npm run build`; output
   directory `dist`.
3. **Deploy.** Note the production URL it gives you (something like
   `druids-xyz.vercel.app`).
4. **Settings → Git →** set the Production Branch to `main`. Pushes to `main`
   deploy to production; pull requests get their own preview URLs.
5. Put that exact production URL into
   [`capacitor.config.ts`](../capacitor.config.ts) → `server.url` (currently the
   placeholder `https://druids-poloact.vercel.app`) and commit. The native apps
   load the live web app from there, so web changes reach phones without a new
   App Store build.

Once it's live, load it once so the app signs in anonymously — then publish the
Firestore rules from step 6 above if you haven't already.

---

## 3. Apple App Store (optional — needs a Mac with Xcode)

Only needed for the native iOS app, the Apple Watch app and the Lock-Screen
live-score widget. The website and installable PWA work without any of this.

1. **[developer.apple.com](https://developer.apple.com)** → *Certificates,
   Identifiers & Profiles* → **Identifiers** → register **three** App IDs
   (exact casing matters):
   - `uk.co.druidspolo.poloact`
   - `uk.co.druidspolo.poloact.watchkitapp`
   - `uk.co.druidspolo.poloact.DLPCScoreWidget`

   None of them need capabilities. `@capacitor/push-notifications` is a
   dependency but is never called: the chukka reminders use
   `LocalNotifications`, which needs no capability or entitlement. Do **not**
   add Push Notifications in Xcode unless the app actually starts using it —
   it would add an unused `aps-environment` entitlement to sign and justify.
2. **[appstoreconnect.apple.com](https://appstoreconnect.apple.com)** →
   **Apps → ＋ → New App**. Name it *Druids PoloACT*, primary language
   English (U.K.), bundle ID `uk.co.druidspolo.poloact`, pick an SKU, Full
   Access.
3. ⚠️ **Share the `App` scheme.** Xcode Cloud can only build *shared* schemes,
   and Xcode keeps schemes in `xcuserdata/` (gitignored) until you share them.
   In Xcode: **Product → Scheme → Manage Schemes…**, tick **Shared** against
   `App`, close, then commit the new file:
   ```sh
   git add ios/App/App.xcodeproj/xcshareddata/xcschemes/App.xcscheme
   git commit -m "Share the App scheme for Xcode Cloud"
   git push
   ```
   Skip this and Xcode Cloud will not offer the scheme when you create the
   workflow.
4. On the Mac, clone this repo, then:
   ```sh
   cd druids-app
   npm install --legacy-peer-deps
   npm run build
   npx cap sync ios
   open ios/App/App.xcodeproj
   ```
5. In Xcode, set your **Team** with Automatic signing on all three targets:
   *App*, *DLPC Watch Watch App*, *DLPCScoreWidget*.
6. **Integrate → Create Workflow** (older Xcode: *Product → Xcode Cloud*). Grant
   GitHub access and click **Authorize** — this covers the public
   `ionic-team/capacitor-swift-pm` Swift package dependency. Install the Xcode
   Cloud app on this repository.
7. Edit the workflow: **Start Condition = branch `main`**, action **Archive –
   iOS**, and **add a TestFlight (Internal Testing) post-action**.
   ⚠️ An Archive-only workflow builds fine but never reaches TestFlight.
8. The CI scripts are already in place:
   - `ios/App/ci_scripts/ci_post_clone.sh` installs npm deps and builds the web
     bundle on the runner.
   - `ios/App/ci_scripts/ci_pre_xcodebuild.sh` stamps a unique build number from
     `$CI_BUILD_NUMBER`. This app starts at build 1; if you ever recreate the
     App Store record against the same bundle ID, raise `OFFSET` in that script
     above the highest build number already used.
9. `Info.plist` already sets `ITSAppUsesNonExemptEncryption=false`, so the
   export-compliance question is skipped on every upload.

> **Do not** add `@capacitor/filesystem` or `@capacitor/share` — they break the
> committed `Package.resolved` and Xcode Cloud fails to resolve packages.

---

## 4. Android (optional)

`.github/workflows/android-release.yml` builds a signed `.aab` on demand. It
needs a keystore plus Play Console signing secrets in the repository's
**Settings → Secrets and variables → Actions**. Bundle ID is
`uk.co.druidspolo.poloact`.

---

## Club settings you may want to change

| What | Where |
|---|---|
| Captain PIN (currently `2004`) | `CAPTAIN_PIN` in `src/DruidsApp.jsx` |
| Contact email | `CONTACT_EMAIL` in `src/DruidsApp.jsx` |
| Chukka days & throw-in times | `DAY_CONFIG` / `DAY_KEYS` / `CHUKKA_START_MIN_*` |
| Ground names | `GROUND_OPTIONS` — `'Arena'` triggers the 3-a-side draw |
| Fixtures | `FIXTURES_2026` (captains can also edit fixtures in the app) |
| Prices | `PONY_HIRE_2026`, `LESSON_TYPES_2026`, `TOURNAMENT_ENTRY_2026`, `MEMBERSHIP_TYPES_2026`, `CHUKKA_FEE` |
| Tournament committee on PDFs | `DEFAULT_COMMITTEE` in `src/tournamentPdf.js` |
| Club quote / masthead | the `<blockquote>` in `src/DruidsApp.jsx` |

## Artwork

`public/crest.svg`, `public/crest-dark.svg` and `public/wordmark.svg` are the
club's **official** artwork, extracted from the logo on druidspolo.co.uk. The
paths are unmodified — only the enclosing viewBox differs, so the crest and the
wordmark can be placed independently. `crest-dark.svg` is the dark-on-white
variant used on the white PDF programme pages.

If the artwork is ever updated:

1. Replace `public/crest.svg` (and `crest-dark.svg` to match).
2. Regenerate every raster — PWA icons, favicon, Apple touch icon, the iOS
   AppIcon set and splash, the Watch icon, and the Android launcher icons and
   splashes:
   ```sh
   cd druids-app
   npm install --no-save sharp
   node scripts/generate-icons.mjs
   ```
3. Re-embed the PDF crest: render `public/crest-dark.svg` to a 512×512 PNG,
   base64-encode it, and replace the `DLPC_CREST` data URI at the top of
   `src/tournamentPdf.js`.

Brand colours, taken from the logo file: `#231F20` ink, `#FBB415` gold,
`#FEFEFE` white.
