// construction-cost-bd -- node unit tests for logic.js (pure engine).
// Run: node --test tests/logic.test.js
// All expected values were hand-computed; see TEST_RESULTS.md.
const test = require('node:test');
const assert = require('node:assert/strict');
const CC = require('../logic.js');

const BDT = (taka) => Math.round(taka * 100); // BDT -> paisa

test('floorFactor: 1 floor = 1.00, 2 = 0.97, 3+ = 0.95', () => {
  assert.equal(CC.floorFactor(1), 1.0);
  assert.equal(CC.floorFactor(2), 0.97);
  assert.equal(CC.floorFactor(3), 0.95);
  assert.equal(CC.floorFactor(10), 0.95);
});

test('estimate: 1200 sqft x 2 floors, standard @2400 = \u09f355,87,200 base', () => {
  const est = CC.estimate({ area: 1200, floors: 2, tier: 'standard', extras: [] }, CC.defaultRates());
  assert.ok(est);
  assert.equal(est.totalArea, 2400);
  assert.equal(est.floorFactor, 0.97);
  assert.equal(est.basePaisa, BDT(5587200));
  assert.equal(est.totalPaisa, BDT(5587200));
  assert.equal(est.extrasPaisa, 0);
});

test('estimate: standard category split sums exactly to base', () => {
  const est = CC.estimate({ area: 1200, floors: 2, tier: 'standard', extras: [] }, CC.defaultRates());
  const byId = {};
  est.categories.forEach((c) => { byId[c.id] = c.paisa; });
  assert.equal(byId.structure, BDT(1955520)); // 35%
  assert.equal(byId.brickwork, BDT(838080)); // 15%
  assert.equal(byId.finishing, BDT(1117440)); // 20%
  assert.equal(byId.doors, BDT(558720)); // 10%
  assert.equal(byId.plumbing, BDT(558720)); // 10%
  assert.equal(byId.misc, BDT(558720)); // 10%
  const sum = est.categories.reduce((a, c) => a + c.paisa, 0);
  assert.equal(sum, est.basePaisa);
});

test('estimate: extras add flat cost; grand total = base + extras', () => {
  const est = CC.estimate({ area: 1200, floors: 2, tier: 'standard', extras: ['boundary', 'gate'] }, CC.defaultRates());
  assert.equal(est.extrasPaisa, BDT(210000)); // 150000 + 60000
  assert.equal(est.totalPaisa, BDT(5797200));
});

test('estimate: payment phases sum exactly to base', () => {
  const est = CC.estimate({ area: 1200, floors: 2, tier: 'standard', extras: [] }, CC.defaultRates());
  const byId = {};
  est.phases.forEach((p) => { byId[p.id] = p.paisa; });
  assert.equal(byId.foundation, BDT(838080)); // 15%
  assert.equal(byId.structure, BDT(1955520)); // 35%
  assert.equal(byId.brickwork, BDT(1117440)); // 20%
  assert.equal(byId.finishing, BDT(1117440)); // 20%
  assert.equal(byId.handover, BDT(558720)); // 10%
  const sum = est.phases.reduce((a, p) => a + p.paisa, 0);
  assert.equal(sum, est.basePaisa);
});

test('estimate: material thumb rules for 2400 sq ft total', () => {
  const est = CC.estimate({ area: 1200, floors: 2, tier: 'standard', extras: [] }, CC.defaultRates());
  const byId = {};
  est.materials.forEach((m) => { byId[m.id] = m; });
  assert.equal(byId.cement.qty, 960); // 0.40 x 2400
  assert.equal(byId.cement.paisa, BDT(528000)); // 960 x 550
  assert.equal(byId.steel.qty, 9600); // 4.0 x 2400
  assert.equal(byId.steel.paisa, BDT(912000)); // 9600 x 95
  assert.equal(byId.brick.qty, 19200); // 8 x 2400
  assert.equal(byId.brick.paisa, BDT(230400)); // 19200 x 12
  assert.equal(byId.sand.qty, 1800); // 0.75 x 2400
  assert.equal(byId.sand.paisa, BDT(99000)); // 1800 x 55
  assert.equal(byId.aggregate.qty, 2160); // 0.90 x 2400
  assert.equal(byId.aggregate.paisa, BDT(475200)); // 2160 x 220
  assert.equal(est.materialTotalPaisa, BDT(2244600));
});

