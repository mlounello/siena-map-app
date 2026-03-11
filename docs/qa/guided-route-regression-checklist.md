# Guided Route Regression Checklist

## Purpose
Use this checklist to validate guided-route behavior across anchors, internal stops, publish governance, and public/embed rendering.

This is a regression workflow document. It does not change routing policy, thresholds, or provider behavior.

## Usage Notes
- Run this checklist after changes to guided routes, POI anchors, publish validation, route rendering, or permissions-sensitive governance flows.
- Pair this checklist with routing diagnostics and regression outputs in `docs/routing/`.
- Record failures using the template in Section J and capture fixture/case IDs when available.

## Preconditions / Environment
- Application environment is reachable (local dev or deployed).
- Auth is working and at least one test account exists for each role under test:
  - `owner`
  - `super_admin`
  - `department_head`
  - `editor`
  - `viewer`
- At least one test map exists with:
  - POIs that have anchors
  - POIs that intentionally do not have anchors (internal stops)
  - A guided route with ordered stops
- `require_anchors_for_publish` can be toggled in map settings by allowed roles.
- If running routing regression harness:
  - `npm run routing:regression` (local)
  - or `ROUTING_API_BASE_URL=https://sienamapapp.mlounello.com npm run routing:regression` (deployed)

---

## A. Test Setup

- [ ] Identify test map ID/slug and confirm it has at least 5 stops with mixed anchored/unanchored POIs.
- [ ] Confirm one route contains this pattern:
  - anchored stop
  - unanchored internal stop
  - anchored continuation
- [ ] Confirm at least one stop near route boundaries (start or end) is unanchored for publish-block testing.
- [ ] Confirm map has at least one public/preview/embed-valid configuration.
- [ ] Record test metadata:
  - map ID
  - map slug
  - route ID/name
  - user role used
  - environment URL

---

## B. POI Authoring + Edit Lifecycle

- [ ] Create a new POI with normal metadata and map pin.
- [ ] Save and verify POI appears in POI manager and map.
- [ ] Reopen and edit the POI after each workflow state where applicable:
  - submitted
  - approved
  - published
- [ ] Verify edits persist and do not break route assignment/state.
- [ ] Confirm no client-side exceptions in create/edit lifecycle.

Expected Result:
- POIs can be created and edited across expected workflow states without losing map placement, category, or route association integrity.

---

## C. Door Anchor Behavior

- [ ] In builder, right-click to set door anchor for a POI.
- [ ] Verify draft anchor indicator appears before save.
- [ ] Save POI and confirm persisted anchor locus marker appears.
- [ ] Update anchor and verify new position is reflected after save.
- [ ] Confirm anchor visuals are internal/editor-only and not exposed as user-facing public stop markers.

Expected Result:
- Anchor interactions are stable, visible to editors during authoring, and persisted accurately.

---

## D. Guided Route Ordering

- [ ] Reorder guided route stops and save.
- [ ] Confirm explicit route connections regenerate from stop order.
- [ ] Confirm no duplicate-order failures occur.
- [ ] Confirm route rendering updates to the new order in builder and public route display.

Expected Result:
- Stop order is the source of truth and route segment generation remains deterministic.

---

## E. Anchored Continuity + Internal Stops

- [ ] Validate `anchored -> unanchored internal -> anchored` pattern in a route.
- [ ] Confirm unanchored internal stop remains listed in stop sequence.
- [ ] Confirm route line skips the unanchored internal stop (no fake internal line drawn).
- [ ] Confirm outdoor routed geometry resumes at next anchored stop.
- [ ] Confirm internal-transfer message appears where relevant.

Expected Result:
- Internal stops are represented in sequence and messaging, while geometry continuity is maintained only through anchors.

---

## F. Publish Validation (`require_anchors_for_publish`)

### When setting is OFF
- [ ] Attempt publish with mixed anchored/unanchored stops.
- [ ] Confirm publish follows existing behavior (no new anchor-only blocker).

