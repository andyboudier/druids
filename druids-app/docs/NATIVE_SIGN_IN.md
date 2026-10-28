# Sign-in inside the iOS and Android apps

The store apps show the club's site (druids.poloact.co.uk) in a web view. Google refuses
to sign anyone in from a web view, and Apple expects its own sign-in sheet in
an iPhone app. So from **1.1.0** the apps carry the native sign-in plugin
`@capacitor-firebase/authentication`. It shows the phone's own Google or Apple
sheet and passes the result to the site, which signs in to the same Firebase
account as on the web (`src/authFirebase.js`, `methodsHere`).

An app without the plugin is an older store version. The site detects that
and offers email and password only, so nobody meets a dead end. That is what
members see in 1.0.x.

The plugin needs the club's Firebase files for each app. The iOS and Android
builds **stop with an error** if those files are missing, rather than ship an
app that would crash at launch.

## 1. Firebase console (project `druids-lodge-polo`)

1. Project settings → Your apps. If they are not listed, add:
   - an **iOS app** with bundle ID `uk.co.druidspolo.poloact`;
   - an **Android app** with package name `uk.co.druidspolo.poloact`.
2. **Android SHA-1 fingerprints.** Add both to the Android app:
   - the upload key's fingerprint, from the upload keystore in the repository secrets;
   - the **app signing key** fingerprint, from Play Console → Test and
     release → App integrity → App signing.

   Without the second one, Google sign-in works only for builds signed by
   hand, not for the copy installed from Google Play.
3. Download **GoogleService-Info.plist** and commit it as
   `druids-app/ios/App/firebase/live/GoogleService-Info.plist`.
4. Download **google-services.json** and commit it as
   `druids-app/android/firebase/live/google-services.json`.

   Both identify the apps to Firebase and are not secrets. The builds copy
   them into place; never commit one straight into `ios/App/App/` or
   `android/app/`.
5. Authentication → Sign-in method: Google, Apple and Email/Password are
   already on (the website uses them). Under Apple, the Team ID, Key ID and
   private key must be filled in: Firebase needs them to revoke Apple's
   tokens when a member deletes their account, which Apple requires.

## 2. Apple Developer

1. Certificates, Identifiers & Profiles → Identifiers → the App ID
   `uk.co.druidspolo.poloact` → tick **Sign in with Apple** and save. The app declares it in
   `ios/App/App/App.entitlements`; Xcode Cloud's automatic signing picks it
   up once the App ID has it.
2. Keys → a key with **Sign in with Apple** (if there isn't one): note the Key
   ID and keep the `.p8` for the Firebase Apple provider (step 1.5).

## 3. Builds

- **iOS (Xcode Cloud).** `ios/App/ci_scripts/ci_post_clone.sh` checks for the
  plist, copies it into the app, adds Google's return URL scheme
  (`REVERSED_CLIENT_ID`) to Info.plist, and writes `Package.resolved` afresh
  after `cap sync`. The plugin needs Xcode 16.3 or later.
- **Android (GitHub Actions → Build Android AAB).** The workflow checks for
  `google-services.json` and copies it into `android/app/`.
- **Capacitor 8.5.3.** Needed for the plugin's Swift package options (the
  Facebook SDK is left out). `SceneDelegate.swift` still hands URLs to
  `ApplicationDelegateProxy` itself, which works on 8.5 as on 8.3.
- **Version 1.1.0**: `MARKETING_VERSION` in the Xcode project (app, widget,
  Watch) and `versionName` in `android/app/build.gradle`. Change them
  together.

## 4. Check before submitting

On a TestFlight build and an internal-testing Play build:

- Google sign-in; Apple sign-in on iOS.
- Email and password sign-in.
- Your profile → Add Google / Add Apple.
- Delete my account with a Google or Apple account.
