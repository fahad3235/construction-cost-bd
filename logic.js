// construction-cost-bd -- pure logic (node + browser).
// House construction cost estimator for Bangladesh.
// Rates are SAMPLE defaults (BDT per sq ft, late-2026 market chatter) that the
// user can edit; they are NOT live quotes. See DATA_NOTES.md.
// Money is integer paisa throughout; category/phase splits use largest-remainder
// distribution so parts always sum exactly to the total.
(function (root) {
  'use strict';

  var APP = 'construction-cost-bd';
  var VERSION = 1;

  // ---- Defaults (all editable in the Rates tab) ----
  var DEFAULT_TIERS = [
    { id: 'basic', rate: 1800,
      desc_en: 'Brick + plaster, standard fittings, local materials',
      desc_bn: '\u0987\u099f + \u09aa\u09cd\u09b2\u09be\u09b8\u09cd\u099f\u09be\u09b0, \u09b8\u09be\u09a7\u09be\u09b0\u09a3 \u09ab\u09bf\u099f\u09bf\u0982\u09b8, \u09b8\u09cd\u09a5\u09be\u09a8\u09c0\u09af\u09bc \u0989\u09aa\u0995\u09b0\u09a3' },
    { id: 'standard', rate: 2400,
      desc_en: 'Good finish, branded fittings, tiles + paint',
      desc_bn: '\u09ad\u09be\u09b2\u09cb \u09ab\u09bf\u09a8\u09bf\u09b6\u09bf\u0982, \u09ac\u09cd\u09b0\u09cd\u09af\u09be\u09a8\u09cd\u09a1\u09c7\u09a1 \u09ab\u09bf\u099f\u09bf\u0982\u09b8, \u099f\u09be\u0987\u09b2\u09b8 + \u09aa\u09c7\u0987\u09a8\u09cd\u099f' },
    { id: 'premium', rate: 3200,
      desc_en: 'Premium finish, imported fittings, full furnishing-ready',
      desc_bn: '\u09aa\u09cd\u09b0\u09bf\u09ae\u09bf\u09af\u09bc\u09be\u09ae \u09ab\u09bf\u09a8\u09bf\u09b6\u09bf\u0982, \u0986\u09ae\u09a6\u09be\u09a8\u09bf\u0995\u09c3\u09a4 \u09ab\u09bf\u099f\u09bf\u0982\u09b8, \u09b8\u09ae\u09cd\u09aa\u09c2\u09b0\u09cd\u09a3 \u09aa\u09cd\u09b0\u09b8\u09cd\u09a4\u09c1\u09a4' },
  ];

  // Category splits per tier (percent, must sum to 100).
  var DEFAULT_SPLITS = {
    basic:    { structure: 38, brickwork: 16, finishing: 16, doors: 8, plumbing: 8, misc: 14 },
    standard: { structure: 35, brickwork: 15, finishing: 20, doors: 10, plumbing: 10, misc: 10 },
    premium:  { structure: 32, brickwork: 13, finishing: 25, doors: 12, plumbing: 10, misc: 8 },
  };

  var CATEGORIES = ['structure', 'brickwork', 'finishing', 'doors', 'plumbing', 'misc'];

  // Payment phases (percent of base estimate, must sum to 100).
  var DEFAULT_PHASES = [
    { id: 'foundation', pct: 15 },
    { id: 'structure', pct: 35 },
    { id: 'brickwork', pct: 20 },
    { id: 'finishing', pct: 20 },
    { id: 'handover', pct: 10 },
  ];

  // Optional extras (flat BDT).
  var DEFAULT_EXTRAS = [
    { id: 'boundary', cost: 150000 },
    { id: 'gate', cost: 60000 },
    { id: 'tubewell', cost: 45000 },
    { id: 'septic', cost: 80000 },
    { id: 'watertank', cost: 35000 },
  ];

  // Material thumb rules: quantity per sq ft of TOTAL built area.
  var DEFAULT_MATERIALS = [
    { id: 'cement', perSqft: 0.40, unit: 'bag', unitPrice: 550 },
    { id: 'steel', perSqft: 4.0, unit: 'kg', unitPrice: 95 },
    { id: 'brick', perSqft: 8, unit: 'pcs', unitPrice: 12 },
    { id: 'sand', perSqft: 0.75, unit: 'cft', unitPrice: 55 },
    { id: 'aggregate', perSqft: 0.90, unit: 'cft', unitPrice: 220 },
  ];

  // Shared foundation + roof: cost per sq ft falls slightly with more floors.
  function floorFactor(floors) {
    if (floors <= 1) return 1.0;
    if (floors === 2) return 0.97;
    return 0.95;
  }

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function defaultRates() {
    return {
      tiers: clone(DEFAULT_TIERS).map(function (t) { return { id: t.id, rate: t.rate }; }),
      splits: clone(DEFAULT_SPLITS),
      phases: clone(DEFAULT_PHASES),
      extras: clone(DEFAULT_EXTRAS),
      materials: clone(DEFAULT_MATERIALS),
    };
  }

  // ---- Validation ----
  function validateInputs(inp) {
    var errors = [];
    if (!inp || typeof inp !== 'object') return ['invalid input'];
    if (!(inp.area > 0) || !isFinite(inp.area)) errors.push('area');
    if (inp.area > 100000) errors.push('area-too-large');
    if (!(inp.floors >= 1 && inp.floors <= 10) || Math.floor(inp.floors) !== inp.floors) errors.push('floors');
    var tierIds = DEFAULT_TIERS.map(function (t) { return t.id; });
    if (tierIds.indexOf(inp.tier) < 0) errors.push('tier');
    if (inp.extras) {
      var known = DEFAULT_EXTRAS.map(function (e) { return e.id; });
      for (var i = 0; i < inp.extras.length; i++) {
        if (known.indexOf(inp.extras[i]) < 0) errors.push('extra:' + inp.extras[i]);
      }
    }
    return errors;
  }

  function validateRates(rates) {
    var errors = [];
    if (!rates || typeof rates !== 'object') return ['rates-missing'];
    var tierIds = {};
    (rates.tiers || []).forEach(function (t) {
      tierIds[t.id] = true;
      if (!(t.rate > 0) || !isFinite(t.rate)) errors.push('rate:' + t.id);
    });
    DEFAULT_TIERS.forEach(function (t) { if (!tierIds[t.id]) errors.push('tier-missing:' + t.id); });
    Object.keys(DEFAULT_SPLITS).forEach(function (tier) {
      var s = (rates.splits || {})[tier];
      if (!s) { errors.push('split-missing:' + tier); return; }
      var sum = 0;
      CATEGORIES.forEach(function (c) {
        var v = s[c];
        if (!(v >= 0) || !isFinite(v)) errors.push('split:' + tier + '.' + c);
        else sum += v;
      });
      if (sum !== 100) errors.push('split-sum:' + tier + '=' + sum);
    });
    var psum = 0;
    (rates.phases || []).forEach(function (p) {
      if (!(p.pct >= 0) || !isFinite(p.pct)) errors.push('phase:' + p.id);
      else psum += p.pct;
    });
    if ((rates.phases || []).length !== DEFAULT_PHASES.length) errors.push('phase-count');
    else if (psum !== 100) errors.push('phase-sum=' + psum);
    (rates.extras || []).forEach(function (e) {
      if (!(e.cost >= 0) || !isFinite(e.cost)) errors.push('extra-cost:' + e.id);
    });
    (rates.materials || []).forEach(function (m) {
      if (!(m.perSqft > 0) || !isFinite(m.perSqft)) errors.push('mat-qty:' + m.id);
      if (!(m.unitPrice > 0) || !isFinite(m.unitPrice)) errors.push('mat-price:' + m.id);
    });
    return errors;
  }

  // Largest-remainder distribution of integer paisa across integer weights.
  function distribute(totalPaisa, weights) {
    var sum = 0;
    weights.forEach(function (w) { sum += w; });
    if (sum <= 0 || totalPaisa < 0) return weights.map(function () { return 0; });
    var raw = weights.map(function (w) { return (totalPaisa * w) / sum; });
    var base = raw.map(function (r) { return Math.floor(r); });
    var assigned = 0;
    base.forEach(function (b) { assigned += b; });
    var left = totalPaisa - assigned;
    var order = raw.map(function (r, i) { return { i: i, frac: r - Math.floor(r) }; })
      .sort(function (a, b) { return b.frac - a.frac || a.i - b.i; });
    for (var k = 0; k < left; k++) base[order[k % order.length].i] += 1;
    return base;
  }

  // ---- Core estimate ----
  // inp: { area (sq ft per floor), floors, tier, extras: [ids] }
  // rates: defaultRates() shape (or edited copy).
  // Returns null when inputs/rates are invalid.
  function estimate(inp, rates) {
    if (validateInputs(inp).length) return null;
    if (validateRates(rates).length) return null;
    var tier = null;
    rates.tiers.forEach(function (t) { if (t.id === inp.tier) tier = t; });
    var totalArea = inp.area * inp.floors;
    var factor = floorFactor(inp.floors);
    // Base in paisa: area * floors * rate(BDT) * factor * 100.
    var basePaisa = Math.round(totalArea * tier.rate * factor * 100);
    var split = rates.splits[inp.tier];
    var weights = CATEGORIES.map(function (c) { return split[c]; });
    var catPaisa = distribute(basePaisa, weights);
    var categories = CATEGORIES.map(function (c, i) {
      return { id: c, pct: split[c], paisa: catPaisa[i] };
    });
    var phaseWeights = rates.phases.map(function (p) { return p.pct; });
    var phasePaisa = distribute(basePaisa, phaseWeights);
    var phases = rates.phases.map(function (p, i) {
      return { id: p.id, pct: p.pct, paisa: phasePaisa[i] };
    });
    var chosenExtras = [];
    var extrasPaisa = 0;
    (inp.extras || []).forEach(function (id) {
      rates.extras.forEach(function (e) {
        if (e.id === id) {
          chosenExtras.push({ id: id, paisa: Math.round(e.cost * 100) });
          extrasPaisa += Math.round(e.cost * 100);
        }
      });
    });
    var materials = rates.materials.map(function (m) {
      var qty = Math.round(totalArea * m.perSqft * 100) / 100;
      var costPaisa = Math.round(qty * m.unitPrice * 100);
      return { id: m.id, qty: qty, unit: m.unit, unitPrice: m.unitPrice, paisa: costPaisa };
    });
    var materialTotalPaisa = 0;
    materials.forEach(function (m) { materialTotalPaisa += m.paisa; });
    return {
      area: inp.area,
      floors: inp.floors,
      tier: inp.tier,
      totalArea: totalArea,
      floorFactor: factor,
      ratePerSqft: tier.rate,
      basePaisa: basePaisa,
      extrasPaisa: extrasPaisa,
      totalPaisa: basePaisa + extrasPaisa,
      categories: categories,
      phases: phases,
      extras: chosenExtras,
      materials: materials,
      materialTotalPaisa: materialTotalPaisa,
    };
  }

  // ---- Formatting ----
  var BN_DIGITS = ['\u09e6', '\u09e7', '\u09e8', '\u09e9', '\u09ea', '\u09eb', '\u09ec', '\u09ed', '\u09ee', '\u09ef'];
  function toBnDigits(s) {
    return String(s).replace(/[0-9]/g, function (d) { return BN_DIGITS[+d]; });
  }
  function groupThousands(intStr) {
    // Bangladeshi grouping: last 3 digits, then groups of 2 (lakh style).
    var s = String(intStr);
    if (s.length <= 3) return s;
    var tail = s.slice(-3);
    var head = s.slice(0, -3);
    var parts = [];
    while (head.length > 2) { parts.unshift(head.slice(-2)); head = head.slice(0, -2); }
    if (head) parts.unshift(head);
    return parts.join(',') + ',' + tail;
  }
  // paisa (int) -> "\u09f355,87,200.00" (en) or Bengali-digit equivalent (bn).
  function formatBDT(paisa, lang) {
    var neg = paisa < 0;
    var abs = Math.abs(Math.round(paisa));
    var taka = Math.floor(abs / 100);
    var p = abs % 100;
    var out = '\u09f3' + groupThousands(taka) + '.' + (p < 10 ? '0' : '') + p;
    if (lang === 'bn') out = toBnDigits(out);
    return neg ? '-' + out : out;
  }
  function formatNumber(n, lang) {
    var s = String(n);
    // plain grouping for quantities (western 3-digit groups are fine for counts)
    var parts = s.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    s = parts.join('.');
    return lang === 'bn' ? toBnDigits(s) : s;
  }

  // ---- Saved estimates: validation + export/import ----
  function validateSavedRecord(r) {
    if (!r || typeof r !== 'object') return false;
    if (typeof r.id !== 'string' || !r.id) return false;
    if (typeof r.name !== 'string' || !r.name.trim()) return false;
    if (r.name.length > 80) return false;
    if (validateInputs({ area: r.area, floors: r.floors, tier: r.tier, extras: r.extras }).length) return false;
    if (!(r.totalPaisa > 0) || !isFinite(r.totalPaisa)) return false;
    if (typeof r.createdAt !== 'string' || !r.createdAt) return false;
    return true;
  }

  function exportPayload(saved, rates) {
    return JSON.stringify({ app: APP, version: VERSION, saved: saved, rates: rates }, null, 2);
  }

  function importPayload(text) {
    var data;
    try { data = JSON.parse(text); } catch (e) { return { ok: false, error: 'not-json' }; }
    if (!data || data.app !== APP) return { ok: false, error: 'wrong-app' };
    if (data.version !== VERSION) return { ok: false, error: 'wrong-version' };
    if (!Array.isArray(data.saved)) return { ok: false, error: 'bad-saved' };
    for (var i = 0; i < data.saved.length; i++) {
      if (!validateSavedRecord(data.saved[i])) return { ok: false, error: 'bad-record:' + i };
    }
    if (data.rates !== undefined && validateRates(data.rates).length) {
      return { ok: false, error: 'bad-rates' };
    }
    return { ok: true, data: data };
  }

  var api = {
    APP: APP, VERSION: VERSION,
    DEFAULT_TIERS: DEFAULT_TIERS, DEFAULT_SPLITS: DEFAULT_SPLITS,
    CATEGORIES: CATEGORIES, DEFAULT_PHASES: DEFAULT_PHASES,
    DEFAULT_EXTRAS: DEFAULT_EXTRAS, DEFAULT_MATERIALS: DEFAULT_MATERIALS,
    floorFactor: floorFactor, defaultRates: defaultRates,
    validateInputs: validateInputs, validateRates: validateRates,
    distribute: distribute, estimate: estimate,
    toBnDigits: toBnDigits, groupThousands: groupThousands,
    formatBDT: formatBDT, formatNumber: formatNumber,
    validateSavedRecord: validateSavedRecord,
    exportPayload: exportPayload, importPayload: importPayload,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ConstructionCost = api;
})(typeof window !== 'undefined' ? window : globalThis);
