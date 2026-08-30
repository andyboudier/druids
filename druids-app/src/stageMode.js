// "Stage mode" for Live Game: fill the screen and stop it going to sleep, so a
// phone propped on the boards keeps showing the score through a chukka.
//
// Two independent capabilities behind one switch, because that is how it is
// used — "put this on and leave it" — but they are requested and reported
// separately, since the pair is not available everywhere:
//
//   Wake lock   — Chrome/Edge/Android, and Safari from iOS 16.4. This is the
//                 half that actually matters, and it works in the native app.
//   Full screen — everywhere except iPhone Safari, which has never shipped the
//                 Fullscreen API. In the native app there is no browser chrome
//                 to hide, so there is nothing for it to do there either.
//
// So on an iPhone the toggle still keeps the screen awake and simply has no
// full screen to enter. The caller is told which parts took effect and says so,
// rather than the switch appearing to do nothing.

export const canFullscreen = () => {
  if (typeof document === 'undefined') return false;
  const el = document.documentElement;
  return !!(el.requestFullscreen || el.webkitRequestFullscreen);
};

export const canWakeLock = () =>
  typeof navigator !== 'undefined' && 'wakeLock' in navigator;

export const isFullscreen = () =>
  typeof document !== 'undefined'
  && !!(document.fullscreenElement || document.webkitFullscreenElement);

const enterFullscreen = async () => {
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req) return false;
  try {
    // navigationUI:'hide' is a hint; browsers that don't know it ignore it.
    await req.call(el, { navigationUI: 'hide' });
    return true;
  } catch (e) {
    return false;
  }
};

const leaveFullscreen = async () => {
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  if (!exit || !isFullscreen()) return;
  try { await exit.call(document); } catch (e) { /* already out */ }
};

let sentinel = null;

const acquireWakeLock = async () => {
  if (!canWakeLock()) return false;
  try {
    sentinel = await navigator.wakeLock.request('screen');
    // The browser drops the lock whenever the page is hidden — switching apps,
    // locking the phone by hand. Clear our handle so re-showing can re-request.
    sentinel.addEventListener('release', () => { sentinel = null; });
    return true;
  } catch (e) {
    // Refused: usually a background tab, or a battery-saver mode.
    sentinel = null;
    return false;
  }
};

const releaseWakeLock = async () => {
  if (!sentinel) return;
  try { await sentinel.release(); } catch (e) { /* already gone */ }
  sentinel = null;
};

export const hasWakeLock = () => sentinel !== null;

// Turn stage mode on. Returns what actually took effect so the caller can be
// honest about it.
export async function enterStageMode() {
  const [fullscreen, awake] = await Promise.all([enterFullscreen(), acquireWakeLock()]);
  return { fullscreen, awake };
}

export async function exitStageMode() {
  await Promise.all([leaveFullscreen(), releaseWakeLock()]);
}

// Coming back to the page after it was hidden: the wake lock is gone and has to
// be asked for again. Returns true if we now hold one.
export async function reacquireWakeLock() {
  if (sentinel) return true;
  if (document.visibilityState !== 'visible') return false;
  return acquireWakeLock();
}
