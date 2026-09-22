// Joining a signed-in account to the club's own record of the player, and
// tidying up when the same person ends up on the list twice.
//
// The club's player database came first and is maintained by hand; sign-in
// came later. So a member who signs in has to be recognised as someone the
// club already knows, or the app would treat every regular as a stranger.
//
// Four ways in, strongest first:
//
//   uid     an explicit link, written once a match is confirmed and rewritten
//           whenever a captain (or the member) corrects it. It wins over
//           everything else, which is what makes a wrong guess fixable.
//   email   the club supplies these, so this is the intended path.
//   mobile  compared as the national number, so +44 7700 900123 and
//           07700 900123 are one person.
//   name    first and last, normalised. The weakest signal and deliberately
//           the last resort: two members can share a name, and when they do
//           the match is reported ambiguous rather than guessed.
//
// Nothing here touches storage or Firebase — it is all pure, so it can be
// tested directly and shared by all four apps unchanged.

export const MATCH_LABEL = {
  uid: 'linked account',
  email: 'email',
  mobile: 'mobile',
  name: 'name',
};

export const normEmail = (s) => String(s || '').trim().toLowerCase();

// Reduce a phone number to the national significant number, so the same
// person written four different ways compares equal. Returns '' for anything
// too short to be worth matching on — a stray "07" must never join two people.
export const normMobile = (s) => {
  let d = String(s || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);          // 0044…
  // Strip the UK country code only when what is left looks like a UK number;
  // a national number never starts 44 here, since UK mobiles start 07.
  if (d.startsWith('44') && /^44[17]/.test(d)) d = d.slice(2);
  d = d.replace(/^0+/, '');                        // 07700… → 7700…
  return d.length >= 9 ? d : '';
};

// Case, spacing, punctuation and accents all vary in a list typed by hand
// over years. Require both a first and a last name: a lone "Andy" is not
// enough to claim a record.
export const normName = (s) => {
  const t = String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim().replace(/\s+/g, ' ');
  return t.split(' ').filter(Boolean).length >= 2 ? t : '';
};

const active = (p) => p && p.active !== false;

// Everything known about whoever is signed in, from any source.
const accountKeys = (account) => {
  const a = account || {};
  return {
    uid: String(a.uid || '').trim(),
    email: normEmail(a.email),
    mobile: normMobile(a.mobile),
    name: normName(a.name || a.displayName),
  };
};

// Find the club's record for a signed-in account.
//
// Returns { player, how, candidates }. `how` names which of the four keys
// matched. When a key matches more than one record nothing is chosen: the
// candidates come back instead, for a person to settle. Guessing there is how
// one member ends up booking under another's name.
export function matchPlayer(players, account) {
  const list = (players || []).filter(active);
  const k = accountKeys(account);
  const tries = [
    ['uid', (p) => k.uid && String(p.uid || '').trim() === k.uid],
    ['email', (p) => k.email && normEmail(p.email) === k.email],
    ['mobile', (p) => k.mobile && normMobile(p.mobile) === k.mobile],
    ['name', (p) => k.name && normName(p.name) === k.name],
  ];
  for (const [how, test] of tries) {
    const hits = list.filter(test);
    if (hits.length === 1) return { player: hits[0], how, candidates: [] };
    if (hits.length > 1) return { player: null, how, candidates: hits };
  }
  return { player: null, how: null, candidates: [] };
}

// Records that look like the same person as `player`. Used to offer a merge
// rather than leave the club with two half-filled entries — the pre-existing
// one the captain typed, and whatever a sign-in created beside it.
export function duplicatesOf(players, player) {
  if (!player) return [];
  const em = normEmail(player.email);
  const mo = normMobile(player.mobile);
  const nm = normName(player.name);
  return (players || []).filter((p) => {
    if (!p || p.id === player.id) return false;
    // Two records both explicitly linked to different accounts are two people,
    // however alike they look.
    const bothLinked = p.uid && player.uid && p.uid !== player.uid;
    if (bothLinked) return false;
    return (em && normEmail(p.email) === em)
      || (mo && normMobile(p.mobile) === mo)
      || (nm && normName(p.name) === nm);
  });
}

