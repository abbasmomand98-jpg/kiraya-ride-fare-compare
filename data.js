// Kiraya — Ride Fare Compare & Safe Ride Planner (UX Concept).
// IMPORTANT: every fare, surge multiplier, driver, figure and city below is
// SAMPLE data invented for this UX concept demo. No real fare, driver,
// ride, or person appears anywhere. Kiraya is an unofficial concept, not
// a ride-hailing app: always compare the fare and check the driver and
// the plate before you get into any car.

// ROUTE (sample, 13 Nov 2026, Lahore): Gulberg III -> LUMS, 8.4 km, ~22 min.
//   Bykea (bike)   Rs 290 — cheapest ride, driver not verified in this sample
//   inDrive (car)  Rs 320 — VERIFIED DRIVER, BEST VALUE
//   Yango (car)    Rs 385 — verified driver
//   Careem (car)   Rs 460 — verified driver, Rs 140 more than inDrive
// Gap inDrive vs Careem: Rs 140 per ride; 22 workdays/month -> Rs 3,080/month.
var ROUTE = { from: "Gulberg III", to: "LUMS", city: "Lahore",
  km: 8.4, minutes: 22, date: "13 Nov 2026" };
var WORKDAYS_PER_MONTH = 22;

var FARES_BY_CITY = {
  "Lahore": [
    { id: "bykea", name: "Bykea", kind: "bike", price: 290, verified: false, etaMin: 4 },
    { id: "indrive", name: "inDrive", kind: "car", price: 320, verified: true, etaMin: 6, best: true },
    { id: "yango", name: "Yango", kind: "car", price: 385, verified: true, etaMin: 8 },
    { id: "careem", name: "Careem", kind: "car", price: 460, verified: true, etaMin: 9 }
  ],
  "Karachi": [
    { id: "bykea", name: "Bykea", kind: "bike", price: 300, verified: false, etaMin: 5 },
    { id: "indrive", name: "inDrive", kind: "car", price: 340, verified: true, etaMin: 7, best: true },
    { id: "yango", name: "Yango", kind: "car", price: 400, verified: true, etaMin: 9 },
    { id: "careem", name: "Careem", kind: "car", price: 480, verified: true, etaMin: 10 }
  ],
  "Islamabad": [
    { id: "bykea", name: "Bykea", kind: "bike", price: 310, verified: false, etaMin: 5 },
    { id: "indrive", name: "inDrive", kind: "car", price: 350, verified: true, etaMin: 7, best: true },
    { id: "yango", name: "Yango", kind: "car", price: 410, verified: true, etaMin: 9 },
    { id: "careem", name: "Careem", kind: "car", price: 500, verified: true, etaMin: 10 }
  ],
  "Peshawar": [
    { id: "bykea", name: "Bykea", kind: "bike", price: 270, verified: false, etaMin: 4 },
    { id: "indrive", name: "inDrive", kind: "car", price: 300, verified: true, etaMin: 6, best: true },
    { id: "yango", name: "Yango", kind: "car", price: 360, verified: true, etaMin: 8 },
    { id: "careem", name: "Careem", kind: "car", price: 430, verified: true, etaMin: 9 }
  ],
  "Rawalpindi": [
    { id: "bykea", name: "Bykea", kind: "bike", price: 280, verified: false, etaMin: 5 },
    { id: "indrive", name: "inDrive", kind: "car", price: 310, verified: true, etaMin: 6, best: true },
    { id: "yango", name: "Yango", kind: "car", price: 375, verified: true, etaMin: 8 },
    { id: "careem", name: "Careem", kind: "car", price: 450, verified: true, etaMin: 9 }
  ],
  "Faisalabad": [
    { id: "bykea", name: "Bykea", kind: "bike", price: 260, verified: false, etaMin: 4 },
    { id: "indrive", name: "inDrive", kind: "car", price: 290, verified: true, etaMin: 6, best: true },
    { id: "yango", name: "Yango", kind: "car", price: 350, verified: true, etaMin: 8 },
    { id: "careem", name: "Careem", kind: "car", price: 420, verified: true, etaMin: 9 }
  ]
};

