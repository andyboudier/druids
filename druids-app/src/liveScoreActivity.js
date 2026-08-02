import { registerPlugin, Capacitor } from '@capacitor/core';

// Native iOS plugin (LiveScoreActivityPlugin). Absent on web/Android, where
// every call below becomes a safe no-op.
const Native = registerPlugin('LiveScoreActivity');

const onIOS = () => Capacitor.getPlatform() === 'ios';

/** Whether Live Activities are available and enabled on this device. */
export async function liveScoreSupported() {
  if (!onIOS()) return false;
  try {
    const res = await Native.isSupported();
    return !!(res && res.supported);
  } catch {
    return false;
  }
}

/**
 * Start the live-score activity for a match.
 * @returns the activity id, or null if it couldn't start.
 * data: { teamAName, teamBName, matchLabel, scoreA, scoreB, status, isLive }
 */
export async function startLiveScore(data) {
  if (!onIOS()) return null;
  try {
    const res = await Native.start(data);
    return (res && res.id) || null;
  } catch (e) {
    console.warn('[LiveActivity] start failed', e);
    return null;
  }
}

/** Push a new score/chukka snapshot. data: { id?, scoreA, scoreB, status, isLive } */
export async function updateLiveScore(data) {
  if (!onIOS()) return;
  try {
    await Native.update(data);
  } catch (e) {
    console.warn('[LiveActivity] update failed', e);
  }
}

/** End the activity (full time). data: { id?, scoreA, scoreB, status? } */
export async function endLiveScore(data = {}) {
  if (!onIOS()) return;
  try {
    await Native.end(data);
  } catch (e) {
    console.warn('[LiveActivity] end failed', e);
  }
}
