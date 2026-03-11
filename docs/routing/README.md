# Siena Routing QA Artifacts

This folder contains repeatable artifacts for Siena campus pedestrian routing QA and regression checks.

## Files
- `siena-campus-test-pairs.json`: routing fixture file.
  - Backward compatible: `pairs` remains supported.
  - New preferred shape: `cases` with optional per-case `mode`, `priority`, `tags`, and notes.
- `siena-routing-gap-report-template.md`: manual gap-report template.
- `siena-routing-regression-output.latest.json`: latest structured regression output (generated).
- `siena-routing-regression-summary.latest.md`: latest scan-friendly regression summary (generated).

## Regression runner (recommended)
Run against local API (default `http://localhost:3000`):

```bash
npm run routing:regression
```

Run against deployed API:

```bash
ROUTING_API_BASE_URL=https://sienamapapp.mlounello.com npm run routing:regression
```

Optional timestamped snapshot in addition to `.latest` files:

```bash
npm run routing:regression -- --snapshot
```

or

```bash
ROUTING_REGRESSION_SNAPSHOT=1 npm run routing:regression
```

The regression runner calls `/api/routing/segments` with debug enabled and outputs:
- per-case classification: `ok`, `flagged`, `fallback`, `error`
- routed/fallback/source status
- diagnostics fields (distances, detour ratio, snap distances, flag reasons, warnings)

## Legacy Mapbox audit (raw provider check)
This script still exists for direct Mapbox pair checks:

```bash
MAPBOX_ACCESS_TOKEN=your_token_here node scripts/run-campus-routing-audit.mjs
```

It writes:
- `docs/routing/siena-routing-audit-output.json`

## Re-run after routing or data changes
Use the same fixture IDs and compare prior vs new `.latest` outputs (or timestamped snapshots) to identify regressions.

For full guided-route behavior validation (anchors, internal transfers, publish checks, public/embed controls), use:
- `docs/qa/guided-route-regression-checklist.md`
