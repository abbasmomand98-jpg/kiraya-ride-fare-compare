// Kiraya DOM smoke test — run with: node dom-smoke.js
// Executes data.js + logic.js + app.js in a tiny fake DOM (vm sandbox)
// and asserts the page renders the canonical figures.
var fs = require("fs");
var vm = require("vm");
var assert = require("assert");

function FakeEl(tag) {
  this.tagName = (tag || "div").toUpperCase();
  this.children = [];
  this._html = "";
  this.textContent = "";
  this.value = "";
  this.checked = false;
  this.disabled = false;
  this.className = "";
  this.style = {};
  this.listeners = {};
  this.attributes = {};
}
FakeEl.prototype.addEventListener = function (ev, fn) {
  (this.listeners[ev] = this.listeners[ev] || []).push(fn);
};
FakeEl.prototype.appendChild = function (child) { this.children.push(child); return child; };
FakeEl.prototype.setAttribute = function (k, v) { this.attributes[k] = v; };
FakeEl.prototype.getAttribute = function (k) { return this.attributes[k]; };
Object.defineProperty(FakeEl.prototype, "innerHTML", {
  get: function () { return this._html; },
  set: function (v) { this._html = String(v); this.children = []; }
});

var byId = {};
function el(id) {
  if (!byId[id]) byId[id] = new FakeEl("div");
  return byId[id];
}
var documentStub = {
  getElementById: el,
  createElement: function (tag) { return new FakeEl(tag); }
};
var store = {};
var localStorageStub = {
  getItem: function (k) { return store[k] || null; },
  setItem: function (k, v) { store[k] = String(v); }
};
function fire(id, ev, arg) {
  (byId[id].listeners[ev] || []).forEach(function (fn) { fn(arg || {}); });
}
function fireEl(node, ev, arg) {
  (node.listeners[ev] || []).forEach(function (fn) { fn(arg || {}); });
}

var sandbox = { document: documentStub, localStorage: localStorageStub, console: console,
  Date: Date, setInterval: function () { return 0; }, clearInterval: function () {} };
sandbox.window = sandbox;
vm.createContext(sandbox);
// Pre-seed the fake DOM with the defaults index.html declares in markup
// (the fake DOM does not parse checked/selected attributes).
el("verified-only").checked = true;
el("city-select").value = "Lahore";
el("surge-hour").value = "7 PM";
el("cancel-count").value = "2";
["data.js", "logic.js", "app.js"].forEach(function (f) {
  vm.runInContext(fs.readFileSync(f, "utf8"), sandbox, { filename: f });
});

var n = 0;
function eq(a, b, msg) { assert.strictEqual(a, b, msg); n++; }
function ok(v, msg) { assert.ok(v, msg); n++; }

// 1. Compare tab is active on load; board renders 3 verified Lahore fares, inDrive first.
eq(el("section-compare").style.display, "block", "compare section shows on load");
eq(el("fare-list").children.length, 3, "fare board renders 3 verified Lahore fares on load");
ok(el("fare-list").children[0].innerHTML.indexOf("inDrive") !== -1, "first fare is inDrive");
ok(el("fare-list").children[0].innerHTML.indexOf("Rs 320") !== -1, "inDrive shows Rs 320");
ok(el("fare-list").children[0].innerHTML.indexOf("BEST VALUE") !== -1, "inDrive carries the BEST VALUE badge");
ok(el("fare-list").children[2].innerHTML.indexOf("Careem") !== -1, "last fare is Careem");
ok(el("fare-list").children[2].innerHTML.indexOf("Rs 460") !== -1, "Careem shows Rs 460");
ok(el("fare-gap").innerHTML.indexOf("Rs 140") !== -1, "gap callout shows Rs 140 apart");
ok(el("monthly-saving").innerHTML.indexOf("Rs 3,080") !== -1, "monthly saving shows Rs 3,080");
ok(el("fare-summary").textContent.indexOf("inDrive") !== -1, "summary names inDrive as best value");
ok(el("fare-summary").textContent.indexOf("13 Nov 2026") !== -1, "summary names 13 Nov 2026");
ok(el("fare-summary").textContent.indexOf("Gulberg III") !== -1, "summary names Gulberg III");

