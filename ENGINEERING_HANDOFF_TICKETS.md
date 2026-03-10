# Developer Handoff Version, with Acceptance Criteria and Engineering Tickets

## Epic 1: Routing Diagnostics

### Goal
Expose enough segment-level information to explain route behavior, diagnose detours, and support future QA tooling.

### Scope
Add diagnostics to `/api/routing/segments`, routing service logic, and provider-normalized output.

### Required Diagnostic Fields
Per segment, return or log:
- `segment_id`
- `requested_from`
- `requested_to`
- `snapped_from`
- `snapped_to`
- `snap_distance_meters_start`
- `snap_distance_meters_end`
- `provider`
- `profile`
- `geometry_source` (`provider` or `straight_line_fallback`)
- `fallback_reason`
- `route_distance_meters`
- `direct_distance_meters`
- `detour_ratio`
- `duration_seconds`
- `warnings` (array)

### Acceptance Criteria
- Every routed segment returns normalized diagnostic metadata.
- Fallback segments clearly indicate fallback source and reason.
- Diagnostics are available both in API response and server logs, or behind a debug mode if needed.
- Geometry response shape remains stable and backward-compatible for current consumers.

### Suggested File Touchpoints
- `src/app/api/routing/segments/route.ts`
- `src/lib/routing/service.ts`
- `src/lib/routing/provider.ts`
- `src/lib/routing/providers/mapbox.ts`
- `src/types/siena-maps.ts`

### Notes
Keep provider-specific behavior isolated in the provider layer. Do not leak Mapbox-specific response shapes to API consumers.

---

## Epic 2: Short-Hop Detour Guardrails

### Goal
Detect routing outcomes that are obviously unreasonable for short campus hops and surface them for QA or fallback handling.

### Scope
Introduce deterministic rules that flag suspicious route results.

### Candidate Guardrail Rules
For short-hop segments, flag when:
- direct distance is below a defined threshold and detour ratio exceeds a threshold
- snap distance at either endpoint exceeds a threshold
- route distance exceeds a max distance for a local campus connection
- provider returns no geometry and fallback is used

### Suggested Initial Thresholds
These should be constants, not hardcoded inline:
- `SHORT_HOP_MAX_DIRECT_DISTANCE_METERS`
- `MAX_ALLOWED_SHORT_HOP_DETOUR_RATIO`
- `MAX_SNAP_DISTANCE_METERS`
- `MAX_SHORT_HOP_ROUTE_DISTANCE_METERS`

### Acceptance Criteria
- Suspicious short-hop segments are flagged deterministically.
- Flags are returned in diagnostics as warnings or QA markers.
- Rules are centralized and tunable.
- No existing working route flow is blocked by default unless a fallback policy is intentionally enabled.

### Suggested File Touchpoints
- `src/lib/routing/service.ts`
- `src/types/siena-maps.ts`

---

## Epic 3: Builder Route QA Panel

### Goal
Give internal users a way to see which route segments are suspicious, why they were flagged, and whether fallback occurred.

### Scope
Add a QA surface in the builder or routes admin UI.

### Minimum UX Requirements
- Segment list with stop-to-stop labeling
- Visual status for normal, flagged, fallback
- Display of core diagnostics:
  - direct distance
  - route distance
  - detour ratio
  - snap distances
  - fallback reason
- Click or hover behavior to identify the corresponding segment on the map

### Acceptance Criteria
- QA panel renders segment-level diagnostic output from the routing API.
- Flagged detour-risk segments are visually distinct.
- Fallback segments clearly show fallback reason.
- Panel works without breaking existing route authoring flow.
- No client exceptions on route admin page.

### Suggested File Touchpoints
- `src/app/dashboard/maps/[id]/routes/page.tsx`
- `src/components/map/internal-builder-map.tsx`
- Any shared internal UI primitives used for status rows/cards

---

## Epic 4: Require Anchors for Publish

### Goal
Allow maps to enforce anchor completeness before publish.

