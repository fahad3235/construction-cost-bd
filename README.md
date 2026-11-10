# Construction Cost BD

Offline, bilingual (English / বাংলা) house construction cost estimator for Bangladesh. Pure static site — no server, no network requests, no account.

## Problem

A family planning a house in Bangladesh usually gets a single lump-sum quote from a contractor and has no way to check it: what does each part cost, how much should each construction stage cost, and how much cement, rod and brick will the job actually need? Construction Cost BD turns an area, floor count and quality tier into a transparent estimate — itemised by cost category, split into payment phases, and cross-checked against material quantities — with every rate editable so the estimate can be matched to real local prices.

## Features

- **Estimate** — built-up area per floor (sq ft), floors (1–10), quality tier (Basic ৳1,800 / Standard ৳2,400 / Premium ৳3,200 per sq ft, editable). Multi-floor discount: 2 floors ×0.97, 3+ floors ×0.95 (shared foundation & roof). Optional flat-cost extras: boundary wall, main gate, deep tube-well, septic tank, overhead water tank.
- **Cost breakdown** — six categories (structure, brickwork & plaster, finishing, doors & windows, plumbing & electrical, labour & misc) with per-tier percentage splits that must sum to 100%. Amounts use largest-remainder distribution in integer paisa, so the parts always sum exactly to the total.
- **Payment phases** — foundation & booking 15%, structure to roof 35%, brickwork & plaster 20%, finishing 20%, handover 10% (editable).
- **Material quantities** — thumb-rule quantities for the total built area (cement 0.40 bags, steel 4.0 kg, bricks 8 pcs, sand 0.75 cft, aggregate 0.90 cft per sq ft) priced at editable unit rates. Shown as a cross-check only: material cost is NOT added to the grand total, because it is already inside the per-sq-ft rate.
- **Rates tab** — every rate, split, phase, extra and material factor is editable, validated (splits and phases must each sum to 100%, all values positive) and persisted on the device, with reset-to-defaults.
- **Saved estimates** — name and save any estimate, load it back into the calculator, delete it, see the saved total. Persists in `localStorage`.
- **Data** — JSON export (download), import (pasted text) with strict validation (wrong app, version, bad record or bad rates rejected, existing data left intact), typed-DELETE erase-all.
- **Bilingual** — EN / বাংলা toggle, persisted; Bengali digits and Bangladeshi lakh grouping (৳55,87,200.00) throughout in BN mode.
- **Offline** — zero network requests at runtime; works from `file://` or any static host.

## Rates & sources

All default rates are **sample defaults, not live quotes** — see [DATA_NOTES.md](DATA_NOTES.md) for the basis of each number and what to verify before spending. The app ships empty: no estimate is pre-filled as a claim, and every screen carries the sample-rates / not-a-quotation disclaimer.

## Stack

- Vanilla HTML + CSS + JavaScript, no dependencies, no build step.
- `logic.js` — pure, node-testable engine (estimate math, validation, formatting, export/import) plus the default rate tables.
- `i18n.js` — English / Bengali strings. `app.js` — UI wiring and `localStorage` persistence.

## Prerequisites

Any modern browser. For the tests: Node.js 18+ (uses the built-in `node:test` runner) and a headless Chromium (the smoke test uses the cached `headless_shell` via raw CDP — no Puppeteer needed).

## Install & run

```bash
# No install step. Open directly:
open index.html
# or serve locally:
python3 -m http.server 8000
# then visit http://localhost:8000/
```

## Dev commands

```bash
node --test tests/logic.test.js   # 17 node unit tests
node tests/smoke.js               # 63 headless-Chrome checks (raw CDP)
```

## Testing

See [TEST_RESULTS.md](TEST_RESULTS.md) for the full results: 17/17 node unit tests and 63/63 headless-Chrome smoke checks pass, 0 console/page errors, 0 non-file network requests, 390px mobile with no horizontal overflow on any tab. Hand-verified values include the 1,200 sq ft × 2 floors Standard estimate (৳55,87,200), the Basic 1,000 sq ft single-floor estimate (৳18,00,000) and the Premium 1,500 sq ft estimate (৳48,00,000).

## Deployment

Static site — copy the folder to any static host, or enable GitHub Pages (main branch, root). No environment variables, no secrets, no backend.

## Limitations

- Rates are sample defaults: construction prices vary by district, season, supplier and soil conditions. Always confirm with a licensed engineer or contractor.
- Material quantities are thumb rules, not a structural design — a real estimate needs drawings and a soil test.
- No land cost, no approval/registration fees, no interior furnishing beyond the tier's finishing allowance.
- The multi-floor discount (0.97 / 0.95) is a stated assumption, not a measured market fact.
- Data lives only in the browser's `localStorage` — export JSON to back it up.

## Status

Complete MVP, tested (see TEST_RESULTS.md). Built 2026-11-10 as Muse Project Factory run #293.
