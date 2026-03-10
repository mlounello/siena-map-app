# Siena Maps Implementation Guide, v2

## Purpose

This document defines the current implementation state of Siena Maps, what is complete, what is actively being hardened, and what is intentionally deferred.

It is designed to align product, design, and engineering around the current build and the next execution steps.

---

## Current State Summary

- Guided route authoring is now based on stop order, not manual segment drawing.
- Door-anchor routing and internal-transfer behavior are implemented.
- Public maps start in explore mode, with route visibility controlled by the user.
- The main remaining product risk is route quality on short campus paths.
- The current execution focus is routing diagnostics, detour guardrails, publish validation, and final UI consistency.

---

## Current Priority

Stabilize and harden guided-route quality for campus use while closing remaining UI consistency and validation gaps.

---

## Program Goals

1. Deliver a production-ready, Siena-branded map publishing platform.
2. Support internal governance workflows, including roles, approvals, and moderation.
3. Support polished public map experiences and embeds.
4. Support guided routing that follows campus pathways with reliable fallback behavior.

---

## Locked Product Decisions

These decisions are active and should be treated as settled unless explicitly reopened.

1. Guided route authoring is stop-order based, not manual per-segment drawing.
2. Public map experience starts in explore mode, with route visibility toggled by the user.
3. POI stop order is route-managed, not manually edited in the POI form.
4. Door anchors are used to improve routing quality:
   - POIs may have optional door-anchor coordinates.
   - Route lines are drawn only between anchored POIs.
   - Non-anchored internal POIs remain visible and listed, but do not force line rendering.
5. Routing MVP uses the Mapbox walking profile behind a provider abstraction.
6. Straight-line fallback remains in place for routing resilience.

---

## Product Behavior (Current)

### Guided Routes

- A primary guided route is authored by ordering stops.
- Saving route order regenerates explicit route connections.
- Route rendering follows anchored POI connections.

### Internal vs External Stops

- Internal or non-anchored POIs remain visible in lists and route flow.
- Route lines skip non-anchored POIs and connect the nearest anchored neighbors.
- Internal transfer notes are surfaced where relevant.

### Public Map

- Public maps start in explore mode.
- Users can toggle route visibility with Show Route and Hide Route.
- When routes are displayed, users can choose which route grouping to view.

### POI Authoring

- POIs can be reopened and edited after submit, approve, or publish.
- The builder supports right-click to set a door anchor.
- The builder shows persisted anchor locus points and a draft anchor point before save.

---

## Implementation Details (Current)

### Routing Stack

- Server-side routing layer with provider abstraction.
- Batch routing endpoint: `/api/routing/segments`
- Mapbox walking profile for snapped pedestrian routing.
- GeoJSON normalization and fallback handling in the routing flow.
- Diagnostics contract is stable across routed and fallback segments.
- `detour_ratio` is intentionally suppressed for tiny direct distances (`< 5m`) to avoid noisy values.
- Deterministic guardrail fields are included in diagnostics: `short_hop`, `flagged`, `flag_reasons`.

### Data Model Highlights

- `pois.route_anchor_lat`
- `pois.route_anchor_lng`
- `route_connections.connection_type` (`outdoor_routed | internal_transfer`)
- `route_connections.transfer_note`

### UI System

- Visual foundation migrated toward the Alcohol Origins quality bar.
- Header and nav architecture stabilized.
- Shared UI primitives are being used across core internal and public screens.

---

## Key Architecture Surfaces / Important Files

### Routing and Guided Route Logic

- `/Users/mikelounello/siena-map-app/src/app/api/routing/segments/route.ts`
- `/Users/mikelounello/siena-map-app/src/lib/routing/provider.ts`
- `/Users/mikelounello/siena-map-app/src/lib/routing/service.ts`
- `/Users/mikelounello/siena-map-app/src/lib/routing/providers/mapbox.ts`
- `/Users/mikelounello/siena-map-app/src/app/api/guided-routes/route.ts`
- `/Users/mikelounello/siena-map-app/src/app/api/guided-routes/[id]/stops/route.ts`

