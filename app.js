// Kiraya — page wiring. All rules live in logic.js; this file only renders.
// "Today" is pinned to 2026-11-13 so the sample figures (inDrive Rs 320
// best value, Careem Rs 460, the Rs 140 gap, Rs 3,080 a month saved,
// fog surge x1.8 -> Rs 828, wait 25 min -> x1.2 -> Rs 552, ref
// KRY-2026-4812, Ahmed Raza, Suzuki Alto, LHR-4812, 4.9 stars, 2%
// cancellation rate) stay stable no matter when you open it.
(function () {
  var L = window.KirayaLogic;
  var TODAY = "2026-11-13";
  var STORE_SAFETY = "kiraya-safety-done";
  var STORE_BOOKING = "kiraya-booking";
  var STORE_SHARE = "kiraya-share-trip";
  var STORE_SPOTTER = "kiraya-spotter-answers";

  function el(id) { return document.getElementById(id); }
  function rs(n) { return "Rs " + L.formatPKR(n); }

  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") || fallback; }
    catch (e) { return fallback; }
  }
  function saveJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }
  var doneIds = loadJSON(STORE_SAFETY, []);
  var booking = loadJSON(STORE_BOOKING, null);
  var shareTrip = loadJSON(STORE_SHARE, false);
  var spotterAnswers = loadJSON(STORE_SPOTTER, {});
  var etaTimer = null;
  var etaStartedAt = 0;

  // ---- Tabs ----
  var TABS = ["compare", "surge", "safety", "book", "spotter"];
  function showTab(name) {
    TABS.forEach(function (t) {
      el("section-" + t).style.display = (t === name) ? "block" : "none";
      el("tab-" + t).className = "tab-btn" + (t === name ? " active" : "");
    });
  }
  TABS.forEach(function (t) {
    el("tab-" + t).addEventListener("click", function () { showTab(t); });
  });
  showTab("compare");

  // ---- Fare compare (fares per city, cheapest first, verified filter) ----
  function currentFares() {
    var city = el("city-select").value || "Lahore";
    var list = L.faresForCity(FARES_BY_CITY, city);
    if (el("verified-only").checked) list = L.verifiedOnly(list);
    return { city: city, list: list };
  }

  function renderCompare() {
    var cur = currentFares();
    var box = el("fare-list");
    box.innerHTML = "";
    if (cur.list.length === 0) {
      box.innerHTML = '<div class="alert warn"><strong>No verified rides here</strong>' +
        "<p>Turn off the verified-only filter to see every app in " + cur.city + " — but check the driver and the plate before you get in.</p></div>";
    }
    cur.list.forEach(function (f, i) {
      var div = document.createElement("div");
      div.className = "provider" + (i === 0 ? " best" : "");
      var badge = f.verified ? "✓ VERIFIED DRIVER" : "DRIVER NOT VERIFIED";
      if (f.best) badge += " · BEST VALUE";
      if (!f.verified) badge += " · CHEAPEST RIDE";
      var kind = f.kind === "bike" ? "bike" : "car";
      div.innerHTML = "<div><h3>" + f.name + "</h3><p>" + badge + "</p></div>" +
        '<div class="recv">' + rs(f.price) +
        (i === 0 ? "<span>BEST VALUE</span>" : "<span>" + kind + " · " + f.etaMin + " min</span>") + "</div>";
      box.appendChild(div);
    });
    var all = L.faresForCity(FARES_BY_CITY, cur.city);
    var best = L.cheapestVerified(all);
    var gap = L.fareGap(all);
    el("fare-summary").textContent = ROUTE.from + " → " + ROUTE.to +
      " · " + cur.city + " · " + ROUTE.km + " km · ~" + ROUTE.minutes +
      " min · 13 Nov 2026 (sample). Best value: " + best.name + " at " +
      rs(best.price) + ", verified driver, " + best.etaMin + " min away.";
    el("fare-gap").innerHTML =
      '<div class="gap-box"><strong>CHEAPEST VERIFIED vs MOST EXPENSIVE — ' + rs(gap.gap) + " APART</strong>" +
      "<p>" + gap.cheapest.name + " charges " + rs(gap.cheapest.price) + " with a verified driver. " +
      gap.dearest.name + " charges " + rs(gap.dearest.price) + ". " +
      "Same " + ROUTE.km + " km. Compare before you book.</p></div>";
    var saving = L.monthlySaving(gap.gap, WORKDAYS_PER_MONTH);
    el("monthly-saving").innerHTML =
      '<div class="total"><strong>COMPARE EVERY DAY — SAVE ' + rs(saving) + " A MONTH</strong>" +
      "<p>" + rs(gap.gap) + " saved per ride × " + WORKDAYS_PER_MONTH +
      " workdays = " + rs(saving) + ". Same ride, same road, half the fare.</p></div>";
  }
  el("city-select").addEventListener("change", function () {
    renderCompare(); fillBookApps(); fillSurgeApps(); renderSurge();
  });
  el("verified-only").addEventListener("change", renderCompare);
  renderCompare();

  // ---- Surge planner ----
  function fillSurgeApps() {
    var city = el("city-select").value || "Lahore";
    var list = L.faresForCity(FARES_BY_CITY, city);
    var sel = el("surge-app");
    var prev = sel.value || "careem";
    sel.innerHTML = "";
    list.forEach(function (f) {
      var opt = document.createElement("option");
      opt.value = f.id;
      opt.textContent = f.name + " — " + rs(f.price);
      sel.appendChild(opt);
    });
    sel.value = L.findFare(list, prev) ? prev : "careem";
  }
  fillSurgeApps();

  function renderSurge() {
    var city = el("city-select").value || "Lahore";
    var list = L.faresForCity(FARES_BY_CITY, city);
    var app = L.findFare(list, el("surge-app").value) || L.findFare(list, "careem") || list[0];
    var hour = el("surge-hour").value || SURGE_NOW_HOUR;
    var mult = L.surgeByHour(SURGE_BY_HOUR, hour);
    var fare = L.surgeFare(app.price, mult);
    var hot = mult >= 1.8;
    el("surge-result").innerHTML =
      '<div class="alert ' + (hot ? "risk" : (mult >= 1.3 ? "warn" : "ok")) + '"><strong>' +
      (hot ? "SURGE ×" + mult + " — FOG EVENING" : "SURGE ×" + mult + " — " + hour.toUpperCase()) +
      "</strong><p>" + app.name + " " + ROUTE.from + " → " + ROUTE.to + ": " +
      rs(app.price) + " × " + mult + " = <strong>" + rs(fare) + "</strong>. " +
      (hot ? "Fog season is Nov–Feb — fewer drivers, higher surge."
           : "Checked " + TODAY + " (sample data).") + "</p></div>";
    var bars = SURGE_BY_HOUR.map(function (h) {
      var hgt = Math.round(56 * h.mult / 1.8);
      var col = h.mult >= 1.8 ? "var(--red)" : (h.mult >= 1.3 ? "var(--amber)" : "var(--violet)");
      var on = h.hour === hour;
      return '<div class="surge-bar' + (on ? " on" : "") + '"><span>×' + h.mult +
        '</span><div style="height:' + hgt + 'px;background:' + col + '"></div><label>' +
        h.hour + "</label></div>";
    }).join("");
    el("surge-forecast").innerHTML =
      '<div class="forecast"><strong>SURGE FORECAST BY HOUR — ' + city.toUpperCase() +
      "</strong><div class=\"bars\">" + bars + "</div></div>";
    var wait = L.waitAndSave(app.price, mult, SURGE_WAIT_MULT);
    if (wait.worthWaiting) {
      el("wait-save").innerHTML =
        '<div class="alert ok"><strong>WAIT ' + SURGE_WAIT_MIN + " MIN — SURGE DROPS TO ×" + SURGE_WAIT_MULT + "</strong>" +
        "<p>" + app.name + " " + rs(wait.nowFare) + " → " + rs(wait.laterFare) +
        ". Save " + rs(wait.saveRs) + " on one ride. Fog thins after 7:30 PM — more drivers return.</p></div>";
    } else {
      el("wait-save").innerHTML =
        '<div class="alert ok"><strong>NO NEED TO WAIT</strong>' +
        "<p>At ×" + mult + " the fare is already " + rs(wait.nowFare) +
        ". Book now — waiting would not save you anything.</p></div>";
    }
  }
  el("surge-hour").addEventListener("change", renderSurge);
  el("surge-app").addEventListener("change", renderSurge);
  renderSurge();

  // ---- Safety checklist (persisted in localStorage) ----
  function renderSafety() {
    var list = el("safety-checks");
    list.innerHTML = "";
    SAFETY_CHECKS.forEach(function (item) {
      var li = document.createElement("li");
      var done = doneIds.indexOf(item.id) !== -1;
      li.className = done ? "done" : "";
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = done;
      cb.setAttribute("aria-label", item.label);
      cb.addEventListener("change", function () {
        doneIds = L.toggleChecklist(doneIds, item.id);
        saveJSON(STORE_SAFETY, doneIds);
        renderSafety();
      });
      var span = document.createElement("span");
      span.textContent = item.label;
      li.appendChild(cb);
      li.appendChild(span);
      list.appendChild(li);
    });
    var p = L.checklistProgress(doneIds, SAFETY_CHECKS);
    el("safety-progress").textContent = p.done + " of " + p.total +
      " checks done — tick them all off before you book.";
    var v = L.safetyVerdict(doneIds, SAFETY_CHECKS);
    var cls = v.level === "SAFE TO BOOK" ? "ok" : "warn";
    el("safety-verdict").innerHTML = '<div class="alert ' + cls + '"><strong>' + v.level + "</strong><p>" + v.advice + "</p></div>";
  }
  renderSafety();

  // ---- Cancellation-rate check ----
  function renderCancel() {
    var n = parseInt(el("cancel-count").value, 10);
    if (isNaN(n) || n < 0) n = 0;
    if (n > 10) n = 10;
    var r = L.cancellationFlag(n, 10);
    var cls = r.flag === "FREQUENT CANCELLER" ? "risk" : "ok";
    el("cancel-result").innerHTML = '<div class="alert ' + cls + '"><strong>' +
      (r.flag === "FREQUENT CANCELLER" ? "! " : "✓ ") + r.flag + " — " + r.rate + "%</strong><p>" +
      r.advice + "</p></div>";
  }
  el("cancel-btn").addEventListener("click", renderCancel);
  el("cancel-count").addEventListener("keydown", function (e) {
    if (e.key === "Enter") renderCancel();
  });
  renderCancel();

  // ---- Share live trip (persisted in localStorage) ----
  function renderShare() {
    el("share-trip").checked = !!shareTrip;
    el("share-status").textContent = shareTrip
      ? "ON — your family can follow this ride live, the way Mahnoor shares hers with her brother every night."
      : "OFF — turn it on and your family can follow the ride live.";
  }
  el("share-trip").addEventListener("change", function () {
    shareTrip = el("share-trip").checked;
    saveJSON(STORE_SHARE, shareTrip);
    renderShare();
  });
  renderShare();

  // ---- Booking (mints KRY-2026-XXXX ref + live ETA countdown) ----
  var bookSelect = el("book-app");
  function fillBookApps() {
    var city = el("city-select").value || "Lahore";
    var list = L.faresForCity(FARES_BY_CITY, city);
    var prev = bookSelect.value;
    bookSelect.innerHTML = "";
    list.forEach(function (f) {
      var opt = document.createElement("option");
      opt.value = f.id;
      opt.textContent = f.name + " — " + rs(f.price) + (f.verified ? " · verified driver" : " · driver not verified");
      bookSelect.appendChild(opt);
    });
    var best = L.cheapestVerified(list);
    bookSelect.value = (prev && L.findFare(list, prev)) ? prev : (best ? best.id : list[0].id);
  }
  fillBookApps();

  function stopEta() {
    if (etaTimer !== null && typeof clearInterval !== "undefined") clearInterval(etaTimer);
    etaTimer = null;
  }

  function renderBooking() {
    var box = el("booking-result");
    var dbox = el("driver-card");
    if (!booking) {
      box.innerHTML = '<div class="alert notfound"><strong>No booking yet</strong>' +
        "<p>Pick an app above and book — you get a reference and a live ETA.</p></div>";
      dbox.innerHTML = "";
      return;
    }
    var elapsed = Math.floor((Date.now() - etaStartedAt) / 1000);
    var left = L.etaSecondsLeft(booking.etaMin, elapsed);
    var done = left <= 0;
    box.innerHTML = '<div class="alert ' + (done ? "ok" : "warn") + '"><strong>' +
      (done ? "✓ DRIVER ARRIVED — " : "BOOKED — ") + booking.appName + " · " + rs(booking.price) + "</strong>" +
      "<p>Ref " + booking.ref + " · " + (done ? "Your driver is here. Check the plate before you get in."
        : "Arriving in <strong>" + L.formatEta(left) + "</strong> — driver on the way.") +
      "</p><p>Booked " + TODAY + " (sample data). Pay in the app — no cash, no \u201cpetrol money\u201d.</p></div>";
    if (booking.appId === "indrive") {
      dbox.innerHTML = '<div class="driver"><strong>YOUR DRIVER</strong>' +
        "<h3>" + DRIVER.name + "</h3>" +
        "<p>" + DRIVER.car + " · " + DRIVER.plate + "</p>" +
        "<p>" + DRIVER.rating + "★ · " + DRIVER.cancelRate + "% cancellation rate · reliable</p>" +
        '<p><span class="badge-ok">✓ VERIFIED DRIVER</span></p></div>';
    } else {
      dbox.innerHTML = '<div class="driver"><strong>YOUR DRIVER</strong>' +
        "<p>A verified driver is assigned — name, photo, plate and rating appear here before pickup. Check the plate before you get in.</p></div>";
    }
  }

  function startEta() {
    stopEta();
    if (typeof setInterval === "undefined") return;
    etaTimer = setInterval(renderBooking, 1000);
  }

  el("book-btn").addEventListener("click", function () {
    var city = el("city-select").value || "Lahore";
    var list = L.faresForCity(FARES_BY_CITY, city);
    var fare = L.findFare(list, bookSelect.value) || L.cheapestVerified(list) || list[0];
    booking = { ref: L.mintBookingRef(), appId: fare.id, appName: fare.name,
                price: fare.price, etaMin: fare.etaMin, city: city };
    saveJSON(STORE_BOOKING, booking);
    etaStartedAt = Date.now();
    renderBooking();
    startEta();
  });
  if (booking) {
    etaStartedAt = Date.now();
    renderBooking();
    startEta();
  } else {
    renderBooking();
  }

  // ---- Fare-spotter quiz ----
  function renderSpotter() {
    var box = el("spotter-quiz");
    box.innerHTML = "";
    SPOTTER_FLAGS.forEach(function (flag, i) {
      var div = document.createElement("div");
      div.className = "spotter-q";
      var chosen = spotterAnswers[flag.id];
      var btnFlag = document.createElement("button");
      btnFlag.textContent = "Red flag";
      btnFlag.className = chosen === true ? "flag-btn chosen" : "flag-btn";
      btnFlag.addEventListener("click", function () {
        spotterAnswers[flag.id] = true;
        saveJSON(STORE_SPOTTER, spotterAnswers);
        renderSpotter();
      });
      var btnSafe = document.createElement("button");
      btnSafe.textContent = "Safe";
      btnSafe.className = "secondary" + (chosen === false ? " chosen" : "");
      btnSafe.addEventListener("click", function () {
        spotterAnswers[flag.id] = false;
        saveJSON(STORE_SPOTTER, spotterAnswers);
        renderSpotter();
      });
      var p = document.createElement("p");
      p.innerHTML = "<strong>" + (i + 1) + ". </strong>" + flag.scenario;
      div.appendChild(p);
      div.appendChild(btnFlag);
      div.appendChild(btnSafe);
      box.appendChild(div);
    });
  }
  renderSpotter();

  el("spotter-btn").addEventListener("click", function () {
    var score = L.scoreQuiz(SPOTTER_FLAGS, spotterAnswers);
    var html = '<div class="alert ' + (score.perfect ? "ok" : "warn") + '"><strong>' +
      score.correct + " OF " + score.total + " CORRECT" + "</strong><p>" +
      (score.perfect ? "Perfect — you spot all three red flags and the safe habit."
                     : "Check the ones you missed below — the fare-spotter catches them before the money moves.") +
      "</p></div>";
    SPOTTER_FLAGS.forEach(function (flag) {
      var right = L.spotterAnswer(flag, spotterAnswers[flag.id]);
      var answered = spotterAnswers.hasOwnProperty(flag.id);
      html += '<div class="alert ' + (!answered ? "notfound" : (right ? "ok" : "risk")) + '"><strong>' +
        (answered ? (right ? "✓ CORRECT — " : "✗ MISSED — ") : "NOT ANSWERED — ") +
        (flag.isFlag ? "RED FLAG" : "SAFE") + "</strong><p>" + flag.why + "</p></div>";
    });
    el("spotter-result").innerHTML = html;
  });

  el("reset-demo").addEventListener("click", function () {
    doneIds = [];
    booking = null;
    shareTrip = false;
    spotterAnswers = {};
    saveJSON(STORE_SAFETY, doneIds);
    saveJSON(STORE_BOOKING, booking);
    saveJSON(STORE_SHARE, shareTrip);
    saveJSON(STORE_SPOTTER, spotterAnswers);
    stopEta();
    el("city-select").value = "Lahore";
    el("verified-only").checked = true;
    el("surge-hour").value = "7 PM";
    el("cancel-count").value = "2";
    showTab("compare");
    renderCompare();
    fillBookApps();
    fillSurgeApps();
    renderSurge();
    renderSafety();
    renderCancel();
    renderShare();
    renderBooking();
    renderSpotter();
    el("spotter-result").innerHTML = "";
  });
})();
