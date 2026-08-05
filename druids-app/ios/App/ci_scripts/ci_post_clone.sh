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

# Build the web bundle, then sync web assets + plugin/SPM wiring into iOS.
npm run build
npx cap sync ios