// Which fields actually disagree between two records, so a merge can be shown
// before it is done rather than after. Notes are deliberately absent: the
// merge keeps both, so calling them a conflict would warn a captain about
// losing something they are not about to lose.
export const MERGE_FIELDS = ['name', 'email', 'mobile', 'handicap', 'team', 'type', 'membership', 'unit'];

export function mergeConflicts(primary, other) {
  const out = [];
  for (const f of MERGE_FIELDS) {
    const a = primary && primary[f] != null && primary[f] !== '' ? primary[f] : null;
    const b = other && other[f] != null && other[f] !== '' ? other[f] : null;
    if (a != null && b != null && String(a).trim() !== String(b).trim()) out.push({ field: f, keep: a, drop: b });
  }
  return out;
}

// Fold `other` into `primary`. The primary's id survives, because rosters,
// waiting lists and transactions already point at it; the other record is the
// caller's to delete once this returns.
//
// Anything the primary is missing is taken from the other, so a merge never
// loses a detail. Tokens add up — both were paid for. Subsidies union. Where
// both records say something different the primary wins, and mergeConflicts()
// is what lets a captain see that before agreeing to it.
export function mergePlayers(primary, other) {
  if (!primary) return other;
  if (!other) return primary;
  // Every field either record has, not a fixed list: the clubs' records differ
  // (TPPC has military and team, Druids has student and neither), and naming
  // them here would either drop a field or invent one the club never uses.
  const out = { ...other, ...primary };
  for (const k of Object.keys(out)) {
    const a = primary[k];
    if (a == null || a === '') {
      const b = other[k];
      if (b != null && b !== '') out[k] = b;
    }
  }
  // The handful that are not "primary wins".
  out.id = primary.id;
  out.subsidies = Array.from(new Set([
    ...(Array.isArray(primary.subsidies) ? primary.subsidies : []),
    ...(Array.isArray(other.subsidies) ? other.subsidies : []),
  ]));
  // Both were paid for.
  out.tokens = (Number(primary.tokens) || 0) + (Number(other.tokens) || 0);
  // Active if either side was: the live record is the one that matters, and an
  // old archived duplicate must not archive them.
  out.active = primary.active !== false || other.active !== false;
  // A flag is sticky — whichever record carries it is the one that knows.
  for (const flag of ['military', 'student', 'vip']) {
    if (flag in primary || flag in other) out[flag] = !!(primary[flag] || other[flag]);
  }
  out.uid = primary.uid || other.uid || '';
  out.authProviders = providerUnion(primary.authProviders, other.authProviders);
  out.linkedBy = primary.linkedBy || other.linkedBy || '';
  const notes = [primary.notes, other.notes].map((n) => String(n || '').trim()).filter(Boolean);
  out.notes = notes.join(notes.length > 1 ? ' \u00b7 ' : '');
  out.updatedAt = Date.now();
  return out;
}

// --- How they signed in -------------------------------------------------
//
// Firebase keeps one account per email address, so whoever signed up first
// owns it and the second way in is refused. Recording the ways a player has
// actually used lets the app say which one, instead of leaving them to guess.

export const PROVIDER_LABEL = {
  'google.com': 'Google',
  'apple.com': 'Apple',
  'facebook.com': 'Facebook',
  'password': 'email',
  'emailLink': 'an emailed sign-in link',
};

export const providerLabel = (id) => PROVIDER_LABEL[id] || String(id || '').replace(/\.com$/, '') || 'another way';

export const providerUnion = (a, b) => Array.from(new Set([
  ...(Array.isArray(a) ? a : []),
  ...(Array.isArray(b) ? b : []),
].filter(Boolean)));

// "Google", "Google or Apple", "Google, Apple or an emailed sign-in link".
export function providerSentence(ids) {
  const names = providerUnion(ids, []).map(providerLabel);
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
}

// The line shown when someone tries a second way in. Firebase hides which
// methods exist when email-enumeration protection is on, so the club's own
// record of what they have used is the more reliable source of the two.
export function alreadySignedUpWith(ids) {
  const s = providerSentence(ids);
  return s
    ? `You already have an account with that email — you signed up with ${s}. Use that to sign in, and you can add this way afterwards.`
    : 'You already have an account with that email, made a different way. Sign in the way you did the first time.';
}
