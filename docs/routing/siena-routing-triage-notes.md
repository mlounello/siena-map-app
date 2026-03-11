# Siena Routing Triage Notes

## Purpose
This document is the working triage log for route-quality review across regression runs.

Use this file for case-by-case analysis, screenshots, interpretation, and follow-up decisions.
Keep the formal QA pass/fail workflow in:
- `docs/qa/guided-route-regression-checklist.md`

## How To Use
1. Run regression harness and capture latest outputs.
2. Use this doc to review flagged/watchlist cases in priority order.
3. Record evidence and a triage decision per case.
4. Link any blockers back to the checklist failure template and ticketing workflow.

## Primary References
- Regression summary: `docs/routing/siena-routing-regression-summary.latest.md`
- Regression output (full diagnostics): `docs/routing/siena-routing-regression-output.latest.json`
- Guided-route QA checklist: `docs/qa/guided-route-regression-checklist.md`

## Status Legend
- `acceptable`: route behavior is reasonable for current data/anchors.
- `suspicious`: route appears incorrect or unexpectedly poor.
- `needs map-data check`: likely OSM/path coverage/tagging issue.
- `needs anchor check`: likely endpoint/door-anchor placement issue.

## Current Review Order
1. `P04` Parking Lot to Chapel
2. `P09` Peripheral Walkway vs Road
3. `P05` Athletics to Student Center
4. `P10` Cross-Core Shortcut

---

## Reusable Per-Case Triage Template

```md
## Case Triage: <CASE_ID> - <LABEL>
- Priority:
- Review date:
- Reviewer:
- Environment:
- Fixture source: `docs/routing/siena-campus-test-pairs.json`

### A) Why this case is under review
- Classification: `ok | flagged`
- Trigger reason:
- Watchlist reason (if not flagged):

### B) Diagnostics snapshot
- direct_distance_meters:
- route_distance_meters:
- detour_ratio:
- snap_distance_meters_start:
- snap_distance_meters_end:
- flagged:
- flag_reasons:
- warnings:
- geometry_source:
- fallback_reason:
- provider/profile:

### C) Quick interpretation
- Likely anchor-placement influence: `low | medium | high`
- Likely OSM/path-data influence: `low | medium | high`
- Likely provider-acceptable behavior: `low | medium | high`
- Likely threshold-noise concern: `low | medium | high`

### D) Evidence captured
- Builder screenshot(s):
- Public map screenshot(s):
- Segment highlight screenshot (QA panel):
- Notes on nearby walkways/entrances/stairs:
- Any anchor-coordinate concerns (start/end):

### E) Triage decision
- Status: `acceptable | suspicious | needs map-data check | needs anchor check`
- Rationale:
- Follow-up owner:
- Follow-up action (no policy changes yet):
```

---

## Active Case Notes

### Case Triage: P04 - Parking Lot to Chapel
- Priority: medium
- Review date:
- Reviewer:
- Environment:
- Fixture source: `docs/routing/siena-campus-test-pairs.json`

### A) Why this case is under review
- Classification: `flagged`
- Trigger reason: `short_hop_detour_ratio_exceeds_threshold`, `short_hop_route_distance_exceeds_threshold`
- Watchlist reason (if not flagged): n/a

### B) Diagnostics snapshot
- direct_distance_meters: 192.972
- route_distance_meters: 604.128
- detour_ratio: 3.1307
- snap_distance_meters_start: 15.269
- snap_distance_meters_end: 24.240
- flagged: true
- flag_reasons:
  - short_hop_detour_ratio_exceeds_threshold
  - short_hop_route_distance_exceeds_threshold
- warnings:
  - short_hop
  - high_detour_ratio
  - guardrail_flagged
  - flag:short_hop_detour_ratio_exceeds_threshold
  - flag:short_hop_route_distance_exceeds_threshold
- geometry_source: provider
- fallback_reason: none
- provider/profile: mapbox / walking

### C) Quick interpretation
- Likely anchor-placement influence:
- Likely OSM/path-data influence:
- Likely provider-acceptable behavior:
- Likely threshold-noise concern:

