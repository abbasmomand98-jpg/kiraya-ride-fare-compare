// Kiraya smoke tests — run with: node test.js
// Every canonical figure used in the mockups, slides and copy is asserted here.
var assert = require("assert");
var fs = require("fs");
var data = require("./data.js");
var L = require("./logic.js");

var n = 0;

function eq(a, b, msg) { assert.strictEqual(a, b, msg); n++; }
function ok(v, msg) { assert.ok(v, msg); n++; }
function deep(a, b, msg) { assert.deepStrictEqual(a, b, msg); n++; }

// 1. Lahore fares (sample, 13 Nov 2026, Gulberg III -> LUMS, 8.4 km, ~22 min).
var lahore = L.faresForCity(data.FARES_BY_CITY, "Lahore");
eq(lahore.length, 4, "Lahore board has 4 apps");
deep(lahore.map(function (f) { return f.id; }),
     ["bykea", "indrive", "yango", "careem"],
     "Lahore fares sort cheapest first");
eq(lahore[0].price, 290, "Bykea (bike) charges Rs 290");
eq(lahore[0].verified, false, "Bykea driver is not verified in this sample");
eq(lahore[0].kind, "bike", "Bykea is a bike");
eq(lahore[1].price, 320, "inDrive charges Rs 320");
eq(lahore[1].verified, true, "inDrive driver is verified");
eq(lahore[1].best, true, "inDrive is the best value");
eq(lahore[1].etaMin, 6, "inDrive is 6 min away");
eq(lahore[2].price, 385, "Yango charges Rs 385");
eq(lahore[2].verified, true, "Yango driver is verified");
eq(lahore[3].price, 460, "Careem charges Rs 460");
eq(lahore[3].verified, true, "Careem driver is verified");
eq(lahore[3].etaMin, 9, "Careem is 9 min away");
eq(data.ROUTE.from, "Gulberg III", "route starts at Gulberg III");
eq(data.ROUTE.to, "LUMS", "route ends at LUMS");
eq(data.ROUTE.km, 8.4, "route is 8.4 km");
eq(data.ROUTE.minutes, 22, "route takes ~22 min");

// 2. Cheapest verified + the Rs 140 gap + Rs 3,080 a month.
var best = L.cheapestVerified(lahore);
eq(best.id, "indrive", "cheapest verified fare in Lahore is inDrive");
eq(best.price, 320, "cheapest verified fare is Rs 320");
var gap = L.fareGap(lahore);
eq(gap.cheapest.id, "indrive", "gap cheapest is inDrive");
eq(gap.dearest.id, "careem", "gap dearest is Careem");
eq(gap.gap, 140, "cheapest-verified vs most expensive gap is Rs 140");
eq(L.verifiedOnly(lahore).length, 3, "verified-only filter keeps 3 apps in Lahore");
deep(L.verifiedOnly(lahore).map(function (f) { return f.id; }),
     ["indrive", "yango", "careem"], "verified-only drops Bykea in Lahore");
eq(L.findFare(lahore, "careem").price, 460, "findFare finds Careem at Rs 460");
eq(L.findFare(lahore, "nobody"), null, "findFare returns null for an unknown app");
eq(L.fareGap([]).gap, 0, "empty board has a zero gap");
eq(L.monthlySaving(140, 22), 3080, "Rs 140 x 22 workdays = Rs 3,080 a month");
eq(L.monthlySaving(140, data.WORKDAYS_PER_MONTH), 3080, "monthly saving uses 22 workdays");
eq(data.WORKDAYS_PER_MONTH, 22, "22 workdays a month");

// 3. Other cities have boards too, cheapest first, inDrive best value.
deep(data.CITIES, ["Lahore", "Karachi", "Islamabad", "Peshawar", "Rawalpindi", "Faisalabad"],
     "six cities in order");
data.CITIES.forEach(function (city) {
  var list = L.faresForCity(data.FARES_BY_CITY, city);
  ok(list.length >= 4, city + " board has at least 4 apps");
  ok(L.cheapestVerified(list) !== null, city + " has a cheapest verified fare");
  eq(L.cheapestVerified(list).id, "indrive", city + " best value is inDrive");
  for (var i = 1; i < list.length; i++) {
    ok(list[i].price >= list[i - 1].price, city + " board sorts cheapest first");
  }
  ok(L.fareGap(list).gap > 0, city + " board has a positive gap");
});
eq(L.faresForCity(data.FARES_BY_CITY, "Nowhere").length, 0,
   "unknown city has no fares");

