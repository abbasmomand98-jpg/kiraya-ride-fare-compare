// Kiraya — pure logic, no DOM here, so it can be unit-tested in Node.
(function (root) {
  // Pakistani / Indian digit grouping: 2500 -> "2,500",
  // 3080 -> "3,080", 11400 -> "11,400". Last three digits group
  // together, then groups of two — the way lakh and crore figures are
  // written in Pakistan.
  function formatPKR(n) {
    var s = String(Math.round(n));
    if (s.length <= 3) return s;
    var last3 = s.slice(-3);
    var rest = s.slice(0, -3);
    var groups = [];
    while (rest.length > 2) {
      groups.unshift(rest.slice(-2));
      rest = rest.slice(0, -2);
    }
    if (rest) groups.unshift(rest);
    return groups.join(",") + "," + last3;
  }

  // Fares for a city, cheapest first. Returns a copy, never mutates.
  function faresForCity(faresByCity, city) {
    var list = faresByCity[city] || [];
    return list.slice().sort(function (a, b) { return a.price - b.price; });
  }

  // Verified-only filter: keep apps whose driver was verified.
  function verifiedOnly(fares) {
    return fares.filter(function (f) { return f.verified; });
  }

  // Cheapest verified fare in a city — the best-value pick.
  // inDrive at Rs 320 in Lahore (Bykea's bike is cheaper but its
  // driver is not verified in this sample).
  function cheapestVerified(fares) {
    var v = verifiedOnly(fares);
    if (v.length === 0) return null;
    return v.slice().sort(function (a, b) { return a.price - b.price; })[0];
  }

  // Cheapest verified vs most expensive gap on the board.
  // Lahore: Rs 460 - Rs 320 = Rs 140 per ride.
  function fareGap(fares) {
    if (fares.length === 0) return { cheapest: null, dearest: null, gap: 0 };
    var sorted = fares.slice().sort(function (a, b) { return a.price - b.price; });
    var verified = verifiedOnly(sorted);
    var cheapest = verified.length > 0 ? verified[0] : sorted[0];
    return { cheapest: cheapest, dearest: sorted[sorted.length - 1],
             gap: sorted[sorted.length - 1].price - cheapest.price };
  }

  function findFare(fares, id) {
    for (var i = 0; i < fares.length; i++) {
      if (fares[i].id === id) return fares[i];
    }
    return null;
  }

  // Monthly saving: the per-ride gap times workdays a month.
  // Rs 140 x 22 workdays = Rs 3,080 a month.
  function monthlySaving(gapPerRide, workdays) {
    return Math.max(0, gapPerRide) * Math.max(0, workdays || 0);
  }

  // Surge fare: base fare times the multiplier, rounded to the rupee.
  // Careem Rs 460 at x1.8 = Rs 828; at x1.2 = Rs 552.
  function surgeFare(baseFare, mult) {
    return Math.round(baseFare * mult);
  }

  function surgeByHour(surgeTable, hour) {
    for (var i = 0; i < surgeTable.length; i++) {
      if (surgeTable[i].hour === hour) return surgeTable[i].mult;
    }
    return null;
  }

  // Wait-and-save verdict: at 7 PM the surge is x1.8 (Rs 828); wait
  // 25 min and it drops to x1.2 (Rs 552) — save Rs 276 on one ride.
  function waitAndSave(baseFare, nowMult, waitMult) {
    var now = surgeFare(baseFare, nowMult);
    var later = surgeFare(baseFare, waitMult);
    return { nowFare: now, laterFare: later, saveRs: now - later,
             worthWaiting: later < now };
  }

  // Booking: mint a reference like KRY-2026-4812. The 4 digits are
  // random, so every booking gets its own reference.
  function mintBookingRef() {
    var n = Math.floor(1000 + Math.random() * 9000);
    return "KRY-2026-" + n;
  }

  function isBookingRef(ref) {
    return /^KRY-2026-\d{4}$/.test(String(ref || ""));
  }

  // Live ETA countdown: seconds left, formatted MM:SS.
  function etaSecondsLeft(etaMin, elapsedSec) {
    return Math.max(0, etaMin * 60 - Math.max(0, elapsedSec || 0));
  }

  function formatEta(totalSeconds) {
    var m = Math.floor(totalSeconds / 60);
    var s = totalSeconds % 60;
    return m + ":" + (s < 10 ? "0" + s : s);
  }

  // Cancellation flag: a driver who cancelled 2 of the last 10 rides
  // (20%) is a frequent canceller. Ahmed Raza's 2% is reliable.
  function cancellationFlag(cancelled, total) {
    var t = Math.max(1, total || 1);
    var rate = Math.round((cancelled / t) * 100);
    var frequent = rate >= 20;
    return { rate: rate,
             flag: frequent ? "FREQUENT CANCELLER" : "RELIABLE",
             advice: frequent
               ? "This driver cancelled " + cancelled + " of the last " + t +
                 " rides (" + rate + "%). Pick another driver."
               : "This driver cancelled " + cancelled + " of the last " + t +
                 " rides (" + rate + "%). Reliable — safe to book." };
  }

  // Safety checklist: pure toggle — returns a new array, never mutates.
  function toggleChecklist(doneIds, id) {
    var next = doneIds.slice();
    var i = next.indexOf(id);
    if (i === -1) next.push(id);
    else next.splice(i, 1);
    return next;
  }

  function checklistProgress(doneIds, checks) {
    return { done: doneIds.length, total: checks.length };
  }

  // Safety verdict: all 5 checked -> safe to book; otherwise the
  // missing checks are named.
  function safetyVerdict(doneIds, checks) {
    var missing = checks.filter(function (c) { return doneIds.indexOf(c.id) === -1; });
    if (missing.length === 0) {
      return { level: "SAFE TO BOOK", advice: "All 5 checks pass. Book the verified ride and share your live trip with family." };
    }
    return { level: "NOT YET SAFE",
             advice: missing.length + " check" + (missing.length === 1 ? "" : "s") +
               " left: " + missing.map(function (c) { return c.label; }).join("; ") +
               ". Do not book until every check passes." };
  }

  // Fare-spotter quiz: each flag has isFlag true/false. Answering
  // "flag" for a real flag (or "safe" for the safe habit) is correct.
  function spotterAnswer(flag, saidFlag) {
    return flag.isFlag === saidFlag;
  }

  function scoreQuiz(flags, answers) {
    var correct = 0;
    flags.forEach(function (f) {
      if (answers[f.id] === f.isFlag) correct++;
    });
    return { correct: correct, total: flags.length,
             perfect: correct === flags.length };
  }

  var api = { formatPKR: formatPKR,
              faresForCity: faresForCity,
              verifiedOnly: verifiedOnly,
              cheapestVerified: cheapestVerified,
              fareGap: fareGap,
              findFare: findFare,
              monthlySaving: monthlySaving,
              surgeFare: surgeFare,
              surgeByHour: surgeByHour,
              waitAndSave: waitAndSave,
              mintBookingRef: mintBookingRef,
              isBookingRef: isBookingRef,
              etaSecondsLeft: etaSecondsLeft,
              formatEta: formatEta,
              cancellationFlag: cancellationFlag,
              toggleChecklist: toggleChecklist,
              checklistProgress: checklistProgress,
              safetyVerdict: safetyVerdict,
              spotterAnswer: spotterAnswer,
              scoreQuiz: scoreQuiz };
  if (typeof module !== "undefined") { module.exports = api; }
  else { root.KirayaLogic = api; }
})(typeof window !== "undefined" ? window : globalThis);
