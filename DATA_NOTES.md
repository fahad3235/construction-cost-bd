# DATA_NOTES.md — construction-cost-bd (run #293, 2026-11-10)

## What the numbers are

Every rate in this app is a **sample default** that the user can edit in the Rates tab.
Nothing here is a live market quote, and the app says so on every screen
(sample-rates / not-a-quotation disclaimer + footer note).

## Default rate tables and their basis

- **Per-sq-ft tier rates — Basic ৳1,800, Standard ৳2,400, Premium ৳3,200.**
  Basis: commonly quoted late-2026 Bangladesh construction-cost bands for a
  standard residential building (structure + finishing, excluding land).
  They are round-number planning bands, not a surveyed price list.
  Verify with a local contractor/engineer before spending.
- **Category splits per tier** (structure / brickwork / finishing / doors & windows /
  plumbing & electrical / labour & misc). Basis: conventional cost-breakdown
  proportions for Bangladeshi residential construction (structure the largest share,
  finishing share rising with tier). Stated assumptions, editable.
- **Payment phases** — 15 / 35 / 20 / 20 / 10. Basis: the usual stage-payment pattern
  (booking + foundation, structure to roof, brickwork + plaster, finishing, handover).
  Stated assumption, editable.
- **Extras (flat BDT)** — boundary wall ৳1,50,000; main gate ৳60,000; deep tube-well
  ৳45,000; septic tank ৳80,000; overhead water tank ৳35,000. Round-number planning
  allowances, not quotes. Editable.
- **Material thumb rules (per sq ft of total built area)** — cement 0.40 bags, steel
  4.0 kg, bricks 8 pcs, sand 0.75 cft, aggregate 0.90 cft. Basis: widely used
  Bangladeshi thumb rules for residential RCC construction (per 100 sq ft ≈ 40 bags
  cement, 400 kg steel, 800 bricks). Labelled thumb rules in the UI.
- **Material unit prices** — cement ৳550/bag, steel ৳95/kg, brick ৳12/pc, sand
  ৳55/cft, aggregate ৳220/cft. Round-number sample prices for late 2026; editable.
- **Multi-floor factor** — 1 floor ×1.00, 2 floors ×0.97, 3+ floors ×0.95.
  Assumption: foundation and roof costs are shared across floors, so the per-sq-ft
  cost falls slightly. Stated in the UI whenever it applies; editable only by
  changing the tier rate (the factor itself is fixed logic — see Limitations).

## What is NOT in the estimate

Land cost, RAJUK/city-corporation approval and registration fees, soil test,
architectural/structural design fees, and interior furnishing beyond the tier's
finishing allowance. The material subtotal is a cross-check only and is never added
to the grand total (materials are already inside the per-sq-ft rate).

## Verification status

- No live prices were fetched: the app makes zero network requests by design.
- All arithmetic in TEST_RESULTS.md was hand-verified from the stated rates.
- If a future run re-bases these defaults on a published price survey, record the
  source and date here.
