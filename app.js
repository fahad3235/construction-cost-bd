// construction-cost-bd -- UI wiring (browser only).
(function () {
  'use strict';
  var CC = window.ConstructionCost;
  var STR = window.ConstructionCostI18n.STR;
  var LS_LANG = 'ccbd.lang';
  var LS_RATES = 'ccbd.rates';
  var LS_SAVED = 'ccbd.saved';

  var state = {
    lang: 'en',
    rates: CC.defaultRates(),
    saved: [],
    lastEstimate: null,
    lastInput: null,
  };

  function $(id) { return document.getElementById(id); }
  function t(key) { return STR[state.lang][key] || STR.en[key] || key; }
  function fmt(paisa) { return CC.formatBDT(paisa, state.lang); }
  function num(n) { return CC.formatNumber(n, state.lang); }
  function todayStr() { return new Date().toISOString().slice(0, 10); }

  function loadPersisted() {
    try {
      var lang = localStorage.getItem(LS_LANG);
      if (lang === 'bn' || lang === 'en') state.lang = lang;
      var rates = JSON.parse(localStorage.getItem(LS_RATES) || 'null');
      if (rates && CC.validateRates(rates).length === 0) state.rates = rates;
      var saved = JSON.parse(localStorage.getItem(LS_SAVED) || 'null');
      if (Array.isArray(saved)) state.saved = saved.filter(CC.validateSavedRecord);
    } catch (e) { /* corrupted storage -> defaults */ }
  }
  function persist() {
    try {
      localStorage.setItem(LS_LANG, state.lang);
      localStorage.setItem(LS_RATES, JSON.stringify(state.rates));
      localStorage.setItem(LS_SAVED, JSON.stringify(state.saved));
    } catch (e) { /* storage unavailable */ }
  }

  // ---------- Tabs ----------
  function showTab(name) {
    document.querySelectorAll('.tab').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tab === name);
    });
    ['estimate', 'rates', 'saved', 'data'].forEach(function (n) {
      $('panel-' + n).hidden = n !== name;
    });
    if (name === 'saved') renderSaved();
    if (name === 'rates') renderRatesForm();
  }

  // ---------- i18n ----------
  function applyI18n() {
    document.documentElement.lang = state.lang === 'bn' ? 'bn' : 'en';
    $('title').textContent = t('title');
    $('subtitle').textContent = t('subtitle');
    $('langBtn').textContent = state.lang === 'bn' ? 'English' : '\u09ac\u09be\u0982\u09b2\u09be';
    $('tab-estimate').textContent = t('tabEstimate');
    $('tab-rates').textContent = t('tabRates');
    $('tab-saved').textContent = t('tabSaved');
    $('tab-data').textContent = t('tabData');
    $('areaLabel').textContent = t('areaLabel');
    $('areaHint').textContent = t('areaHint');
    $('floorsLabel').textContent = t('floorsLabel');
    $('tierLabel').textContent = t('tierLabel');
    $('extrasLabel').textContent = t('extrasLabel');
    $('calcBtn').textContent = t('calcBtn');
    $('saveBtn').textContent = t('saveBtn');
    $('saveNameLabel').textContent = t('saveNameLabel');
    $('saveName').placeholder = t('saveNamePh');
    $('baseLabel').textContent = t('baseEstimate');
    $('extrasLabel2').textContent = t('extrasTotal');
    $('grandLabel').textContent = t('grandTotal');
    $('breakdownTitle').textContent = t('breakdownTitle');
    $('thCat').textContent = t('category');
    $('thShare').textContent = t('share');
    $('thAmt').textContent = t('amount');
    $('phasesTitle').textContent = t('phasesTitle');
    $('thPhase').textContent = t('phase');
    $('thShare2').textContent = t('share');
    $('thAmt2').textContent = t('amount');
    $('materialsTitle').textContent = t('materialsTitle');
    $('materialsNote').textContent = t('materialsNote');
    $('thMat').textContent = t('material');
    $('thQty').textContent = t('qty');
    $('thUnit').textContent = t('unitPrice');
    $('thCost').textContent = t('cost');
    $('matTotalLabel').textContent = t('materialTotal');
    $('ratesTitle').textContent = t('ratesTitle');
    $('ratesNote').textContent = t('ratesNote');
    $('tierRatesTitle').textContent = t('tierRates');
    $('splitsTitle').textContent = t('splitsTitle');
    $('splitsNote').textContent = t('splitsNote');
    $('phasesEditTitle').textContent = t('phasesEditTitle');
    $('extrasEditTitle').textContent = t('extrasEditTitle');
    $('materialsEditTitle').textContent = t('materialsEditTitle');
    $('saveRatesBtn').textContent = t('saveRatesBtn');
    $('resetRatesBtn').textContent = t('resetRates');
    $('savedTitle').textContent = t('savedTitle');
    $('savedTotalLabel').textContent = t('savedTotal');
    $('dataTitle').textContent = t('tabData');
    $('exportBtn').textContent = t('exportBtn');
    $('importBtn').textContent = t('importBtn');
    $('importLabel').textContent = t('importBtn');
    $('importText').placeholder = t('importPh');
    $('eraseTitle').textContent = t('eraseTitle');
    $('eraseHint').textContent = t('eraseHint');
    $('eraseBtn').textContent = t('eraseBtn');
    $('disclaimer').textContent = t('disclaimer');
    $('footNote').textContent = t('sampleNote') + ' ' + t('disclaimer');
    renderTierSelect();
    renderExtras();
    if (state.lastEstimate) renderResults(state.lastEstimate, state.lastInput);
    renderSaved();
  }

  function tierName(id) { return t('tier_' + id); }
  function tierDesc(id) {
    var d = CC.DEFAULT_TIERS.filter(function (x) { return x.id === id; })[0];
    return d ? (state.lang === 'bn' ? d.desc_bn : d.desc_en) : '';
  }

  function renderTierSelect() {
    var sel = $('tierSelect');
    var cur = sel.value || 'standard';
    sel.innerHTML = '';
    state.rates.tiers.forEach(function (tier) {
      var o = document.createElement('option');
      o.value = tier.id;
      o.textContent = tierName(tier.id) + ' \u2014 ' + fmt(tier.rate * 100) + ' ' + t('perSqft') + ' \u00b7 ' + tierDesc(tier.id);
      sel.appendChild(o);
    });
    sel.value = cur;
  }

  function renderExtras() {
    var box = $('extrasList');
    box.innerHTML = '';
    state.rates.extras.forEach(function (ex) {
      var lab = document.createElement('label');
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = ex.id;
      cb.dataset.extra = ex.id;
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(' ' + t('ex_' + ex.id)));
      var span = document.createElement('span');
      span.className = 'cost';
      span.textContent = fmt(ex.cost * 100);
      lab.appendChild(span);
      box.appendChild(lab);
    });
  }

  // ---------- Estimate ----------
  function readForm() {
    var extras = [];
    document.querySelectorAll('#extrasList input[type="checkbox"]:checked').forEach(function (cb) {
      extras.push(cb.value);
    });
    return {
      area: parseFloat($('areaInput').value),
      floors: parseInt($('floorsInput').value, 10),
      tier: $('tierSelect').value,
      extras: extras,
    };
  }

  function calculate(ev) {
    if (ev) ev.preventDefault();
    var inp = readForm();
    var errs = CC.validateInputs(inp);
    var errEl = $('estError');
    $('areaInput').classList.toggle('invalid', errs.indexOf('area') >= 0 || errs.indexOf('area-too-large') >= 0);
    $('floorsInput').classList.toggle('invalid', errs.indexOf('floors') >= 0);
    if (errs.length) {
      var msg = errs.indexOf('area') >= 0 || errs.indexOf('area-too-large') >= 0 ? t('errArea')
        : errs.indexOf('floors') >= 0 ? t('errFloors') : t('errTier');
      errEl.textContent = msg;
      errEl.hidden = false;
      $('results').hidden = true;
      state.lastEstimate = null;
      return;
    }
    errEl.hidden = true;
    var est = CC.estimate(inp, state.rates);
    state.lastEstimate = est;
    state.lastInput = inp;
    renderResults(est, inp);
    $('results').hidden = false;
    $('saveOk').hidden = true;
    $('saveError').hidden = true;
  }

  function renderResults(est, inp) {
    $('baseValue').textContent = fmt(est.basePaisa);
    $('extrasValue').textContent = fmt(est.extrasPaisa);
    $('grandValue').textContent = fmt(est.totalPaisa);
    $('resultMeta').textContent =
      num(est.totalArea) + ' ' + t('sqft') + ' \u00b7 ' + num(est.floors) + ' ' + t('floors') + ' \u00b7 ' +
      tierName(est.tier) + ' \u00b7 ' + fmt(est.ratePerSqft * 100) + ' ' + t('perSqft');
    $('factorNote').hidden = est.floors <= 1;
    if (est.floors > 1) $('factorNote').textContent = t('floorFactorNote') + ' (\u00d7' + est.floorFactor + ')';
    var catBody = $('catBody');
    catBody.innerHTML = '';
    est.categories.forEach(function (c) {
      var tr = document.createElement('tr');
      var td1 = document.createElement('td');
      td1.textContent = t('cat_' + c.id);
      var bar = document.createElement('div');
      bar.className = 'bar-wrap';
      var fill = document.createElement('div');
      fill.className = 'bar';
      fill.style.width = c.pct + '%';
      bar.appendChild(fill);
      td1.appendChild(bar);
      var td2 = document.createElement('td');
      td2.textContent = num(c.pct) + '%';
      var td3 = document.createElement('td');
      td3.textContent = fmt(c.paisa);
      tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
      catBody.appendChild(tr);
    });
    var phBody = $('phaseBody');
    phBody.innerHTML = '';
    est.phases.forEach(function (p) {
      var tr = document.createElement('tr');
      var td1 = document.createElement('td'); td1.textContent = t('ph_' + p.id);
      var td2 = document.createElement('td'); td2.textContent = num(p.pct) + '%';
      var td3 = document.createElement('td'); td3.textContent = fmt(p.paisa);
      tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
      phBody.appendChild(tr);
    });
    var matBody = $('matBody');
    matBody.innerHTML = '';
    est.materials.forEach(function (m) {
      var tr = document.createElement('tr');
      var td1 = document.createElement('td'); td1.textContent = t('mat_' + m.id);
      var td2 = document.createElement('td'); td2.textContent = num(m.qty) + ' ' + t('unit_' + m.unit);
      var td3 = document.createElement('td'); td3.textContent = fmt(m.unitPrice * 100);
      var td4 = document.createElement('td'); td4.textContent = fmt(m.paisa);
      tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3); tr.appendChild(td4);
      matBody.appendChild(tr);
    });
    $('matTotalValue').textContent = fmt(est.materialTotalPaisa);
  }

  function saveEstimate() {
    var errEl = $('saveError');
    var okEl = $('saveOk');
    errEl.hidden = true; okEl.hidden = true;
    if (!state.lastEstimate) { errEl.textContent = t('needCalcFirst'); errEl.hidden = false; return; }
    var name = $('saveName').value.trim();
    if (!name) { errEl.textContent = t('nameRequired'); errEl.hidden = false; return; }
    var rec = {
      id: 'est-' + Date.now().toString(36),
      name: name,
      area: state.lastInput.area,
      floors: state.lastInput.floors,
      tier: state.lastInput.tier,
      extras: state.lastInput.extras.slice(),
      totalPaisa: state.lastEstimate.totalPaisa,
      basePaisa: state.lastEstimate.basePaisa,
      createdAt: todayStr(),
    };
    if (!CC.validateSavedRecord(rec)) { errEl.textContent = t('needCalcFirst'); errEl.hidden = false; return; }
    state.saved.push(rec);
    persist();
    $('saveName').value = '';
    okEl.textContent = t('estimateSaved');
    okEl.hidden = false;
    renderSaved();
  }

  // ---------- Saved ----------
  function renderSaved() {
    var list = $('savedList');
    list.innerHTML = '';
    var total = 0;
    state.saved.forEach(function (rec) {
      total += rec.totalPaisa;
      var li = document.createElement('li');
      var nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = rec.name;
      var dt = document.createElement('span'); dt.className = 'dt';
      dt.textContent = rec.createdAt + ' \u00b7 ' + num(rec.totalArea || rec.area * rec.floors) + ' ' + t('sqft') + ' \u00b7 ' + tierName(rec.tier);
      var amt = document.createElement('span'); amt.className = 'amt'; amt.textContent = fmt(rec.totalPaisa);
      var load = document.createElement('button'); load.className = 'btn mini'; load.type = 'button';
      load.textContent = t('loadBtn');
      load.addEventListener('click', function () { loadSaved(rec); });
      var del = document.createElement('button'); del.className = 'btn mini'; del.type = 'button';
      del.textContent = t('deleteBtn');
      del.addEventListener('click', function () {
        if (window.confirm(t('confirmDelete'))) {
          state.saved = state.saved.filter(function (r) { return r.id !== rec.id; });
          persist(); renderSaved();
        }
      });
      li.appendChild(nm); li.appendChild(dt); li.appendChild(amt); li.appendChild(load); li.appendChild(del);
      list.appendChild(li);
    });
    $('savedEmpty').hidden = state.saved.length > 0;
    if (!state.saved.length) $('savedEmpty').textContent = t('savedEmpty');
    $('savedTotalValue').textContent = fmt(total);
  }

  function loadSaved(rec) {
    $('areaInput').value = rec.area;
    $('floorsInput').value = rec.floors;
    renderTierSelect();
    $('tierSelect').value = rec.tier;
    document.querySelectorAll('#extrasList input[type="checkbox"]').forEach(function (cb) {
      cb.checked = (rec.extras || []).indexOf(cb.value) >= 0;
    });
    $('saveName').value = rec.name;
    calculate();
    showTab('estimate');
    var m = $('loadedMsg');
    m.textContent = t('loadedMsg');
    m.hidden = false;
    setTimeout(function () { m.hidden = true; }, 4000);
  }

  // ---------- Rates form ----------
  function numInput(id, value, step) {
    var inp = document.createElement('input');
    inp.type = 'number'; inp.id = id; inp.value = value;
    inp.min = '0'; inp.step = step || '1'; inp.inputmode = 'decimal';
    return inp;
  }

  function renderRatesForm() {
    var tiers = $('tierRateFields');
    tiers.innerHTML = '';
    state.rates.tiers.forEach(function (tier) {
      var f = document.createElement('div'); f.className = 'field';
      var lab = document.createElement('label');
      lab.htmlFor = 'rate-tier-' + tier.id;
      lab.textContent = tierName(tier.id) + ' (' + t('perSqftShort') + ', BDT)';
      f.appendChild(lab);
      f.appendChild(numInput('rate-tier-' + tier.id, tier.rate));
      tiers.appendChild(f);
    });
    var splits = $('splitFields');
    splits.innerHTML = '';
    CC.DEFAULT_TIERS.forEach(function (tier) {
      var box = document.createElement('div'); box.className = 'split-tier';
      var h = document.createElement('h4'); h.textContent = tierName(tier.id);
      box.appendChild(h);
      var grid = document.createElement('div'); grid.className = 'split-grid';
      CC.CATEGORIES.forEach(function (cat) {
        var f = document.createElement('div'); f.className = 'field';
        var lab = document.createElement('label');
        lab.htmlFor = 'split-' + tier.id + '-' + cat;
        lab.textContent = t('cat_' + cat).split(' (')[0] + ' %';
        f.appendChild(lab);
        f.appendChild(numInput('split-' + tier.id + '-' + cat, state.rates.splits[tier.id][cat]));
        grid.appendChild(f);
      });
      box.appendChild(grid);
      splits.appendChild(box);
    });
    var phases = $('phaseFields');
    phases.innerHTML = '';
    state.rates.phases.forEach(function (p) {
      var f = document.createElement('div'); f.className = 'field';
      var lab = document.createElement('label');
      lab.htmlFor = 'phase-' + p.id;
      lab.textContent = t('ph_' + p.id) + ' %';
      f.appendChild(lab);
      f.appendChild(numInput('phase-' + p.id, p.pct));
      phases.appendChild(f);
    });
    var extras = $('extraFields');
    extras.innerHTML = '';
    state.rates.extras.forEach(function (ex) {
      var f = document.createElement('div'); f.className = 'field';
      var lab = document.createElement('label');
      lab.htmlFor = 'extra-' + ex.id;
      lab.textContent = t('ex_' + ex.id) + ' (BDT)';
      f.appendChild(lab);
      f.appendChild(numInput('extra-' + ex.id, ex.cost));
      extras.appendChild(f);
    });
    var mats = $('materialFields');
    mats.innerHTML = '';
    state.rates.materials.forEach(function (m) {
      var row = document.createElement('div'); row.className = 'mat-edit';
      var nm = document.createElement('div');
      nm.textContent = t('mat_' + m.id);
      nm.style.fontWeight = '600';
      var f1 = document.createElement('div'); f1.className = 'field';
      var l1 = document.createElement('label'); l1.htmlFor = 'mat-' + m.id + '-qty';
      l1.textContent = t('perSqftShort') + ' (' + t('unit_' + m.unit) + ')';
      f1.appendChild(l1); f1.appendChild(numInput('mat-' + m.id + '-qty', m.perSqft, '0.01'));
      var f2 = document.createElement('div'); f2.className = 'field';
      var l2 = document.createElement('label'); l2.htmlFor = 'mat-' + m.id + '-price';
      l2.textContent = t('unitPrice') + ' (BDT)';
      f2.appendChild(l2); f2.appendChild(numInput('mat-' + m.id + '-price', m.unitPrice));
      row.appendChild(nm); row.appendChild(f1); row.appendChild(f2);
      mats.appendChild(row);
    });
  }

  function readRatesForm() {
    var rates = CC.defaultRates();
    rates.tiers = state.rates.tiers.map(function (tier) {
      return { id: tier.id, rate: parseFloat($('rate-tier-' + tier.id).value) };
    });
    CC.DEFAULT_TIERS.forEach(function (tier) {
      CC.CATEGORIES.forEach(function (cat) {
        rates.splits[tier.id][cat] = parseFloat($('split-' + tier.id + '-' + cat).value);
      });
    });
    rates.phases = state.rates.phases.map(function (p) {
      return { id: p.id, pct: parseFloat($('phase-' + p.id).value) };
    });
    rates.extras = state.rates.extras.map(function (ex) {
      return { id: ex.id, cost: parseFloat($('extra-' + ex.id).value) };
    });
    rates.materials = state.rates.materials.map(function (m) {
      return {
        id: m.id, unit: m.unit,
        perSqft: parseFloat($('mat-' + m.id + '-qty').value),
        unitPrice: parseFloat($('mat-' + m.id + '-price').value),
      };
    });
    return rates;
  }

  function saveRates() {
    var rates = readRatesForm();
    var errs = CC.validateRates(rates);
    var errEl = $('ratesError');
    var okEl = $('ratesOk');
    errEl.hidden = true; okEl.hidden = true;
    document.querySelectorAll('#panel-rates input.invalid').forEach(function (i) { i.classList.remove('invalid'); });
    if (errs.length) {
      errEl.textContent = t('ratesError') + ' (' + errs.slice(0, 3).join(', ') + ')';
      errEl.hidden = false;
      return;
    }
    state.rates = rates;
    persist();
    okEl.textContent = t('ratesSaved');
    okEl.hidden = false;
    renderTierSelect();
    renderExtras();
  }

  function resetRates() {
    state.rates = CC.defaultRates();
    persist();
    renderRatesForm();
    renderTierSelect();
    renderExtras();
    $('ratesOk').textContent = t('ratesSaved');
    $('ratesOk').hidden = false;
  }

  // ---------- Data: export / import / erase ----------
  function exportPayload() { return CC.exportPayload(state.saved, state.rates); }

  function doExport() {
    var blob = new Blob([exportPayload()], { type: 'application/json' });
    var a = $('downloadLink');
    a.href = URL.createObjectURL(blob);
    a.hidden = false;
    a.click();
  }

  function importPayloadText(text) {
    var res = CC.importPayload(text);
    var okEl = $('importOk');
    var failEl = $('importFail');
    okEl.hidden = true; failEl.hidden = true;
    if (!res.ok) {
      failEl.textContent = t('importFail') + ' (' + res.error + ')';
      failEl.hidden = false;
      return res;
    }
    state.saved = res.data.saved;
    if (res.data.rates) state.rates = res.data.rates;
    persist();
    renderSaved();
    renderRatesForm();
    renderTierSelect();
    renderExtras();
    okEl.textContent = t('importOk');
    okEl.hidden = false;
    return res;
  }

  function eraseAll() {
    try {
      localStorage.removeItem(LS_LANG);
      localStorage.removeItem(LS_RATES);
      localStorage.removeItem(LS_SAVED);
    } catch (e) { /* ignore */ }
    state.saved = [];
    state.rates = CC.defaultRates();
    state.lastEstimate = null;
    state.lastInput = null;
    $('results').hidden = true;
    renderSaved();
    renderRatesForm();
    renderTierSelect();
    renderExtras();
  }

  // ---------- Wire up ----------
  document.querySelectorAll('.tab').forEach(function (b) {
    b.addEventListener('click', function () { showTab(b.dataset.tab); });
  });
  $('langBtn').addEventListener('click', function () {
    state.lang = state.lang === 'bn' ? 'en' : 'bn';
    persist();
    applyI18n();
  });
  $('estForm').addEventListener('submit', calculate);
  $('saveBtn').addEventListener('click', saveEstimate);
  $('saveRatesBtn').addEventListener('click', saveRates);
  $('resetRatesBtn').addEventListener('click', resetRates);
  $('exportBtn').addEventListener('click', doExport);
  $('importBtn').addEventListener('click', function () {
    importPayloadText($('importText').value);
  });
  $('eraseBtn').addEventListener('click', function () {
    var wrong = $('eraseWrong');
    var done = $('erasedMsg');
    wrong.hidden = true; done.hidden = true;
    if ($('eraseInput').value.trim() !== 'DELETE') {
      wrong.textContent = t('eraseWrong');
      wrong.hidden = false;
      return;
    }
    eraseAll();
    $('eraseInput').value = '';
    done.textContent = t('erasedMsg');
    done.hidden = false;
  });

  loadPersisted();
  renderRatesForm();
  applyI18n();

  // Test hooks (deterministic checks only; no secrets).
  window.__ccbd = {
    state: state,
    todayStr: todayStr,
    exportPayload: exportPayload,
    importPayload: importPayloadText,
    eraseAll: eraseAll,
    estimate: function (inp) { return CC.estimate(inp, state.rates); },
  };
})();
