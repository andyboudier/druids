// The club's privacy notice, as shown in the app (TermsSheet.jsx, doc
// "privacy") and as the public page /privacy.html, which
// scripts/legal-pages.mjs writes from this file on every build — the app
// stores ask for a privacy policy at a public address. One source, so the
// two cannot drift.
//
// Only PRIVACY_CLUB differs from club to club; the text below is built from
// it. Points in [square brackets] are for the club to confirm, and
// PRIVACY_DRAFT shows the draft notice until it has.

import { TERMS_CLUB } from './terms.js';

export const PRIVACY_CLUB = {
  controller: 'Druids Lodge Polo Club',
  address: 'Druids Lodge, Salisbury, Wiltshire SP3 4UN',
  email: 'abi@druidspolo.co.uk',
  phone: '01722 782597',
  // Where the club's Firestore database is (Firebase console → Firestore);
  // '' until someone has looked.
  dbLocation: '',
  // Whether the club has confirmed it is the data controller (not, say, a
  // parent charity); until then the notice says it is to be confirmed.
  controllerConfirmed: false,
  // Who supplies the club ponies, if anyone outside the club sees riders' names.
  ponySupplier: '',
  // What the club's special rates are kept on the player record for.
  rateStatus: 'whether you are a student (for student rates)',
  // Notifications on the device (web push), and the office's copy of every
  // booking email — what this club's app actually does.
  push: false,
  officeCopies: false,
};

export const PRIVACY_UPDATED = '23 October 2026';
export const PRIVACY_DRAFT = true;

const C = PRIVACY_CLUB;
const club = TERMS_CLUB.name;

// Sections: a heading and its lines. A line starting "• " is a bullet; a
// line a club's switches turn off is left out.
export const PRIVACY_SECTIONS = [
  { h: 'Who we are', p: [
    `This notice explains how ${club} (“the club”, “we”) uses your personal information when you use the club’s app and website, book with us, or play at the club. We follow UK GDPR and the Data Protection Act 2018.`,
    `${C.controller}, ${C.address}, is the data controller.${C.controllerConfirmed ? '' : ' [Committee to confirm the legal entity that is the controller.]'} For any privacy question, or to use your rights, email ${C.email} or phone ${C.phone}.`,
    'The app is built and run for the club by ACT Systems Ltd, which processes your information only on the club’s instructions.',
  ] },
  { h: 'What we collect', p: [
    '• Your account: your name and email address, how you sign in (email and password, an emailed link, Google or Apple) and an account number. If you sign in with Apple and choose to hide your email, we receive Apple’s relay address instead. We never see your password, and we do not receive your Google or Apple password.',
    `• Your player details: name, handicap, HPA number, mobile number, membership type, ${C.rateStatus}, your team, and any subsidy the club applies to your lessons.`,
    '• A profile picture, if you add one or your Google account has one. You can remove it at any time.',
    '• Your bookings: chukkas, times, pony choice, lessons, club sessions, waiting lists, tournament entries (including the players you enter and their share of the fee), answers to events, and the prices quoted.',
    '• Payments, once card payment is live: Stripe takes the payment and holds your card details; we receive only the result and the amount.',
    C.push && '• Notifications: if you turn on notifications, an address for your device that lets us send them. It is not your phone number.',
    '• Visits: the number of visits to each page, counted by our host without cookies and without identifying you.',
  ] },
  { h: 'Why we use it', p: [
    '• To take and manage your bookings, make the draw, run lessons, sessions and tournaments, and charge the right price (to perform our contract with you).',
    `• To send booking confirmations, changes, cancellations, waiting-list news and reminders by email${C.push ? ', and notifications if you have turned them on' : ''} (contract, and our legitimate interest in running the club).`,
    '• To keep riders and ponies safe, for example handicap limits on beginners’ sessions (legitimate interests).',
    '• To keep financial records, once payments are taken (legal obligation).',
    'We do not sell your information, use it for advertising, or track you across other apps and websites. We send marketing only if you have agreed to it.',
  ] },
  { h: 'Who can see it', p: [
    '• Other members and visitors to the app see your name, handicap and team on the day’s list, in the draw, on tournament entries and on the live score.',
    '• Your mobile number, email address, membership, rates status and subsidies are shown in the app only to the club’s admins.',
    '• If you book for a teammate, or they book for you, each of you sees the other’s bookings.',
    C.officeCopies && `• The club’s office and admins receive an email${C.push ? ' and a notification' : ''} about every booking.`,
    C.ponySupplier && `• ${C.ponySupplier}, which the club contracts with for pony hire, is given the name of each rider on a club pony and the session they are booked on, so it can provide the pony.`,
  ] },
  { h: 'Service providers', p: [
    'We use these companies to run the app. Each acts on our instructions under a data processing agreement.',
    `• Google (Firebase): sign-in, and the database, ${C.dbLocation ? `which is in ${C.dbLocation}` : '[confirm the database location, for example europe-west2 (London)]'}.`,
    '• Vercel: hosts the app and the website, and counts visits without cookies.',
    '• Resend: sends the app’s emails.',
    `• Apple and Google: if you choose to sign in with them${C.push ? '; and Apple, Google or Mozilla deliver notifications to your device if you turn them on' : ''}.`,
    '• Stripe: card payments, once live.',
    'Vercel and Resend are based in the United States, and Google may process data there. Where information leaves the UK, it is protected by the UK’s adequacy regulations (including the UK–US Data Bridge) or the UK International Data Transfer Addendum.',
  ] },
  { h: 'How long we keep it', p: [
    '• Your account: until you delete it.',
    '• Each week’s chukka list: replaced when the admin clears it for the next week. The last 50 versions of the lists are kept so that a mistaken clear can be undone; older ones drop off as new ones are added.',
    '• Lesson, session and tournament bookings: [two years], for the club’s records.',
    '• Payment records: six years, as the law requires.',
    '• Your player record: while you play at the club and for [two years] after, so your handicap and team are there when you come back. Ask and we will delete it sooner.',
  ] },
  { h: 'Deleting your account', p: [
    `You can delete your account in the app: Home → Your profile → Delete my account. This removes your sign-in, your profile and picture${C.push ? ', and your notification settings' : ''} straight away. Your bookings and your player record stay with the club for the times above, without the link to your account; email us to have those deleted too.`,
    `You can also ask by email to ${C.email}, without opening the app. Details are on our website at /delete-account.html.`,
  ] },
  { h: 'Your rights', p: [
    `You have the right to see the information we hold about you, to have it corrected or deleted, to object to or restrict how we use it, to take a copy of it, and to withdraw consent you have given${C.push ? ' (for example to notifications)' : ''}. Email us and we will reply within one month.`,
    'If you are unhappy with how we have handled your information, you can complain to the Information Commissioner’s Office at ico.org.uk or on 0303 123 1113.',
  ] },
  { h: 'Cookies and your device', p: [
    'We set no tracking or advertising cookies. The app keeps a few small settings on your device so it works as you left it: that you are signed in, your usual booking choices, notices you have dismissed and, for admins, that the PIN has been entered. Signing out or clearing the app’s data removes them.',
  ] },
  { h: 'Children', p: [
    'The app is for members and riders of the club. A rider under 18 should be booked by a parent or guardian, who accepts the booking terms for them. We do not knowingly create accounts for children under 13.',
  ] },
  { h: 'Changes to this notice', p: [
    'We will update this notice when what we do changes. The date at the top shows the latest version, and we will tell members in the app about any important change.',
  ] },
].map((s) => ({ ...s, p: s.p.filter(Boolean) }));
