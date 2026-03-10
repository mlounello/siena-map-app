# Siena Campus Routing Gap Report (Initial)

Date: `2026-03-10`  
Provider: `Mapbox Directions (walking)`  
Fixture: `docs/routing/siena-campus-test-pairs.json`

## Status
- Fixture and audit tooling are now in-repo.
- Initial run pending your production/validated coordinates review.
- Re-run command: `MAPBOX_ACCESS_TOKEN=... node scripts/run-campus-routing-audit.mjs`

## Next Actions
1. Verify fixture coordinates against exact Siena campus POIs/entrances.
2. Run the audit script.
3. Populate findings using `docs/routing/siena-routing-gap-report-template.md`.
4. Patch OSM for highest-impact missing/mis-tagged connectors.
5. Re-run the same fixture and compare before/after results.