test('estimate: 1000 sqft x 1 floor basic @1800 = \u09f318,00,000', () => {
  const est = CC.estimate({ area: 1000, floors: 1, tier: 'basic', extras: [] }, CC.defaultRates());
  assert.equal(est.basePaisa, BDT(1800000));
  const byId = {};
  est.categories.forEach((c) => { byId[c.id] = c.paisa; });
  assert.equal(byId.structure, BDT(684000)); // 38%
  assert.equal(byId.brickwork, BDT(288000)); // 16%
  assert.equal(byId.finishing, BDT(288000)); // 16%
  assert.equal(byId.doors, BDT(144000)); // 8%
  assert.equal(byId.plumbing, BDT(144000)); // 8%
  assert.equal(byId.misc, BDT(252000)); // 14%
});

test('estimate: 1500 sqft x 1 floor premium @3200 = \u09f348,00,000', () => {
  const est = CC.estimate({ area: 1500, floors: 1, tier: 'premium', extras: [] }, CC.defaultRates());
  assert.equal(est.basePaisa, BDT(4800000));
  const byId = {};
  est.categories.forEach((c) => { byId[c.id] = c.paisa; });
  assert.equal(byId.structure, BDT(1536000)); // 32%
  assert.equal(byId.brickwork, BDT(624000)); // 13%
  assert.equal(byId.finishing, BDT(1200000)); // 25%
  assert.equal(byId.doors, BDT(576000)); // 12%
  assert.equal(byId.plumbing, BDT(480000)); // 10%
  assert.equal(byId.misc, BDT(384000)); // 8%
});

test('estimate: 3 floors use 0.95 factor (custom standard rate 2000)', () => {
  const rates = CC.defaultRates();
  rates.tiers.find((t) => t.id === 'standard').rate = 2000;
  const est = CC.estimate({ area: 1000, floors: 3, tier: 'standard', extras: [] }, rates);
  assert.equal(est.basePaisa, BDT(5700000)); // 1000x3x2000x0.95
});

test('estimate: 100 sq ft material quantities', () => {
  const est = CC.estimate({ area: 100, floors: 1, tier: 'basic', extras: [] }, CC.defaultRates());
  const byId = {};
  est.materials.forEach((m) => { byId[m.id] = m; });
  assert.equal(byId.cement.qty, 40);
  assert.equal(byId.steel.qty, 400);
  assert.equal(byId.brick.qty, 800);
});

test('validateInputs rejects bad area/floors/tier/extras', () => {
  const R = CC.defaultRates();
  assert.ok(CC.validateInputs({ area: 0, floors: 1, tier: 'basic' }).length > 0);
  assert.ok(CC.validateInputs({ area: -5, floors: 1, tier: 'basic' }).length > 0);
  assert.ok(CC.validateInputs({ area: 100001, floors: 1, tier: 'basic' }).length > 0);
  assert.ok(CC.validateInputs({ area: 100, floors: 0, tier: 'basic' }).length > 0);
  assert.ok(CC.validateInputs({ area: 100, floors: 11, tier: 'basic' }).length > 0);
  assert.ok(CC.validateInputs({ area: 100, floors: 2.5, tier: 'basic' }).length > 0);
  assert.ok(CC.validateInputs({ area: 100, floors: 1, tier: 'luxury' }).length > 0);
  assert.ok(CC.validateInputs({ area: 100, floors: 1, tier: 'basic', extras: ['pool'] }).length > 0);
  assert.equal(CC.validateInputs({ area: 100, floors: 1, tier: 'basic', extras: [] }).length, 0);
  assert.equal(CC.estimate({ area: 0, floors: 1, tier: 'basic' }, R), null);
});

