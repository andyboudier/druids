// Where each ground actually is, so a member can tap through to directions.
//
// A pin is just a latitude and longitude kept against the ground's name, in
// the shared key `ground-pins`. Set it once for "Fisher" and every Wednesday
// roster, every fixture day and every WhatsApp message that names Fisher can
// point at it.
//
// There is deliberately no embedded map. An interactive Google map on the page
// needs an API key and a billing account, and buys little here: the two ways a
// captain actually knows where a ground is are standing on it (the phone knows)
// and having it open in Google Maps already (paste the link). Both are below,
// and neither needs a key. Members are handed off to whichever maps app they
// have.

// Latitude −90..90, longitude −180..180, and not the null island that a
// truncated paste so often produces.
const sane = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) &&
  Math.abs(lat) <= 90 && Math.abs(lng) <= 180 &&
  !(lat === 0 && lng === 0);

const round = (n) => Math.round(n * 1e6) / 1e6;  // ~10cm, far past what a pin needs

// Pull coordinates out of whatever the captain pasted: a bare pair, or any of
// the shapes a Google Maps URL takes.
//
//   51.234567, -1.678901
//   https://www.google.com/maps/@51.234567,-1.678901,17z
//   https://www.google.com/maps/place/Foo/@51.234567,-1.678901,17z/data=…!3d51.234!4d-1.678
//   https://www.google.com/maps/search/?api=1&query=51.234567%2C-1.678901
//   https://maps.google.com/?ll=51.234567,-1.678901
//   geo:51.234567,-1.678901
//
// Returns { lat, lng } or null. A short maps.app.goo.gl link carries no
// coordinates at all — only the server it redirects to knows them — so it
// cannot be parsed here; shortLink() below spots one so the app can say so.
export function parseGroundPin(input) {
  const s = String(input || '').trim();
  if (!s) return null;
  const pair = (a, b) => {
    const lat = parseFloat(a), lng = parseFloat(b);
    return sane(lat, lng) ? { lat: round(lat), lng: round(lng) } : null;
  };
  // The !3d/!4d pair is the place's own point, so prefer it to the @ centre,
  // which is wherever the map happened to be scrolled to.
  let m = s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (m) { const p = pair(m[1], m[2]); if (p) return p; }
  // query= / q= / ll= / destination=, percent-encoded comma included
  m = s.match(/[?&](?:q|ll|query|destination|daddr)=(-?\d+(?:\.\d+)?)(?:,|%2C)\s*(-?\d+(?:\.\d+)?)/i);
  if (m) { const p = pair(m[1], m[2]); if (p) return p; }
  m = s.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (m) { const p = pair(m[1], m[2]); if (p) return p; }
  m = s.match(/^geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i);
  if (m) { const p = pair(m[1], m[2]); if (p) return p; }
  // A bare pair, comma or whitespace separated. Anchored, so a stray number
  // in a URL we did not understand is not mistaken for a location.
  m = s.match(/^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (m) return pair(m[1], m[2]);
  return null;
}

// A shortened Google link, which has to be opened before it says where it is.
export const shortLink = (input) => /(?:maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(String(input || ''));

export const formatPin = (pin) => (pin ? `${pin.lat}, ${pin.lng}` : '');

// Directions from wherever the member is. This universal URL opens the Google
// Maps app when it is installed and the website when it is not; on an iPhone
// with no Google Maps it lands in Safari, which still offers the route.
export const directionsUrl = (pin) =>
  pin ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${pin.lat},${pin.lng}`)}` : '';

// Just show me where that is, without starting a route.
export const placeUrl = (pin) =>
  pin ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${pin.lat},${pin.lng}`)}` : '';

// Pins are kept against the ground's name, matched loosely so a change of
// case or stray space does not lose the location.
export const pinKey = (ground) => String(ground || '').trim().replace(/\s+/g, ' ').toLowerCase();

export const pinFrom = (pins, ground) => {
  const k = pinKey(ground);
  if (!k || !pins) return null;
  const p = pins[k];
  return p && sane(p.lat, p.lng) ? p : null;
};

// The phone's own idea of where it is — the captain standing on the ground.
export function currentPin() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('This device cannot report its location.'));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (!sane(latitude, longitude)) return reject(new Error('That location did not look right.'));
        resolve({ lat: round(latitude), lng: round(longitude), accuracy: Math.round(pos.coords.accuracy || 0) });
      },
      (err) => reject(new Error(
        err && err.code === 1 ? 'Location is switched off for this site — allow it in your browser settings.'
        : err && err.code === 3 ? 'Took too long to find you. Try again outside.'
        : 'Could not work out where you are.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}
