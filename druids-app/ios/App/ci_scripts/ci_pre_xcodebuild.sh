#!/bin/sh
# Xcode Cloud pre-build: stamp a unique build number.
#
# Every TestFlight upload needs a build number higher than the last one used for
# this bundle ID. Xcode Cloud hands us a monotonically increasing $CI_BUILD_NUMBER
# per workflow run, so writing it into CURRENT_PROJECT_VERSION guarantees that.
#
# This is a brand-new app, so the numbering starts at 1. If the app ever gets
# re-created (new App Store Connect record reusing an old bundle ID), add an
# offset here above the highest build number already used, or uploads fail with
# "build number already used / too low".
set -ex

OFFSET=0

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"   # …/ios/App

BUILD_NUMBER=$(( ${CI_BUILD_NUMBER:-1} + OFFSET ))
echo "Setting CURRENT_PROJECT_VERSION to $BUILD_NUMBER"

# Applies to every target (app, Watch app, widget) so their build numbers stay
# in lockstep — App Store Connect rejects a bundle whose embedded targets
# disagree.
cd "$APP_DIR"
xcrun agvtool new-version -all "$BUILD_NUMBER"