### D) Evidence captured
- Builder screenshot(s):
- Public map screenshot(s):
- Segment highlight screenshot (QA panel):
- Notes on nearby walkways/entrances/stairs:
- Any anchor-coordinate concerns (start/end):

### E) Triage decision
- Status:
- Rationale:
- Follow-up owner:
- Follow-up action (no policy changes yet):

---

### Case Triage: P09 - Peripheral Walkway vs Road
- Priority: medium
- Review date:
- Reviewer:
- Environment:
- Fixture source: `docs/routing/siena-campus-test-pairs.json`

### A) Why this case is under review
- Classification: `ok`
- Trigger reason: n/a
- Watchlist reason (if not flagged): high detour ratio watchlist (`2.82`)

### B) Diagnostics snapshot
- direct_distance_meters: 295.694
- route_distance_meters: 834.992
- detour_ratio: 2.8241
- snap_distance_meters_start: 4.012
- snap_distance_meters_end: 4.053
- flagged: false
- flag_reasons: none
- warnings: none
- geometry_source: provider
- fallback_reason: none
- provider/profile: mapbox / walking

### C) Quick interpretation
- Likely anchor-placement influence:
- Likely OSM/path-data influence:
- Likely provider-acceptable behavior:
- Likely threshold-noise concern:

### D) Evidence captured
- Builder screenshot(s):
- Public map screenshot(s):
- Segment highlight screenshot (QA panel):
- Notes on nearby walkways/entrances/stairs:
- Any anchor-coordinate concerns (start/end):

### E) Triage decision
- Status:
- Rationale:
- Follow-up owner:
- Follow-up action (no policy changes yet):

---

### Case Triage: P05 - Athletics to Student Center
- Priority: medium
- Review date:
- Reviewer:
- Environment:
- Fixture source: `docs/routing/siena-campus-test-pairs.json`

### A) Why this case is under review
- Classification: `ok`
- Trigger reason: n/a
- Watchlist reason (if not flagged): moderate-high detour ratio watchlist (`2.10`)

### B) Diagnostics snapshot
- direct_distance_meters: 226.483
- route_distance_meters: 475.354
- detour_ratio: 2.0989
- snap_distance_meters_start: 3.023
- snap_distance_meters_end: 7.040
- flagged: false
- flag_reasons: none
- warnings:
  - short_hop
- geometry_source: provider
- fallback_reason: none
- provider/profile: mapbox / walking

### C) Quick interpretation
- Likely anchor-placement influence:
- Likely OSM/path-data influence:
- Likely provider-acceptable behavior:
- Likely threshold-noise concern:

### D) Evidence captured
- Builder screenshot(s):
- Public map screenshot(s):
- Segment highlight screenshot (QA panel):
- Notes on nearby walkways/entrances/stairs:
- Any anchor-coordinate concerns (start/end):

### E) Triage decision
- Status:
- Rationale:
- Follow-up owner:
- Follow-up action (no policy changes yet):

---

### Case Triage: P10 - Cross-Core Shortcut
- Priority: high
- Review date:
- Reviewer:
- Environment:
- Fixture source: `docs/routing/siena-campus-test-pairs.json`

### A) Why this case is under review
- Classification: `ok`
- Trigger reason: n/a
- Watchlist reason (if not flagged): high endpoint snap distance watchlist (end snap `41m`)

### B) Diagnostics snapshot
- direct_distance_meters: 147.412
- route_distance_meters: 242.500
- detour_ratio: 1.6451
- snap_distance_meters_start: 15.665
- snap_distance_meters_end: 40.617
- flagged: false
- flag_reasons: none
- warnings:
  - short_hop
- geometry_source: provider
- fallback_reason: none
- provider/profile: mapbox / walking

### C) Quick interpretation
- Likely anchor-placement influence:
- Likely OSM/path-data influence:
- Likely provider-acceptable behavior:
- Likely threshold-noise concern:

### D) Evidence captured
- Builder screenshot(s):
- Public map screenshot(s):
- Segment highlight screenshot (QA panel):
- Notes on nearby walkways/entrances/stairs:
- Any anchor-coordinate concerns (start/end):

### E) Triage decision
- Status:
- Rationale:
- Follow-up owner:
- Follow-up action (no policy changes yet):
```
