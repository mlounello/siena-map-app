# Siena Campus Routing Gap Report

Date: `YYYY-MM-DD`  
Provider: `Mapbox Directions (walking)`  
Fixture: `docs/routing/siena-campus-test-pairs.json`

## Summary
- Total test pairs: `N`
- Routed successfully: `N`
- Fallback/failed routes: `N`
- High-priority issues: `N`

## Findings by Pair
| Pair ID | Label | Result | Data Issue Type | Notes | Action |
|---|---|---|---|---|---|
| P01 | Main Gate to Foy Hall | Routed / Fallback | Missing path / bad tag / access | ... | OSM edit / verify |

Use `Result` values:
- `Routed: good`
- `Routed: poor path choice`
- `Fallback: straight`

Use `Data Issue Type` values:
- `missing_geometry`
- `bad_tagging`
- `access_restriction`
- `provider_behavior`
- `unknown`

## Priority OSM Fix List
1. `...`
2. `...`
3. `...`

## Re-test Notes
- Re-run command:  
  `MAPBOX_ACCESS_TOKEN=... node scripts/run-campus-routing-audit.mjs`
- Compare prior and current output for the same fixture IDs.