### Route and POI APIs

- `/Users/mikelounello/siena-map-app/src/app/api/pois/route.ts`
- `/Users/mikelounello/siena-map-app/src/app/api/pois/[id]/route.ts`
- `/Users/mikelounello/siena-map-app/src/app/api/route-connections/route.ts`
- `/Users/mikelounello/siena-map-app/src/app/api/route-connections/[id]/route.ts`

### Internal and Public Map UI

- `/Users/mikelounello/siena-map-app/src/app/dashboard/maps/[id]/routes/page.tsx`
- `/Users/mikelounello/siena-map-app/src/app/dashboard/maps/[id]/pois/page.tsx`
- `/Users/mikelounello/siena-map-app/src/components/map/internal-builder-map.tsx`
- `/Users/mikelounello/siena-map-app/src/components/map/public-leaflet-map.tsx`
- `/Users/mikelounello/siena-map-app/src/components/public/public-map-shell.tsx`

### Public / Preview / Embed Surfaces

- `/Users/mikelounello/siena-map-app/src/app/maps/[slug]/page.tsx`
- `/Users/mikelounello/siena-map-app/src/app/api/public/maps/[slug]/route.ts`
- `/Users/mikelounello/siena-map-app/src/app/dashboard/maps/[id]/preview/page.tsx`
- `/Users/mikelounello/siena-map-app/src/app/embed/[slug]/page.tsx`

### Schema / Migrations

- `/Users/mikelounello/siena-map-app/supabase/migrations/007_guided_routes_model.sql`
- `/Users/mikelounello/siena-map-app/supabase/migrations/008_guided_routes_trigger_hotfix.sql`
- `/Users/mikelounello/siena-map-app/supabase/migrations/009_route_anchors_and_internal_transfers.sql`

### Types

- `/Users/mikelounello/siena-map-app/src/types/siena-maps.ts`

---

## Completed Work

### A) Foundation / Platform

Implemented:

- Next.js + Supabase app scaffold with internal/public route split
- Google auth flow stabilized
- Role model wired (`owner`, `super_admin`, `department_head`, `editor`, `viewer`)
- Owner/admin bootstrap path added
- Core entities and APIs wired for maps, POIs, departments, categories, users, and embeds
- Review queue and moderation actions implemented

### B) UI System / Product Shell

Implemented:

- Batch 1 visual foundation migration completed
- Header and nav architecture refactored and stabilized
- Contrast and active-state issues fixed
- Shared primitives standardized across core screens
- Public/internal shell consistency significantly improved

### C) Map Styles / Routing Infrastructure

Implemented:

- Multiple map style presets added
- Routing abstraction introduced server-side
- Batch routing endpoint added
- Mapbox walking profile integrated for snapped pedestrian routing
- Straight-line fallback retained for resilience
- Routing audit artifacts and fixtures added for Siena campus QA

### D) Guided Route Authoring Model

Implemented:

- Shifted from manual line-item route editing to guided-route stop ordering
- Primary guided route plus ordered-stop model added
- Route-order save regenerates explicit route connections
- Duplicate order-index issues removed with new flow

### E) Door Anchor + Internal / External Handling

Implemented:

- Added POI door-anchor fields
- Builder supports right-click to set door anchor
- Builder shows persisted anchor locus points
- Builder shows draft anchor point before save
- Internal or non-anchored POIs remain in stop list
- Route lines connect anchored POIs and skip non-anchored internal POIs
- Internal transfer messaging appears in public stops panel when relevant
- Editable stop-number input removed from POI form

### F) POI Editing UX

Implemented:

- POIs can be reopened and edited after submit, approve, or publish
- Edit mode supports metadata, coordinate, category, and anchor updates
- Quick action includes Set Door Anchor from Pin

### G) Public Map UX

Implemented:

