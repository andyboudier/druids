# User & Captain Guide

How to use the Druids Lodge Polo Club Chukkas app — for members booking chukkas
and for captains running tournaments. No technical knowledge needed.

The app works the same whether you open it in a browser or as the installed phone
app. Everyone shares one live dataset, so what one person books or scores, everyone
else sees within moments.

---

## Getting the app

- **Website:** open the club's URL in any browser.
- **iPhone (Safari):** tap **Share → Add to Home Screen**. It becomes a normal
  app icon, full-screen, no browser bars.
- **Android (Chrome):** tap the menu → **Install app** (or accept the install
  prompt). Also available from the Play Store.
- **iOS App Store / TestFlight:** the native app adds a Lock-Screen / Dynamic-Island
  live score during matches (see *Live scoring* below).

---

## The six tabs

Along the bottom you'll find up to six tabs. Three are always visible; three only
appear once a captain has unlocked editing.

| Tab | Who sees it | What it's for |
|---|---|---|
| **Chukkas** | Everyone | Sign up to play on a given day; see the roster and the draw. |
| **Fixtures** | Everyone | The tournament calendar, match details, and team sign-ups. |
| **Live Game** | Everyone | The live scoreboard. Captains enter the scores here. |
| **Shop** | Captains | Club shop. |
| **Players** | Captains | Player database, subsidies, lessons, and payments. |
| **Teams** | Captains | Team database. |

The app remembers which tab you were on and returns you there next time.

---

## For members

### Booking a chukka

1. Open the **Chukkas** tab and pick the day (Thu / Sat / Sun).
2. Fill in the sign-up form:
   - **Name** and **mobile** (your mobile is visible only to the captain).
   - **Handicap** and how many **chukkas** you'd like. Not sure of your handicap?
     Tap **Look up on HPA ↗** next to the field — it copies the name you've typed and
     opens the HPA member search in a new tab, so you can **paste** it straight into
     the search box (the HPA search can't be pre-filled from a link). The captain's
     player-database editor has the same link.
   - **Available from / to** if you can only play part of the evening — the draw
     respects this.
   - **No back-to-back** if you'd rather not play consecutive chukkas — the draw
     leaves you a rest gap.
   - **Pony hire** if you need a club pony.
3. Submit. You'll see a confirmation, and any fee due is logged for the captain to
   settle at checkout.

Notes on specific days:

- **Club chukkas** run **Thursday 17:30**, **Saturday 11:00** and
  **Sunday 11:00** — all open to every handicap.
- **Sign-ups close** 24 hours before that day's throw-in. A captain can also
  close a day manually once it's full. After close, the form is locked for
  members (captains can still add players).

### Seeing the draw

Once the captain generates and **publishes** the draw, the Chukkas tab shows your
chukkas — which chukka numbers you're in, your team, and your bib colour. Until
it's published, members don't see it.

### Signing up a team for a tournament

On the **Fixtures** tab, open a fixture and register your team: team name, contact,
and your squad. For multi-day fixtures you can enter a different squad per day, or
copy one squad across all days. You can also register lighter "interest" if you're
not ready to commit a full squad.

---

## For captains

### Unlocking captain mode

Editing is gated behind a 4-digit **captain PIN**.

- Tap the **captain / lock button** in the footer (or "Enter Captain PIN to enter
  scores" on the Live tab) and type the PIN.
- Once unlocked you get the Shop, Players and Teams tabs, plus editing everywhere:
  rosters, the draw, throw-in times, scores, match details, mobile numbers, and
  publish toggles.
- Captain mode lasts for the browser session. Tap **Lock** to exit (it also drops
  you out of any captain-only tab).

> The PIN is a soft gate for club convenience, not real security. Don't share it
> more widely than needed, and it must never be written into the code, commit
> messages, or these docs.

### Running a club-chukka evening

1. Members sign up on the **Chukkas** tab through the day.
2. Set / confirm the **throw-in time** and ground for the day.
3. When sign-ups are in, **Generate** the draw. The app builds balanced 4-a-side
   chukkas honouring everyone's availability, spreading each player's chukkas, and
   respecting no-back-to-back requests. (The full logic is in
   [Domain Rules](DOMAIN_RULES.md).)
4. Tweak if you like — swap a player's team, move them between chukkas, add or remove
   someone, toggle VIP / no-consecutive / pony hire.
5. **Publish** the draw so members can see it. If a chukka can't be fully filled the
   app tells you who couldn't be placed and why.

### Running a tournament

1. On **Fixtures**, add or edit the fixture (name, date(s), level/handicap). To
   control exactly how the title stacks on the programme's **front page**, use
   **Programme cover title** in the fixture editor: tap **＋ Add line** to add up
   to five lines (e.g. *The* / *QRH V KRH* / *Gulf War* / *Anniversary* / *Match*),
   and **×** to remove one. Leave it empty to auto-format from the fixture name.
2. Collect **team sign-ups** and enter **match details** — the days, matches, teams,
   and squads. You can also **Import** a whole draw by pasting a JSON block: it
   matches fixtures by name and merges days by date, so re-importing a day replaces
   just that day.
3. Assign **shirt numbers 1–4** to each team's players — these determine the team
   handicap (the four lowest shirt numbers count) and the head start. See
   [Domain Rules](DOMAIN_RULES.md).
4. Set the **committee** text (printed on every programme's rules page) and, per
   match, the **chukkas** count and any **division**.
5. **Publish** match details so members see them (unpublished details are
   captain-only).

### Printing programmes (PDF)

From the **Fixtures** tab's match-details view, four PDF buttons:

- **Day programme** — the running order for one day (scores stripped, clean for
  handing out before play).
- **Full programme** — every day of the tournament.
- **Results summary** — a results sheet.
- **Team sheets by division** — team lists grouped by division (needs the
  `division` field set on matches).

PDFs use the embedded Jost typeface so they look identical on every device, and
scores print **including** each team's head start.

### Live scoring

On the **Live Game** tab:

1. Pick the date, then the tournament, then the match. (On the first open of the day
   the app auto-selects today's fixture.)
2. In captain mode, use the **+ / −** buttons to record goals for each team, and the
   **chukka-in-play** control to mark "Not started" → 1, 2, 3… → "Ended". You can
   also credit goals to individual players and set shirt numbers and bib colours.
3. Members watching see the scoreboard update live, with the head start already
   included and a "starts +½" note where a team has one.
4. On the **iOS app**, an active match drives a **Live Activity** on the Lock Screen
   and Dynamic Island so followers see the score without opening the app.

Scores and match details are **backed up automatically** (the last 100 snapshots),
so if something is edited by mistake a captain can restore from the backups list.

### Payments (Players tab)

The Players tab has sub-views for the player database, **subsidies**, **lessons**,
and **checkout**. Bookings, entry fees, and lessons create a "due" entry that a
captain settles at checkout (mark paid / void). Subsidy pots can be topped up and
applied. This is a manual ledger the captain keeps; it isn't a payment gateway.

---

## Quick reference

| I want to… | Go to |
|---|---|
| Book a chukka | Chukkas tab → pick day → sign-up form |
| See who's playing / the draw | Chukkas tab (once published) |
| Sign my team up for a tournament | Fixtures tab → open fixture → register team |
| Watch the live score | Live Game tab |
| Enter scores | Live Game tab (captain PIN) |
| Generate/publish the draw | Chukkas tab (captain PIN) |
| Print a programme | Fixtures tab → match details → PDF buttons (captain PIN) |
| Record a payment | Players tab → Checkout (captain PIN) |
</content>
