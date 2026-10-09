// The club's booking terms, as shown in the app (TermsSheet.jsx). The working
// text is adapted from Tedworth Park Polo Club's draft (the shared "TPPC Booking
// Terms and Conditions" doc), with this club's details; kept in step by hand — less what this app
// does not do yet (booking emails, and the accept step, which waits for
// sign-in to be switched on).
//
// TERMS_VERSION is what a member accepts. Change it whenever the terms change
// in a way members should see: everyone signed in is asked to accept again
// before their next booking (see `needTerms` in PoloChukkas.jsx).

export const TERMS_VERSION = '2026-10-draft-3';

// Who the terms are for, and how the sheet looks (TermsSheet.jsx reads it).
export const TERMS_CLUB = {
  name: 'Druids Lodge Polo Club',
  crest: '/crest.svg', crestRound: false,
  colors: {
    bg: '#0d0c0c', card: '#231f20', line: '#3a3634', burg: '#3a3634',
    gold: '#c9910f', gold2: '#fbb415', cream: '#faf9f7', muted: '#b5afa9',
  },
};
export const TERMS_DRAFT = true; // shows "Draft — awaiting committee review"

// The points a member reads before ticking "I accept".
export const TERMS_SUMMARY = [
  'Sessions are for a set date, so there is no 14-day cooling-off period. You can cancel free of charge until the cut-off shown in the app.',
  'Prices come from the club’s rate card and are shown before you book. You pay by card through a secure Stripe payment link.',
  'Polo carries a real risk of falls and injury. Wear an HPA-standard helmet and tell the coach about any medical condition.',
  'If you bring your own pony, you are responsible for its fitness, vaccinations and insurance.',
  'We use your details to run bookings, as the privacy notice explains.',
];