// 2. Verified-only toggle filters the board; off shows all 4 Lahore fares.
el("verified-only").checked = false;
fire("verified-only", "change");
eq(el("fare-list").children.length, 4, "verified-off shows all 4 Lahore fares");
ok(el("fare-list").children[0].innerHTML.indexOf("Bykea") !== -1, "first fare with filter off is Bykea");
ok(el("fare-list").children[0].innerHTML.indexOf("Rs 290") !== -1, "Bykea shows Rs 290");
el("verified-only").checked = true;
fire("verified-only", "change");
eq(el("fare-list").children.length, 3, "verified-only keeps 3 fares");

// 3. City switch to Karachi re-renders with Karachi fares.
el("city-select").value = "Karachi";
fire("city-select", "change");
ok(el("fare-list").children[0].innerHTML.indexOf("inDrive") !== -1, "Karachi board starts with inDrive");
ok(el("fare-list").children[0].innerHTML.indexOf("Rs 340") !== -1, "inDrive Karachi shows Rs 340");
ok(el("fare-summary").textContent.indexOf("Karachi") !== -1, "summary names Karachi");
el("city-select").value = "Lahore";
fire("city-select", "change");
ok(el("fare-list").children[0].innerHTML.indexOf("Rs 320") !== -1, "switching back to Lahore restores Rs 320");

// 4. Surge planner renders the canonical x1.8 verdict on load.
fire("tab-surge", "click");
eq(el("section-surge").style.display, "block", "surge section shows on tab click");
eq(el("section-compare").style.display, "none", "compare section hides on tab click");
ok(el("surge-result").innerHTML.indexOf("×1.8") !== -1, "surge shows x1.8 at 7 PM");
ok(el("surge-result").innerHTML.indexOf("Rs 828") !== -1, "surge shows Rs 828 for Careem at x1.8");
ok(el("wait-save").innerHTML.indexOf("Rs 552") !== -1, "wait-and-save shows Rs 552");
ok(el("wait-save").innerHTML.indexOf("Rs 276") !== -1, "wait-and-save shows Rs 276 saved");
ok(el("surge-forecast").innerHTML.indexOf("7 PM") !== -1, "forecast names 7 PM");

// 5. Surge at 5 PM: x1.0, no need to wait.
el("surge-hour").value = "5 PM";
fire("surge-hour", "change");
ok(el("surge-result").innerHTML.indexOf("×1") !== -1, "5 PM surge is x1.0");
ok(el("surge-result").innerHTML.indexOf("Rs 460") !== -1, "5 PM Careem fare is Rs 460");
ok(el("wait-save").innerHTML.indexOf("NO NEED TO WAIT") !== -1, "5 PM shows no need to wait");
el("surge-hour").value = "7 PM";
fire("surge-hour", "change");
ok(el("surge-result").innerHTML.indexOf("Rs 828") !== -1, "surge restores Rs 828 at 7 PM");

// 6. Safety checklist renders 5 items, progress 0 of 5, ticking persists.
fire("tab-safety", "click");
eq(el("safety-checks").children.length, 5, "safety checklist renders 5 checks");
eq(el("safety-progress").textContent, "0 of 5 checks done — tick them all off before you book.", "safety progress starts at 0 of 5");
ok(el("safety-verdict").innerHTML.indexOf("NOT YET SAFE") !== -1, "0 of 5 is NOT YET SAFE");
var first = el("safety-checks").children[0].children[0];
first.checked = true;
fireEl(first, "change");
eq(el("safety-progress").textContent, "1 of 5 checks done — tick them all off before you book.", "progress moves to 1 of 5 after ticking");
ok((store["kiraya-safety-done"] || "").indexOf("verified") !== -1, "ticked check persists in localStorage");

// 7. Cancellation-rate check: 2 of 10 is a frequent canceller, 0 of 10 is reliable.
ok(el("cancel-result").innerHTML.indexOf("FREQUENT CANCELLER") !== -1, "2 of 10 is a FREQUENT CANCELLER");
ok(el("cancel-result").innerHTML.indexOf("20%") !== -1, "2 of 10 shows a 20% rate");
el("cancel-count").value = "0";
fire("cancel-btn", "click");
ok(el("cancel-result").innerHTML.indexOf("RELIABLE") !== -1, "0 of 10 is RELIABLE");
el("cancel-count").value = "2";
fire("cancel-btn", "click");
ok(el("cancel-result").innerHTML.indexOf("FREQUENT CANCELLER") !== -1, "cancel check restores FREQUENT CANCELLER");