// 4. Surge: x1.8 fog evening, wait 25 min to x1.2.
eq(L.surgeFare(460, 1.8), 828, "Careem Rs 460 at x1.8 is Rs 828");
eq(L.surgeFare(460, 1.2), 552, "Careem Rs 460 at x1.2 is Rs 552");
eq(L.surgeFare(460, 1.0), 460, "Careem Rs 460 at x1.0 is Rs 460");
eq(L.surgeFare(320, 1.8), 576, "inDrive Rs 320 at x1.8 is Rs 576");
eq(L.surgeByHour(data.SURGE_BY_HOUR, "7 PM"), 1.8, "7 PM surge is x1.8");
eq(L.surgeByHour(data.SURGE_BY_HOUR, "5 PM"), 1.0, "5 PM surge is x1.0");
eq(L.surgeByHour(data.SURGE_BY_HOUR, "9 PM"), 1.2, "9 PM surge is x1.2");
eq(L.surgeByHour(data.SURGE_BY_HOUR, "3 AM"), null, "unknown hour has no surge");
eq(data.SURGE_BY_HOUR.length, 5, "surge forecast covers 5 hours");
eq(data.SURGE_BASE_FARE, 460, "surge base fare is Careem Rs 460");
eq(data.SURGE_NOW_HOUR, "7 PM", "surge now is 7 PM");
eq(data.SURGE_WAIT_MIN, 25, "wait 25 minutes");
eq(data.SURGE_WAIT_MULT, 1.2, "surge drops to x1.2 after waiting");
var wait = L.waitAndSave(460, 1.8, 1.2);
eq(wait.nowFare, 828, "now fare is Rs 828");
eq(wait.laterFare, 552, "later fare is Rs 552");
eq(wait.saveRs, 276, "waiting saves Rs 276 on one ride");
eq(wait.worthWaiting, true, "waiting is worth it at x1.8");
var noWait = L.waitAndSave(460, 1.0, 1.2);
eq(noWait.worthWaiting, false, "waiting is not worth it at x1.0");

// 5. Booking references: KRY-2026-XXXX format.
var ref = L.mintBookingRef();
ok(L.isBookingRef(ref), "minted ref " + ref + " matches KRY-2026-XXXX");
ok(L.isBookingRef("KRY-2026-4812"), "KRY-2026-4812 is a valid booking ref");
ok(!L.isBookingRef("KRY-2026-481"), "a 3-digit ref is invalid");
ok(!L.isBookingRef("ABC-2026-4812"), "a different-prefix ref is invalid here");
ok(!L.isBookingRef(""), "an empty ref is invalid");
eq(data.BOOKING_REF, "KRY-2026-4812", "canonical booking ref is KRY-2026-4812");
eq(data.BOOKING_ETA_MIN, 6, "booking ETA is 6 min");

// 6. Driver: Ahmed Raza, Suzuki Alto, LHR-4812, 4.9 stars, 2% cancels.
deep(data.DRIVER, { name: "Ahmed Raza", car: "Suzuki Alto", plate: "LHR-4812",
  rating: 4.9, cancelRate: 2, verified: true },
     "Ahmed Raza, Suzuki Alto, LHR-4812, 4.9 stars, 2% cancellation, verified");

// 7. ETA countdown: 6 min = 6:00, ticks down, never below zero.
eq(L.etaSecondsLeft(6, 0), 360, "6 min ETA starts at 360 seconds");
eq(L.formatEta(360), "6:00", "360 seconds formats as 6:00");
eq(L.formatEta(359), "5:59", "359 seconds formats as 5:59");
eq(L.formatEta(60), "1:00", "60 seconds formats as 1:00");
eq(L.formatEta(5), "0:05", "5 seconds formats as 0:05");
eq(L.etaSecondsLeft(6, 360), 0, "ETA hits zero at arrival time");
eq(L.etaSecondsLeft(6, 99999), 0, "ETA never goes below zero");

// 8. Cancellation flag: 2 of 10 = 20% frequent canceller; 2% reliable.
var flag = L.cancellationFlag(2, 10);
eq(flag.rate, 20, "2 of 10 cancelled is a 20% rate");
eq(flag.flag, "FREQUENT CANCELLER", "20% is a frequent canceller");
var okDriver = L.cancellationFlag(1, 50);
eq(okDriver.rate, 2, "1 of 50 cancelled is a 2% rate");
eq(okDriver.flag, "RELIABLE", "2% is reliable");
eq(L.cancellationFlag(0, 10).flag, "RELIABLE", "0 of 10 is reliable");
eq(L.cancellationFlag(3, 10).flag, "FREQUENT CANCELLER", "3 of 10 is a frequent canceller");

// 9. Safety checklist: 5 checks, toggle is pure, verdicts.
eq(data.SAFETY_CHECKS.length, 5, "safety checklist has 5 checks");
var checkIds = ["verified", "share", "women-driver", "sos", "cancel-rate"];
checkIds.forEach(function (id) {
  ok(data.SAFETY_CHECKS.some(function (c) { return c.id === id; }),
     "checklist includes the " + id + " check");
});
var start = ["verified", "share"];
var added = L.toggleChecklist(start, "sos");
deep(added, ["verified", "share", "sos"], "toggle adds a missing check");
deep(start, ["verified", "share"], "toggle never mutates the original list");
deep(L.toggleChecklist(start, "verified"), ["share"], "toggle removes a done check");
deep(L.checklistProgress(["verified", "share"], data.SAFETY_CHECKS), { done: 2, total: 5 },
     "progress is 2 of 5 checks");
