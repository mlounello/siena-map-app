# Siena Routing Regression Summary

Generated: 2026-03-11T07:33:55.729Z
Fixture: docs/routing/siena-campus-test-pairs.json
API Base URL: https://sienamapapp.mlounello.com
Cases: 10

## Classification Counts

- ok: 9
- flagged: 1
- fallback: 0
- error: 0

## Attention Items

- P04 (flagged) Parking Lot to Chapel
  - source: mapbox | fallback: none (n/a)
  - direct: 193m | route: 604m | detour: 3.13
  - snap start/end: 15m / 24m
  - flag reasons: short_hop_detour_ratio_exceeds_threshold, short_hop_route_distance_exceeds_threshold
  - warnings: short_hop, high_detour_ratio, guardrail_flagged, flag:short_hop_detour_ratio_exceeds_threshold, flag:short_hop_route_distance_exceeds_threshold

## Per-Case Table

| ID | Classification | Source | Direct | Route | Detour | Snap Start | Snap End | Flag Reasons |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P01 | ok | mapbox | 201m | 238m | 1.19 | 19m | 6m | none |
| P02 | ok | mapbox | 96m | 173m | 1.81 | 4m | 24m | none |
| P03 | ok | mapbox | 230m | 297m | 1.30 | 8m | 7m | none |
| P04 | flagged | mapbox | 193m | 604m | 3.13 | 15m | 24m | short_hop_detour_ratio_exceeds_threshold, short_hop_route_distance_exceeds_threshold |
| P05 | ok | mapbox | 226m | 475m | 2.10 | 3m | 7m | none |
| P06 | ok | mapbox | 243m | 339m | 1.39 | 26m | 4m | none |
| P07 | ok | mapbox | 162m | 236m | 1.46 | 4m | 12m | none |
| P08 | ok | mapbox | 62m | 27m | 0.43 | 34m | 13m | none |
| P09 | ok | mapbox | 296m | 835m | 2.82 | 4m | 4m | none |
| P10 | ok | mapbox | 147m | 243m | 1.64 | 16m | 41m | none |
