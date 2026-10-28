#!/bin/sh
# build trigger: 2026-08-05 — bump to 1.0.1 (custom domain + new icons).
# Xcode Cloud post-clone: install JS deps so the Capacitor Swift packages
# (referenced by CapApp-SPM/Package.swift at ../../../node_modules/@capacitor/*)
# exist before Xcode resolves Swift Package dependencies.
set -ex

# Resolve the web/Capacitor project dir from THIS script's location, so it works
# regardless of CI_PRIMARY_REPOSITORY_PATH. This script lives at
# druids-app/ios/App/ci_scripts/ -> ../../.. is druids-app.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$PROJECT_DIR"
echo "Project dir: $PROJECT_DIR"
ls -la

# Ensure Node/npm are available (Xcode Cloud runners may not ship Node).
if ! command -v npm >/dev/null 2>&1; then
  brew install node@22
  export PATH="$(brew --prefix node@22)/bin:$PATH"
fi
echo "node $(node --version)  npm $(npm --version)"

# Install JS deps -- this creates node_modules/@capacitor/*. Skip audit/fund
# (extra registry calls that can fail on the CI network). Retry once with a
# clean tree if the first attempt fails.
if ! npm install --legacy-peer-deps --no-audit --no-fund; then
  echo "npm install failed; clearing node_modules + lockfile and retrying clean" >&2
  rm -rf node_modules package-lock.json
  npm cache clean --force || true
  npm install --legacy-peer-deps --no-audit --no-fund
fi

echo "--- node_modules/@capacitor ---"
ls -1 node_modules/@capacitor 2>&1 || echo "(none)"

# Fail loudly (with a directory listing) if any SPM-referenced plugin package is
# still missing, so the cause is obvious in the build logs.
for p in app splash-screen status-bar local-notifications push-notifications ios; do
  if [ ! -d "node_modules/@capacitor/$p" ]; then
    echo "ERROR: node_modules/@capacitor/$p missing after npm install" >&2
    ls -la node_modules/@capacitor 2>/dev/null || echo "(no node_modules/@capacitor at all)"
    exit 1
  fi
done

# Native Google/Apple sign-in needs the club's Firebase config for the iOS
# app. Without it the sign-in plugin cannot start and the app would crash at
# launch, so stop the build here with a clear message instead. The plist
# lives in ios/App/firebase/live/ and is copied into the app.
SRC="ios/App/firebase/live/GoogleService-Info.plist"
GSI="ios/App/App/GoogleService-Info.plist"
if [ ! -f "$SRC" ]; then
  echo "ERROR: $SRC is missing. Download GoogleService-Info.plist for the iOS app uk.co.druidspolo.poloact from the club's Firebase project and commit it there. See docs/NATIVE_SIGN_IN.md." >&2
  exit 1
fi
cp "$SRC" "$GSI"
# Google Sign-In returns to the app through a URL scheme: the reversed client
# ID from that file. Add it to Info.plist if it is not there yet.
REVERSED=$(/usr/libexec/PlistBuddy -c "Print :REVERSED_CLIENT_ID" "$GSI")
INFO="ios/App/App/Info.plist"
if ! /usr/libexec/PlistBuddy -c "Print :CFBundleURLTypes" "$INFO" 2>/dev/null | grep -q "$REVERSED"; then
  /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes array" "$INFO" 2>/dev/null || true
  /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0 dict" "$INFO"
  /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes array" "$INFO"
  /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string $REVERSED" "$INFO"
  echo "Added Google Sign-In URL scheme to Info.plist"
fi

# Build the web bundle, then sync web assets + plugin/SPM wiring into iOS.
npm run build
npx cap sync ios

# Xcode Cloud resolves Swift packages with automatic resolution switched off,
# so Package.resolved must already list every package the app uses — and
# `cap sync` above may have just changed them (the native sign-in plugin
# brings Firebase and Google Sign-In). Write it afresh here, on Apple's own
# toolchain, before Xcode Cloud checks it.
# Xcode Cloud also switches automatic resolution off machine-wide, which
# would stop this resolve too, so lift that for this one step; its own
# dependency check afterwards still runs with resolution off, against the
# file written here.
RESOLVED="ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved"
defaults delete com.apple.dt.Xcode IDEPackageOnlyUseVersionsFromResolvedFile 2>/dev/null || true
defaults delete com.apple.dt.Xcode IDEDisableAutomaticPackageResolution 2>/dev/null || true
cp "$RESOLVED" "$RESOLVED.bak" 2>/dev/null || true
rm -f "$RESOLVED"
if ! xcodebuild -resolvePackageDependencies -project ios/App/App.xcodeproj -scmProvider system; then
  echo "ERROR: resolving the Swift packages failed (see above)." >&2
  [ -f "$RESOLVED.bak" ] && mv "$RESOLVED.bak" "$RESOLVED"
  exit 1
fi
rm -f "$RESOLVED.bak"
echo "--- Package.resolved ---"
grep -o '"identity" : "[^"]*"' "$RESOLVED" || true