deep(L.checklistProgress([], data.SAFETY_CHECKS), { done: 0, total: 5 }, "progress starts at 0 of 5");
var vAll = L.safetyVerdict(checkIds, data.SAFETY_CHECKS);
eq(vAll.level, "SAFE TO BOOK", "all 5 checks done is SAFE TO BOOK");
var vSome = L.safetyVerdict(["verified", "share", "sos"], data.SAFETY_CHECKS);
eq(vSome.level, "NOT YET SAFE", "3 of 5 checks is NOT YET SAFE");
ok(vSome.advice.indexOf("2 checks left") !== -1, "verdict names the 2 missing checks");
var vNone = L.safetyVerdict([], data.SAFETY_CHECKS);
ok(vNone.advice.indexOf("5 checks left") !== -1, "verdict names all 5 missing checks");

// 10. Fare-spotter quiz: 3 red flags + 1 safe habit.
eq(data.SPOTTER_FLAGS.length, 4, "spotter quiz has 4 scenarios");
eq(data.SPOTTER_FLAGS.filter(function (f) { return f.isFlag; }).length, 3,
   "spotter quiz has 3 red flags");
eq(L.spotterAnswer(data.SPOTTER_FLAGS[0], true), true, "cancel-and-pay-cash is a red flag");
eq(L.spotterAnswer(data.SPOTTER_FLAGS[0], false), false, "calling it safe is wrong");
eq(L.spotterAnswer(data.SPOTTER_FLAGS[3], false), true, "name-check is safe, not a flag");
eq(L.spotterAnswer(data.SPOTTER_FLAGS[3], true), false, "calling the name-check a flag is wrong");
var perfect = {};
data.SPOTTER_FLAGS.forEach(function (f) { perfect[f.id] = f.isFlag; });
var sPerfect = L.scoreQuiz(data.SPOTTER_FLAGS, perfect);
eq(sPerfect.correct, 4, "perfect answers score 4 of 4");
eq(sPerfect.perfect, true, "perfect answers are perfect");
var sNone = L.scoreQuiz(data.SPOTTER_FLAGS, {});
eq(sNone.correct, 0, "no answers score 0 of 4");
eq(sNone.perfect, false, "no answers are not perfect");
var sHalf = L.scoreQuiz(data.SPOTTER_FLAGS, { "cancel-cash": true, "petrol-money": true });
eq(sHalf.correct, 2, "two right answers score 2 of 4");

// 11. Pakistani digit grouping.
eq(L.formatPKR(140), "140", "Rs 140 needs no separator");
eq(L.formatPKR(290), "290", "Rs 290");
eq(L.formatPKR(320), "320", "Rs 320");
eq(L.formatPKR(460), "460", "Rs 460");
eq(L.formatPKR(828), "828", "Rs 828");
eq(L.formatPKR(3080), "3,080", "Rs 3,080");
eq(L.formatPKR(11400), "11,400", "Rs 11,400");

// 12. Persona and cities: the canonical facts.
deep(data.PERSONA, { name: "Mahnoor", age: 22, city: "Lahore",
  lastPaidRs: 580, usualFareRs: 320, cancelledAt: "10pm",
  sharesTripWith: "her brother" },
     "Mahnoor's canonical persona: 22, Lahore, paid Rs 580 for a Rs 320 ride, cancelled at 10pm, shares with her brother");

// 13. Every element id referenced by app.js exists in index.html.
var html = fs.readFileSync(__dirname + "/index.html", "utf8");
var appJs = fs.readFileSync(__dirname + "/app.js", "utf8");
var ids = {};
var m;
var idRe = /el\("([^"]+)"\)/g;
while ((m = idRe.exec(appJs)) !== null) ids[m[1]] = true;
var idList = Object.keys(ids);
ok(idList.length >= 12, "app.js references at least 12 element ids (" + idList.length + " found)");
idList.forEach(function (id) {
  ok(html.indexOf('id="' + id + '"') !== -1, "index.html defines id " + id);
});
["data.js", "logic.js", "app.js"].forEach(function (f) {
  ok(html.indexOf('src="' + f + '"') !== -1, "index.html loads " + f);
});
ok(html.indexOf('href="style.css"') !== -1, "index.html loads style.css");
// Tab buttons and sections exist for all five tabs.
["compare", "surge", "safety", "book", "spotter"].forEach(function (t) {
  ok(html.indexOf('id="tab-' + t + '"') !== -1, "index.html defines tab " + t);
  ok(html.indexOf('id="section-' + t + '"') !== -1, "index.html defines section " + t);
});

// 14. HTML tag balance: every opened tag is closed (void elements excluded).
var voidTags = { meta: 1, link: 1, input: 1, br: 1, hr: 1, img: 1 };
var stack = [];
var tagRe = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/?>/g;
while ((m = tagRe.exec(html)) !== null) {
  var tag = m[1].toLowerCase();
  var raw = m[0];
  if (voidTags[tag]) continue;
  if (raw[1] === "/") {
    eq(stack.pop(), tag, "closing tag </" + tag + "> matches the last opened tag");
  } else if (raw[raw.length - 2] !== "/") {
    stack.push(tag);
  }
}
eq(stack.length, 0, "no unclosed tags remain (stack empty)");

console.log("\n" + n + " assertions passed.");