### Product Rule
Recommended interpretation:
- Only POIs included in the active guided route must have anchors when this setting is enabled.

This avoids penalizing unrelated POIs and keeps the rule tied to routing quality.

### Scope
Add a map-level setting and publish-time validation.

### Required Behavior
- New map setting: `require_anchors_for_publish`
- If enabled, publish fails when any POI in the active guided route lacks required routing anchors
- Validation response should identify exactly which POIs are blocking publish

### Acceptance Criteria
- Map setting can be stored and edited.
- Publish validation checks only guided-route POIs, not all POIs globally.
- Error messaging is explicit and actionable.
- Existing maps without the setting enabled behave unchanged.

### Suggested File Touchpoints
- Map settings schema / API layer
- Publish validation flow
- Dashboard map settings UI
- `src/types/siena-maps.ts`

---

## Epic 5: Regression Checklist for Guided Route + Anchors + Transfers

### Goal
Create a repeatable validation flow that prevents regressions across the current routing model.

### Required Test Scenarios
- anchored external to anchored external
- anchored external to internal non-anchored
- internal non-anchored to anchored external
- multiple consecutive non-anchored internal POIs
- internal transfer note present and visible
- anchor update reflected in regenerated route
- stop reorder regenerates route connections correctly
- public map route toggle works
- grouped route selection works
- preview and embed behave consistently

### Acceptance Criteria
- Checklist exists in repo docs, QA docs, or ticketing workflow
- Checklist covers internal builder, preview, public, and embed surfaces
- Known problematic route cases are explicitly recorded

---

## Epic 6: Permissions Matrix Audit

### Goal
Confirm edit, archive, and publish actions behave correctly across roles and modules.

### Scope
Audit current behavior for:
- owner
- super_admin
- department_head
- editor
- viewer

Across:
- maps
- POIs
- guided routes
- route connections
- moderation actions
- publish/archive flows

### Acceptance Criteria
- Explicit matrix exists for allowed/blocked actions
- Edge-case inconsistencies are documented
- Any mismatches between intended and actual behavior are ticketed

---

## Epic 7: Public Map Route Control Polish

### Goal
Improve clarity of route display controls without changing core behavior.

### Scope
Polish:
- route legend
- route grouping labels
- active/inactive route selection states
- route toggle clarity in explore mode

### Acceptance Criteria
- Users can clearly understand whether routes are hidden, fully shown, or filtered
- Control labels are plain-language and unambiguous
- Visual states match the shared public UI system

---

## Proposed Ticket Order

### Ticket 1
**Title:** Add normalized routing diagnostics to segment API  
**Depends on:** none

### Ticket 2
**Title:** Add short-hop detour guardrail evaluation to routing service  
**Depends on:** Ticket 1

### Ticket 3
**Title:** Add builder route QA panel for flagged and fallback segments  
**Depends on:** Tickets 1 and 2

### Ticket 4
**Title:** Add map setting for required anchors on publish  
**Depends on:** none

### Ticket 5
**Title:** Enforce guided-route anchor validation in publish flow  
**Depends on:** Ticket 4

### Ticket 6
**Title:** Create guided-route regression checklist covering anchors and transfers  
**Depends on:** Tickets 1 through 5 preferred

### Ticket 7
**Title:** Audit role permissions for edit, archive, and publish flows  
**Depends on:** none

### Ticket 8
**Title:** Complete pass-2 UI consistency on remaining admin and ops pages  
**Depends on:** none

### Ticket 9
**Title:** Polish public map route legend and selection controls  
**Depends on:** none

---

## Recommended Definition of Done for This Phase

This phase should be considered complete when:
- routing diagnostics are implemented and consumable
- detour-risk segments can be identified deterministically
- builder QA surfaces flagged route behavior
- publish validation can enforce anchor requirements
- regression checklist exists and is used
- no blocking client errors remain across route-related screens
- remaining UI inconsistencies are non-blocking rather than structural