- Public map starts in explore
- Routes are user-toggleable
- Route display selection added for all segments or grouped subsets

---

## In Progress

### A) Routing Quality Hardening

- Investigate occasional suboptimal campus path choices despite walking profile
  - Done when repeatable problematic segments are identified with concrete root-cause evidence such as snap distance, access-tag issue, or endpoint placement issue.
- Add stronger diagnostics for endpoint snapping and segment behavior
  - Done when API output and logs include enough segment-level diagnostic data to explain why a specific detour occurred.
- Add guardrails for unexpected detours on short campus hops
  - Done when short-hop detours trigger a deterministic guardrail response, such as flagging, fallback, or explicit warning, in QA and runtime behavior.

### B) UI Consistency Pass 2

- Bring remaining internal/admin pages to full visual parity with polished core screens
  - Done when all remaining admin and ops pages use the shared shell and primitives with no obvious legacy outliers.
- Unify loading, empty, and skeleton states across all modules
  - Done when loading, empty, and error states are consistently rendered through shared patterns across internal and public modules.

---

## Deferred

### A) Routing Phase 2+

- Route-response caching implementation
- Provider failover strategy beyond current fallback
- Dual-anchor model (`arrival_anchor / departure_anchor`) for complex multi-entry buildings
- Private campus graph overlay if OSM and managed routing prove insufficient

### B) Advanced Product Features

- 3D experiences
- Multi-tour branching logic
- Advanced analytics and scheduling expansion

---

## Acceptance Gates Before Production Routing Signoff

Routing hardening should not be considered complete until all of the following are true:

- Guided-route segments return diagnostic metadata sufficient for engineering and QA review
- Flagged short-hop detours are surfaced in builder QA
- Publish validation can enforce anchor requirements when enabled
- No client exceptions occur across POI, route, preview, public, and embed flows
- Known problematic campus segments have been retested and documented
- Public route rendering behaves correctly with anchored, non-anchored, and transfer-stop combinations

---

## Current Recommended Execution Order

1. Add routing diagnostics to API responses and logs
2. Add builder-side route QA panel for flagged detour-risk segments
3. Add optional map setting require anchors for publish
4. Add regression checklist for guided-route + anchors + transfers flow
5. Finalize permissions matrix audit for edit/archive actions across modules
6. Add route legend and selection polish in the public map
7. Complete pass-2 UI consistency for remaining admin and ops pages
8. Enable phase-2 caching when route volume justifies it

---

## Known Risks / Watchouts

1. OSM data quality gaps
   Missing or mis-tagged campus footways can produce suboptimal pedestrian routing.
2. Endpoint snapping variability
   If anchors are absent or imprecise, snapped routes may detour unexpectedly.
3. Provider dependency and rate limits
   Mapbox usage, throttling, and token configuration directly affect routing reliability.
4. Deferred caching
   Current no-cache routing can increase latency and cost as segment volume grows.
5. Partial UI parity on long-tail pages
   Core pages are polished, but remaining admin screens still need pass-2 consistency.
6. Permissions edge cases
   Cross-module role enforcement should continue to be audited as features expand.

---

## Current Validation Checklist

- Create/edit POI works end-to-end
- Right-click anchor setting works
- Draft anchor dot appears before save
- Guided route ordering regenerates segments
- Non-anchored internal POIs stay listed without forcing line rendering
- Anchored stops connect with snapped pedestrian routes
- Public map route toggle and route selection behave correctly
- No client exceptions on POI, route, preview, public, or embed pages

---

## Operational Note

Before validating current anchor and transfer behavior in production, ensure this migration is applied:

- `/Users/mikelounello/siena-map-app/supabase/migrations/009_route_anchors_and_internal_transfers.sql`

---

## Next Suggested Engineering Task

1. Implement routing diagnostics to expose segment-level snap and fallback reasoning
2. Add builder-side route QA panel for flagged detour-risk segments
3. Add optional map setting require anchors for publish and enforce it in publish validation