// 8. Share live trip toggle persists.
ok(el("share-status").textContent.indexOf("OFF") !== -1, "share trip starts OFF");
el("share-trip").checked = true;
fire("share-trip", "change");
ok(el("share-status").textContent.indexOf("ON") !== -1, "share trip turns ON");
ok((store["kiraya-share-trip"] || "") === "true", "share trip persists in localStorage");

// 9. Booking mints a KRY-2026-XXXX ref with a live 6:00 ETA and the driver card.
fire("tab-book", "click");
eq(el("section-book").style.display, "block", "book section shows on tab click");
fire("book-btn", "click");
ok(el("booking-result").innerHTML.indexOf("BOOKED") !== -1, "booking shows BOOKED");
ok(el("booking-result").innerHTML.indexOf("inDrive") !== -1, "booking names inDrive");
ok(el("booking-result").innerHTML.indexOf("Rs 320") !== -1, "booking shows Rs 320");
ok(/KRY-2026-\d{4}/.test(el("booking-result").innerHTML), "booking mints a KRY-2026-XXXX reference");
ok(el("booking-result").innerHTML.indexOf("6:00") !== -1, "booking ETA starts at 6:00");
ok((store["kiraya-booking"] || "").indexOf("KRY-2026-") !== -1, "booking persists in localStorage");
ok(el("driver-card").innerHTML.indexOf("Ahmed Raza") !== -1, "driver card names Ahmed Raza");
ok(el("driver-card").innerHTML.indexOf("LHR-4812") !== -1, "driver card shows plate LHR-4812");
ok(el("driver-card").innerHTML.indexOf("Suzuki Alto") !== -1, "driver card shows Suzuki Alto");
ok(el("driver-card").innerHTML.indexOf("4.9") !== -1, "driver card shows 4.9 stars");
ok(el("driver-card").innerHTML.indexOf("VERIFIED DRIVER") !== -1, "driver card shows the verified badge");

// 10. Fare-spotter quiz: 4 questions, perfect score after correct answers.
fire("tab-spotter", "click");
eq(el("section-spotter").style.display, "block", "spotter section shows on tab click");
eq(el("spotter-quiz").children.length, 4, "spotter quiz renders 4 questions");
fire("spotter-btn", "click");
ok(el("spotter-result").innerHTML.indexOf("0 OF 4 CORRECT") !== -1, "no answers score 0 of 4");
var qs = el("spotter-quiz").children;
for (var i = 0; i < 3; i++) {
  fireEl(qs[i].children[1], "click"); // "Red flag" for the 3 real flags
}
fireEl(qs[3].children[2], "click"); // "Safe" for the name-check habit
fire("spotter-btn", "click");
ok(el("spotter-result").innerHTML.indexOf("4 OF 4 CORRECT") !== -1, "correct answers score 4 of 4");
ok(el("spotter-result").innerHTML.indexOf("Never pay extra upfront") !== -1, "spotter result explains the petrol-money flag");

// 11. Reset restores the canonical defaults.
fire("reset-demo", "click");
eq(el("section-compare").style.display, "block", "reset returns to the compare tab");
ok(el("fare-list").children[0].innerHTML.indexOf("Rs 320") !== -1, "reset restores Rs 320 at inDrive");
ok(el("fare-gap").innerHTML.indexOf("Rs 140") !== -1, "reset restores the Rs 140 gap");
ok(el("monthly-saving").innerHTML.indexOf("Rs 3,080") !== -1, "reset restores the Rs 3,080 saving");
eq(el("safety-progress").textContent, "0 of 5 checks done — tick them all off before you book.", "reset clears the safety checklist");
eq(el("safety-checks").children.length, 5, "reset keeps all 5 safety checks");
ok(el("surge-result").innerHTML.indexOf("Rs 828") !== -1, "reset restores the Rs 828 surge verdict");
ok(el("spotter-result").innerHTML === "", "reset clears the spotter result");

console.log("\n" + n + " DOM assertions passed.");