test('validateRates: defaults pass; bad splits/rates/phases fail', () => {
  assert.equal(CC.validateRates(CC.defaultRates()).length, 0);
  const badSplit = CC.defaultRates();
  badSplit.splits.standard.structure = 34; // sum 99
  assert.ok(CC.validateRates(badSplit).some((e) => e.startsWith('split-sum')));
  const badRate = CC.defaultRates();
  badRate.tiers[0].rate = -10;
  assert.ok(CC.validateRates(badRate).length > 0);
  const badPhase = CC.defaultRates();
  badPhase.phases[0].pct = 16; // sum 101
  assert.ok(CC.validateRates(badPhase).some((e) => e.startsWith('phase-sum')));
  const badMat = CC.defaultRates();
  badMat.materials[0].unitPrice = 0;
  assert.ok(CC.validateRates(badMat).length > 0);
});

test('distribute: exact sums, largest remainder', () => {
  assert.deepEqual(CC.distribute(100, [33, 33, 34]), [33, 33, 34]);
  assert.deepEqual(CC.distribute(10, [1, 1, 1]), [4, 3, 3]);
  assert.deepEqual(CC.distribute(0, [50, 50]), [0, 0]);
  const parts = CC.distribute(558720000, [35, 15, 20, 10, 10, 10]);
  assert.equal(parts.reduce((a, b) => a + b, 0), 558720000);
  assert.deepEqual(parts, [195552000, 83808000, 111744000, 55872000, 55872000, 55872000]);
});

test('formatBDT: lakh grouping, paisa, Bengali digits', () => {
  assert.equal(CC.formatBDT(558720000, 'en'), '\u09f355,87,200.00');
  assert.equal(CC.formatBDT(100, 'en'), '\u09f31.00');
  assert.equal(CC.formatBDT(0, 'en'), '\u09f30.00');
  assert.equal(CC.formatBDT(150, 'en'), '\u09f31.50');
  assert.equal(CC.formatBDT(558720000, 'bn'), '\u09f3\u09eb\u09eb,\u09ee\u09ed,\u09e8\u09e6\u09e6.\u09e6\u09e6');
  assert.equal(CC.formatBDT(21000000, 'bn'), '\u09f3\u09e8,\u09e7\u09e6,\u09e6\u09e6\u09e6.\u09e6\u09e6');
});

test('groupThousands: Bangladeshi lakh grouping', () => {
  assert.equal(CC.groupThousands('999'), '999');
  assert.equal(CC.groupThousands('1000'), '1,000');
  assert.equal(CC.groupThousands('100000'), '1,00,000');
  assert.equal(CC.groupThousands('5587200'), '55,87,200');
  assert.equal(CC.groupThousands('12345678'), '1,23,45,678');
});

test('toBnDigits converts ASCII digits', () => {
  assert.equal(CC.toBnDigits('123'), '\u09e7\u09e8\u09e9');
  assert.equal(CC.toBnDigits('1200 sq ft'), '\u09e7\u09e8\u09e6\u09e6 sq ft');
});

test('export/import round-trip; strict rejection', () => {
  const rec = {
    id: 'est-abc', name: 'Test house', area: 1200, floors: 2, tier: 'standard',
    extras: ['gate'], totalPaisa: BDT(5647200), basePaisa: BDT(5587200), createdAt: '2026-11-10',
  };
  assert.equal(CC.validateSavedRecord(rec), true);
  const payload = CC.exportPayload([rec], CC.defaultRates());
  const imp = CC.importPayload(payload);
  assert.equal(imp.ok, true);
  assert.equal(imp.data.saved[0].name, 'Test house');
  assert.equal(CC.importPayload('{"app":"train-schedule-bd","version":1,"saved":[]}').ok, false);
  assert.equal(CC.importPayload('{not json').ok, false);
  assert.equal(CC.importPayload('{"app":"construction-cost-bd","version":2,"saved":[]}').ok, false);
  const badRec = CC.importPayload(JSON.stringify({
    app: 'construction-cost-bd', version: 1,
    saved: [{ id: 'x', name: '', area: 0, floors: 1, tier: 'basic', extras: [], totalPaisa: 1, basePaisa: 1, createdAt: '2026-11-10' }],
  }));
  assert.equal(badRec.ok, false);
  const badRates = CC.importPayload(JSON.stringify({
    app: 'construction-cost-bd', version: 1, saved: [],
    rates: { tiers: [], splits: {}, phases: [], extras: [], materials: [] },
  }));
  assert.equal(badRates.ok, false);
});
