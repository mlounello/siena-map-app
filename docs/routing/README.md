# Campus Routing Audit (Phase 0)

This folder contains repeatable artifacts for Siena campus pedestrian routing QA.

## Files
- `siena-campus-test-pairs.json`: fixed origin/destination test pairs.
- `siena-routing-gap-report-template.md`: manual gap-report template.

## Run the audit
```bash
MAPBOX_ACCESS_TOKEN=your_token_here node scripts/run-campus-routing-audit.mjs
```

The script writes:
- `docs/routing/siena-routing-audit-output.json`

Then copy results into `siena-routing-gap-report-template.md` and classify:
- missing geometry
- tagging issue
- access restriction
- provider behavior

## Re-run after OSM edits
Use the same fixture file and command to compare before/after behavior for the same pair IDs.