### When setting is ON
- [ ] Attempt publish with valid continuity pattern (`anchored -> unanchored -> anchored`).
- [ ] Confirm publish is allowed for valid internal-stop continuity.
- [ ] Attempt publish with blocking case (for example, unanchored stop at start/end or missing anchored context).
- [ ] Confirm publish is blocked with structured `anchor_publish_validation_failed` response.
- [ ] Confirm blocker list shows:
  - title
  - stop number
  - reason

Expected Result:
- Validation blocks only true continuity-quality gaps, not all unanchored stops.

---

## G. Public Map Controls

- [ ] Open public map route in default explore state.
- [ ] Toggle `Show Route` / `Hide Route` and confirm state labels/messages are clear.
- [ ] If multiple route subsets/groups exist, select each option and verify route rendering updates correctly.
- [ ] Confirm compact map key/legend is visible, readable, and not intrusive.
- [ ] Confirm hidden/no-route states display intentional helper text.

Expected Result:
- Public route controls are understandable, visitor-friendly, and behaviorally accurate.

---

## H. Embed Behavior

- [ ] Open embed builder for a map and verify preview iframe resolves.
- [ ] Confirm preview uses slug-based embed route resolution (not map ID path mismatch).
- [ ] Confirm authenticated internal preview can render unpublished map where intended.
- [ ] Verify embed output/settings changes update preview as expected.

Expected Result:
- Embed preview and final embed behavior are consistent and free of 404 route-resolution errors.

---

## I. Permissions-Sensitive Actions

Validate both UI visibility and API enforcement.

### Role Validation Matrix (minimum checks)
- [ ] `owner`: can perform governance actions and role management with owner protection rules enforced.
- [ ] `super_admin`: can perform major governance actions but cannot modify existing owner role assignments.
- [ ] `department_head`: can manage scoped governance actions in department scope.
- [ ] `editor`: can perform contribution/edit actions in scope; cannot change governance-only settings.
- [ ] `viewer`: read-only; no governance mutation actions.

### Sensitive action checks
- [ ] Governance setting (`require_anchors_for_publish`) is editable only by allowed roles.
- [ ] Publish/approve/reject actions enforce scope checks server-side.
- [ ] UI does not expose misleading actions to blocked roles.
- [ ] API rejects blocked actions with clear error responses.

Expected Result:
- UI and backend enforcement are aligned, and sensitive actions are consistently role-gated.

---

## J. Regression Harness Tie-In

- [ ] Run routing regression harness (`npm run routing:regression`) in target environment.
- [ ] Review:
  - `docs/routing/siena-routing-regression-output.latest.json`
  - `docs/routing/siena-routing-regression-summary.latest.md`
- [ ] Confirm flagged/fallback/error cases are logged for follow-up.
- [ ] Attach relevant fixture case IDs to failure notes.

Expected Result:
- Harness outputs are used as repeatable evidence during regression review.

### Failure Logging Template

```md
## Regression Failure Entry
- Date:
- Environment:
- Map ID / Slug:
- Route ID / Name:
- User Role:
- Checklist Section:
- Scenario:
- Expected:
- Actual:
- Routing Case ID (if applicable):
- Diagnostics Snapshot (key values):
  - flagged:
  - flag_reasons:
  - geometry_source:
  - fallback_reason:
  - direct_distance_meters:
  - route_distance_meters:
  - detour_ratio:
  - snap_distance_meters_start:
  - snap_distance_meters_end:
  - warnings:
- Console/API Errors:
- Repro Steps:
- Status:
```

---

## K. Signoff

- [ ] All required sections (A-I) completed.
- [ ] Any failures documented using the template in Section J.
- [ ] Blockers triaged with owner and priority.
- [ ] Regression harness outputs attached to review ticket or QA record.
- [ ] Final decision:
  - [ ] Pass
  - [ ] Pass with known non-blocking issues
  - [ ] Fail

Signoff:
- Reviewer:
- Date:
- Environment:
- Notes:
