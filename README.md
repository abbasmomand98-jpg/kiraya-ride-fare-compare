# Kiraya — Ride Fare Compare & Safe Ride Planner (UX Concept)

**Live demo:** https://abbasmomand98-jpg.github.io/kiraya-ride-fare-compare/
**Code:** https://github.com/abbasmomand98-jpg/kiraya-ride-fare-compare

Kiraya is a ride fare compare and safe ride planner for Pakistan. The same ride in a Pakistani city costs wildly different fares on different apps — and nobody compares before booking. A Gulberg III to LUMS ride (8.4 km) costs Rs 320 on inDrive and Rs 460 on Careem. In evening fog the surge hits ×1.8, drivers cancel after accepting late at night, and cash-versus-online confusion lets drivers demand extra "petrol money".

Kiraya compares what four ride apps actually charge for the same trip, checks the fog-evening surge before you book, books the cheapest verified ride with a live ETA, and rides with a verified driver whose live trip your family can follow.

## How it works

Open `index.html` in a browser — no build step, no framework, just HTML, CSS and JavaScript. The demo is split into three files so each part is easy to read and change:

- `data.js` — all the sample data: the fares per city with verified flags and ETAs, the surge forecast by hour, the driver, the 5-point safety checklist, and the three fare-spotter red flags.
- `logic.js` — all the rules, with no DOM code at all: the fare sorting and verified filter, the cheapest-verified pick, the fare gap, the monthly saving, the surge maths, the wait-and-save verdict, the booking reference, the ETA countdown, the cancellation-rate flag, the safety verdict, and the spotter-quiz scoring. Because it touches no DOM, it can be tested in Node with `node test.js`.
- `app.js` — the page wiring only: it reads the data, calls the logic, and renders the results into the page. Demo "today" is pinned to 13 Nov 2026 so the sample figures stay stable.

Try it with the sample figures:

1. **Fare Compare** — four apps in Lahore for the same Gulberg III → LUMS ride, sorted by price, cheapest first. Bykea charges Rs 290 on a bike. inDrive charges Rs 320 in a car with a verified driver — the best value. Yango charges Rs 385 and Careem charges Rs 460. Switch the city to Karachi, Islamabad, Peshawar, Rawalpindi or Faisalabad and the board follows. Turn on "Verified driver only" and the unverified bike disappears. The gap callout shows Rs 140 apart — and Rs 3,080 a month saved by comparing every day (Rs 140 × 22 workdays).
2. **Surge Planner** — pick an hour and an app. At 7 PM in fog the surge is ×1.8 and Careem jumps from Rs 460 to Rs 828. Wait 25 minutes and the surge drops to ×1.2 — the same ride is Rs 552, saving Rs 276 on one ride. At 5 PM the surge is ×1.0 and there is no reason to wait.
3. **Safety** — tick the 5 checks off before you book: verified-driver badge shown, share live trip with family, women-driver filter on, SOS button on screen, driver cancellation rate shown. Your ticks are saved in the browser with localStorage. Check a driver's cancellation rate too: a driver who cancelled 2 of the last 10 rides (20%) is flagged a frequent canceller; Ahmed Raza's 2% is reliable. Turn on live-trip sharing and your family can follow the ride.
4. **Book a Ride** — pick an app and book: you get a reference like KRY-2026-4812 and a live ETA counting down from 6:00 for inDrive. The driver card shows Ahmed Raza, Suzuki Alto, plate LHR-4812, 4.9 stars, a 2% cancellation rate and the verified badge. Pay in the app — no cash, no "petrol money".
5. **Fare Spotter** — a 4-question quiz: three red flags (driver asks you to cancel in-app and pay cash, driver asks for "petrol money" upfront, car plate doesn't match the app) and one safe habit (the driver confirms your name). Score 4 of 4 and you spot them all.

Run the tests with `node test.js` — they assert every canonical figure above, plus that all element IDs referenced by `app.js` exist in `index.html` and that the HTML tags balance. `node dom-smoke.js` renders the whole page in a fake DOM and asserts the canonical figures appear on load.

## What you can learn from this project

- **Separating data, logic, and rendering.** `data.js` holds facts, `logic.js` holds rules, `app.js` holds rendering. When the facts change (a new app, a new fare), only `data.js` changes. When a rule changes (how the surge is calculated), only `logic.js` changes. This is the single most useful habit in front-end work.
- **Pure functions are testable functions.** Every rule in `logic.js` takes inputs and returns outputs — no DOM, no dates from the clock, no hidden state. That is why `node test.js` can check the surge maths (460 × 1.8 = 828, 828 − 552 = 276) without opening a browser.
- **Sort by the outcome, not the input.** The board sorts by the fare the rider actually pays — and the verified-only filter sorts by trust, not just price. A bike can be cheapest and still be the wrong choice if its driver is not verified.
- **Make the hidden cost visible.** The gap callout subtracts the cheapest verified fare from the most expensive one, then multiplies by 22 workdays — so the Rs 3,080 a month is a number on the screen before the money moves. A price board alone would never show it.
- **Forecasts beat warnings.** The surge planner does not just say "surge is high" — it shows the whole evening by the hour and names the exact wait (25 minutes) and the exact saving (Rs 276). A verdict with a number is something a rider can act on.
- **Never trust a cancellation rate you cannot see.** The cancellation flag divides cancelled rides by the last 10 and flags 20% and above — so a driver who cancelled twice after accepting at 10pm is visible before the booking, not after the cancellation.
- **Pakistani number formatting.** `formatPKR` groups digits the way Pakistan writes them — 3,080 stays "3,080" and 11,400 stays "11,400". Small detail, big difference in whether a number reads as real to a Pakistani user.
- **localStorage for a checklist, a booking, a share toggle and a quiz.** The safety checklist, your booking, your live-trip sharing and your spotter answers survive a page refresh because `app.js` saves them under four keys (`kiraya-safety-done`, `kiraya-booking`, `kiraya-share-trip`, `kiraya-spotter-answers`) and loads them back on start.

## Sample-data honesty note

Every fare, surge multiplier, driver, figure and city in this demo is invented sample data for an unofficial UX concept. No real fare, driver, ride, or person appears anywhere. Kiraya is not a ride-hailing app — always compare the fare and check the driver and the plate before you get into any car.

## Fork it and make it yours

This project is a pattern, not just a demo: a **compare → forecast → verify → book** tool for any price that changes by the hour and by the app. Fork the repo and adapt it to a problem people face where you live — comparing vegetable prices across mandis, checking load-shedding schedules before booking a ride, comparing courier rates for a parcel, or verifying a second-hand bike's documents before you buy it. Keep the data in `data.js`, the rules in `logic.js`, and the honesty note — and the same pattern will work for your problem too.

---

Kiraya is an unofficial UX concept by Muhammad Abbas Khan.
Available for new projects: abbasmomand98@gmail.com