// Surge forecast by hour (sample, fog evening). Normal x1.0; fog evening
// x1.8 at 7 PM (Careem Rs 460 -> Rs 828); wait 25 min, surge drops to
// x1.2 at 9 PM (Rs 552) — save Rs 276 on one ride. Fog season is Nov-Feb.
var SURGE_BY_HOUR = [
  { hour: "5 PM", mult: 1.0 },
  { hour: "6 PM", mult: 1.3 },
  { hour: "7 PM", mult: 1.8 },
  { hour: "8 PM", mult: 1.5 },
  { hour: "9 PM", mult: 1.2 }
];
var SURGE_BASE_FARE = 460; // Careem, Gulberg III -> LUMS, sample
var SURGE_NOW_HOUR = "7 PM";
var SURGE_WAIT_MIN = 25;
var SURGE_WAIT_MULT = 1.2;

// Booking (sample): book inDrive Rs 320 -> ref KRY-2026-4812, ETA 6 min,
// driver Ahmed Raza, Suzuki Alto, plate LHR-4812, 4.9 stars,
// 2% cancellation rate, verified badge.
var DRIVER = { name: "Ahmed Raza", car: "Suzuki Alto", plate: "LHR-4812",
  rating: 4.9, cancelRate: 2, verified: true };
var BOOKING_REF = "KRY-2026-4812";
var BOOKING_ETA_MIN = 6;

// Safety — 5 checks before you book. Persisted in localStorage by app.js.
var SAFETY_CHECKS = [
  { id: "verified", label: "Verified-driver badge shown — name, photo and rating match" },
  { id: "share", label: "Share live trip with family — they can follow the ride" },
  { id: "women-driver", label: "Women-driver filter on — for women travelling alone" },
  { id: "sos", label: "SOS button on screen — one tap shares your live trip" },
  { id: "cancel-rate", label: "Driver cancellation rate shown — 2% is reliable, 20% is not" }
];

// Fare spotter — 3 red flags, plus one safe habit as a control question.
// A driver who cancelled 2 of last 10 rides (20%) is flagged "frequent canceller".
var SPOTTER_FLAGS = [
  { id: "cancel-cash", scenario: "The driver asks you to cancel in the app and pay cash instead.",
    isFlag: true, why: "RED FLAG — cancelling in the app removes the trip record, and the cash fare jumps. Keep the ride in the app." },
  { id: "petrol-money", scenario: "The driver asks for \u201cpetrol money\u201d before the ride starts.",
    isFlag: true, why: "RED FLAG — the fare already covers fuel. Never pay extra upfront." },
  { id: "plate-mismatch", scenario: "The car's plate doesn't match the plate shown in the app.",
    isFlag: true, why: "RED FLAG — wrong plate, wrong car. Don't get in." },
  { id: "name-check", scenario: "The driver confirms your name before you get in.",
    isFlag: false, why: "SAFE — a driver who checks your name is doing the right thing. Get in." }
];

// Persona: Mahnoor, 22, Lahore — university student, rides daily; last week
// paid Rs 580 for a ride that cost Rs 320 the day before; a driver cancelled
// twice after accepting at 10pm; she shares her live trip with her brother
// every night. Illustrative proto-persona — a design hypothesis, not an
// interviewed participant.
var PERSONA = { name: "Mahnoor", age: 22, city: "Lahore",
  lastPaidRs: 580, usualFareRs: 320, cancelledAt: "10pm",
  sharesTripWith: "her brother" };

var CITIES = ["Lahore", "Karachi", "Islamabad", "Peshawar", "Rawalpindi", "Faisalabad"];

if (typeof module !== "undefined") {
  module.exports = { ROUTE: ROUTE, WORKDAYS_PER_MONTH: WORKDAYS_PER_MONTH,
    FARES_BY_CITY: FARES_BY_CITY, SURGE_BY_HOUR: SURGE_BY_HOUR,
    SURGE_BASE_FARE: SURGE_BASE_FARE, SURGE_NOW_HOUR: SURGE_NOW_HOUR,
    SURGE_WAIT_MIN: SURGE_WAIT_MIN, SURGE_WAIT_MULT: SURGE_WAIT_MULT,
    DRIVER: DRIVER, BOOKING_REF: BOOKING_REF, BOOKING_ETA_MIN: BOOKING_ETA_MIN,
    SAFETY_CHECKS: SAFETY_CHECKS, SPOTTER_FLAGS: SPOTTER_FLAGS,
    PERSONA: PERSONA, CITIES: CITIES };
}