export const TERMS_SECTIONS = [
  { h: '1. About these terms', p: [
    '1.1 These terms apply to every booking made with Druids Lodge Polo Club (“the club”, “we”, “us”) through the club’s app, by email, by phone or in person. They cover chukkas, lessons, club sessions, courses, clinics, instructional tournaments and pony hire.',
    '1.2 The club is Druids Lodge Polo Club, Druids Lodge, Salisbury, Wiltshire SP3 4UN. Phone 01722 782597; email abi@druidspolo.co.uk. [Committee to confirm the club’s legal form and registered name.]',
    '1.3 The app is provided for the club by ACT Systems Ltd. Your booking contract is with the club, not with ACT Systems.',
    '1.4 You accept these terms each time you make a booking. If you book for someone else (section 2), you confirm they accept these terms too.',
    '1.5 Membership, tournament entry and the club’s rules for play have their own terms. If they conflict with these terms on a booking, these terms apply to that booking.',
    '1.6 If you are booking as a consumer, nothing in these terms affects your statutory rights.',
  ] },
  { h: '2. Bookings', p: [
    '2.1 A booking is confirmed when the app shows it as booked. For chukkas, a confirmed booking is a place on that day’s list, not a promise of particular chukkas, team or ground: the captain makes the draw.',
    '2.2 Each chukka day closes for booking at the cut-off shown in the app. A day may also close early when it is full. A full day may offer a waiting list.',
    '2.3 Joining a waiting list costs nothing and is not a booking. If a place comes up, the club moves you onto the list, the booking is charged as normal and we let you know.',
    '2.4 A lesson is booked as individual or group. A group lesson goes ahead only once it has its minimum number of riders (section 5).',
    '2.5 You may book yourself, or a member of your team as recorded by the club. When you book for someone else, you confirm that you have their agreement, that the details you give are correct, and that they accept these terms. The charge goes on their account, not yours.',
    '2.6 Please give accurate details, including your handicap and mobile number. We may cancel a booking made with false details.',
    '2.7 We may refuse a booking for a good reason, such as safety, an unpaid balance or a breach of these terms. If we do, we will tell you why.',
  ] },
  { h: '3. Prices and payment', p: [
    '3.1 Prices are those on the club’s current rate card, which the app shows before you confirm a booking. The price shown when you book is the price you pay. [Committee to confirm whether prices include VAT.]',
    '3.2 Student and alumni rates apply to players the club has recorded as students or alumni. The club may ask for proof.',
    '3.3 A membership that includes chukka fees covers chukka fees only. Pony hire and lessons are charged separately unless the rate card says otherwise.',
    '3.4 You pay by card through a secure payment link from Stripe, the club’s payment provider. The club never sees or stores your full card details. Payment is due [before the session]. [Committee to confirm.]',
    '3.5 Subsidies from a fund the club manages are applied to lessons only, and only while the fund has money in it.',
    '3.6 We may suspend booking for anyone who has not paid for an earlier booking until it is paid.',
  ] },
  { h: '4. Cancelling or changing your booking', p: [
    '4.1 No 14-day cooling-off period. Chukkas, lessons, club sessions, courses and instructional tournaments are leisure services for a specific date. Under regulation 28(1)(b) of the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013, the 14-day right to cancel does not apply to them. Your rights to cancel are those in this section.',
    '4.2 You can cancel or change a booking in the app or by contacting the club. If you cancel before [the day’s booking cut-off / 48 hours before the start], there is no charge: anything you have paid is refunded to the same card. [Committee to confirm the notice period.]',
    '4.3 If you cancel after that point, or do not turn up, the full charge stands. We will waive it if your place is filled from the waiting list or by another rider.',
    '4.4 A change of chukkas, pony or times that alters the price is re-priced. If you have already paid, the club will settle the difference with you.',
    '4.5 We may waive a late-cancellation charge for illness, injury, a pony going lame or service duties. Tell us as soon as you can; the club may ask for evidence.',
  ] },
  { h: '5. If the club cancels or changes a session', p: [
    '5.1 We may cancel, shorten or move a session for weather, ground or arena conditions, the welfare of the ponies, safety, or too few riders. We will tell you as early as we can, through the app notice, email or phone.',
    '5.2 A group lesson that does not reach its minimum number may be run as a smaller group at the same price, changed to an individual lesson at the individual rate, or cancelled. We will tell you which and ask you before charging you more.',
    '5.3 If we cancel, you can have a full refund of what you paid for that session, or a credit to use later.',
    '5.4 If a session is cut short after it has started, we will refund or credit the part not played. Exception: if it was stopped because of your own conduct (section 7).',
    '5.5 We are not responsible for travel, accommodation or other costs you incur because a session is cancelled for reasons outside our control. This does not limit your statutory rights if the cancellation was our fault.',
  ] },
  { h: '6. Fitness, eligibility and handicaps', p: [
    '6.1 You must be fit and well enough to ride and play, and not under the influence of alcohol or drugs. Tell the coach or captain before you ride about any medical condition, injury or pregnancy that could affect your safety.',
    '6.2 Riders under 18 need the agreement of a parent or guardian, who accepts these terms for them. Under-16s must be supervised by a responsible adult while at the club. [Committee to confirm the junior rules.]',
    '6.3 Your handicap and stated ability must be accurate. Some sessions have a handicap limit, such as beginners-only instructional sessions. The captain or coach may move you to a different chukka, session or pony, or stop you riding, if that is needed for safety.',
    '6.4 You must follow the instructions of the coach, captain, umpires and yard staff.',
  ] },
  { h: '7. Safety, equipment and conduct', p: [
    '7.1 Play is under the rules of the Hurlingham Polo Association (HPA) in force at the time, together with the club’s own ground and arena rules.',
    '7.2 You must wear a polo helmet that meets the current HPA standard, with the chin strap fastened, whenever you are mounted. You also need suitable boots and any other equipment the HPA rules or the coach require. Knee guards, gloves and eye or face protection are strongly recommended.',
    '7.3 Treat ponies, grooms, umpires, officials and other players with respect. We may remove you from a session, or refuse future bookings, for dangerous riding, mistreating a pony, abusive behaviour or a serious breach of the rules. No refund is due in that case.',
    '7.4 Umpires’ decisions on the field are final.',
    '7.5 Dogs must be on a lead near the pony lines, the arena and the playing fields.',
  ] },
  { h: '8. Club ponies and your own pony', p: [
    '8.1 When you book you choose a club pony or your own pony; the price follows that choice. Club ponies are supplied through the club by its pony provider. [Committee to confirm the provider’s name.]',
    '8.2 The yard decides which club pony you ride, and may change it for the pony’s welfare or your safety. Ride club ponies only in the session you booked, and report any lameness, injury or tack problem straight away.',
    '8.3 If you bring your own pony, you are responsible for its fitness, soundness, vaccinations, tack and behaviour. It must have a passport and up-to-date equine influenza vaccinations. We may refuse a pony that seems unsound, unsafe or unwell.',
    '8.4 You are responsible for damage or injury your own pony causes, and you should hold third-party liability insurance for it (section 10).',
  ] },
  { h: '9. Risk and liability', p: [
    '9.1 Polo and riding carry an inherent risk of falls and serious injury, even when everyone takes proper care. Horses can behave unpredictably, and contact between ponies, players, sticks and balls is part of the game. By booking, you accept those inherent risks.',
    '9.2 We will provide our services with reasonable care and skill. We will keep the grounds, arena and facilities reasonably safe, as the Occupiers’ Liability Act 1957 requires.',
    '9.3 Nothing in these terms limits or excludes our liability for death or personal injury caused by our negligence, for fraud, or for anything else the law does not allow us to exclude. This includes your rights under the Consumer Rights Act 2015.',
    '9.4 Otherwise, we are not liable for loss that was not reasonably foreseeable when you booked, or for loss caused by your own breach of these terms or the rules. We are also not liable for loss or damage to personal belongings, vehicles or horseboxes, unless it was caused by our negligence.',
    '9.5 If you book for a business (not as a consumer), our total liability for any booking is limited to the price of that booking. This does not apply to the matters in 9.3.',
  ] },
  { h: '10. Insurance', p: [
    '10.1 We strongly recommend that every rider holds personal accident insurance that covers polo, because the club’s insurance does not cover injuries that are nobody’s fault.',
    '10.2 Owners who bring their own pony must hold third-party liability insurance that covers it while it is used for polo at the club.',
    '10.3 HPA membership may include some cover; check what yours provides. [Committee to confirm the minimum cover the club requires and whether proof is needed before playing.]',
  ] },
  { h: '11. Your information, photos and messages', p: [
    '11.1 We use your details to run your bookings, draw teams, take payment and keep you safe. Card payments are processed by Stripe, which handles your card details under its own privacy policy. We do this under UK GDPR and the Data Protection Act 2018, as set out in the club’s privacy notice in the app. Your name, handicap and team are shown on the day’s list and in the draw to other members.',
    '11.2 We contact you about your bookings by email, phone or message, and send safety-critical news through the app notice. These are part of the service, not marketing. We send marketing only if you have agreed to it.',
    '11.3 The club may photograph or film sessions and events and use the pictures on its website and social media. If you would rather not appear, tell the club and we will not use pictures in which you can be identified.',
  ] },
  { h: '12. Complaints, changes and law', p: [
    '12.1 If something goes wrong, email abi@druidspolo.co.uk. We will acknowledge your complaint within 5 working days and aim to resolve it within 14 days.',
    '12.2 We may update these terms, for example when prices, rules or the law change. A change applies to bookings made after it is published. When a change matters to members, the app asks you to accept the new terms before your next booking.',
    '12.3 If a court finds part of these terms unenforceable, the rest still applies.',
    '12.4 These terms are governed by the law of England and Wales. You may bring a claim in the courts of England and Wales, or in your home courts if you live in Scotland or Northern Ireland.',
  ] },
];
