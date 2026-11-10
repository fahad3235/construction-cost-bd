# TEST_RESULTS.md — construction-cost-bd (run #293, 12:00 slot, 2026-11-10)

## Suites run (real, not invented)

| Suite | Command | Result |
|---|---|---|
| Node logic tests | `node --test tests/logic.test.js` | **17/17 pass** |
| Headless-Chrome smoke | `node tests/smoke.js` (raw CDP, headless_shell-1187) | **63/63 checks pass** |
| ASCII-source check | `grep -rP '[^\x00-\x7F]' --include='*.js' --include='*.css' --include='*.html' .` | **0 matches** (exit 1 = no matches) |

## Hand-verified values

- 1,200 sq ft × 2 floors, Standard @ ৳2,400/sq ft, factor 0.97 → base ৳55,87,200
  (1,200 × 2 × 2,400 × 0.97). Categories: structure 35% ৳19,55,520; brickwork 15% ৳8,38,080;
  finishing 20% ৳11,17,440; doors 10% ৳5,58,720; plumbing 10% ৳5,58,720; misc 10% ৳5,58,720;
  parts sum exactly to the base. Phases: foundation 15% ৳8,38,080; structure 35% ৳19,55,520;
  brickwork 20% ৳11,17,440; finishing 20% ৳11,17,440; handover 10% ৳5,58,720.
- Extras boundary ৳1,50,000 + gate ৳60,000 = ৳2,10,000 → grand total ৳57,97,200.
- Materials for 2,400 sq ft total: cement 960 bags × ৳550 = ৳5,28,000; steel 9,600 kg × ৳95
  = ৳9,12,000; bricks 19,200 × ৳12 = ৳2,30,400; sand 1,800 cft × ৳55 = ৳99,000;
  aggregate 2,160 cft × ৳220 = ৳4,75,200; subtotal ৳22,44,600.
- 1,000 sq ft × 1 floor, Basic @ ৳1,800 → ৳18,00,000. Categories: structure 38% ৳6,84,000;
  brickwork 16% ৳2,88,000; finishing 16% ৳2,88,000; doors 8% ৳1,44,000; plumbing 8% ৳1,44,000;
  misc 14% ৳2,52,000.
- 1,500 sq ft × 1 floor, Premium @ ৳3,200 → ৳48,00,000. Categories: structure 32% ৳15,36,000;
  brickwork 13% ৳6,24,000; finishing 25% ৳12,00,000; doors 12% ৳5,76,000; plumbing 10% ৳4,80,000;
  misc 8% ৳3,84,000.
- 3 floors with a custom Standard rate of ৳2,000 → 1,000 × 3 × 2,000 × 0.95 = ৳57,00,000.
- Money formatting: 558,720,000 paisa → `৳55,87,200.00` (lakh grouping); BN mode →
  `৳৫৫,৮৭,২০০.০০`. `distribute(10, [1,1,1])` → `[4,3,3]` (largest remainder).
- Smoke: defaults (area 1,200 / floors 2 / standard / 5 extras); area-0 inline error hides
  results; edited Standard rate ৳2,400 → ৳3,000 gives ৳69,84,000, reset restores ৳55,87,200;
  split sum 99 rejected, fixed to 100 saves; save → Saved tab shows the record, persists
  across reload, loads back into the calculator; export → erase → import round-trip restores
  the record; wrong-app and bad-JSON imports rejected with data intact; typed-DELETE erase
  works, wrong word rejected; BN toggle renders Bengali title + digits and persists;
  390px has zero horizontal overflow on all four tabs; zero non-file network requests;
  zero console/page errors.

## Repairs made

None. Both suites passed on the first run (17/17 node, 63/63 smoke) with no app-code
changes after the ASCII-escape pass; the escape pass itself was re-verified by re-running
both suites (17/17, 63/63).
