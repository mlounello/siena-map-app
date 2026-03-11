## Current Priority
1. Add a regression checklist for guided-route + anchors + internal-transfer flows.
2. Monitor routing QA results and tune thresholds only if real Siena route data shows noise.
3. Complete any final light parity pass on remaining long-tail pages (guided routes page only if still needed).
4. Enable route-response caching when route volume justifies it.

---

## Completed Work

### A) Foundation / Platform
- [x] Next.js + Supabase app scaffold with internal/public route split.
- [x] Google auth flow stabilized (callback/session/middleware path corrected).
- [x] Role model wired (`owner`, `super_admin`, `department_head`, `editor`, `viewer`).
- [x] Owner/admin bootstrap path added.
- [x] Core entities/APIs wired for maps, POIs, departments, categories, users, embeds.
- [x] Review queue and moderation actions implemented (submit/approve/reject/publish patterns).

### B) UI System / Product Shell
- [x] Visual foundation migrated toward Alcohol Origins quality bar.
- [x] Header/nav architecture refactored and stabilized.
- [x] Contrast/active-state issues fixed.
- [x] Shared primitives standardized across core screens.
- [x] Public/internal shell consistency significantly improved.
- [x] Temporary `SI` box replaced with square Siena logo asset in header.
- [x] Pass-2 UI consistency completed for key admin/ops pages:
  - [x] Review queue
  - [x] Embed generator
  - [x] Departments admin
  - [x] Categories admin
  - [x] Users admin

### C) Map Styles / Routing Infrastructure
- [x] Multiple map style presets added (`STREETS`, `DATAVIZ.DARK`, `SATELLITE`, `HYBRID`, `OUTDOOR`, `BASIC`, `OPENSTREETMAP`).
- [x] Routing abstraction introduced server-side.
- [x] Batch routing endpoint added: `/api/routing/segments`.
- [x] Mapbox walking profile integrated for snapped pedestrian routing.
- [x] Straight-line fallback retained for resilience.
- [x] Routing audit artifacts/fixtures added for Siena campus QA.
- [x] Routing diagnostics normalized per segment.
- [x] Deterministic short-hop guardrails added to routing diagnostics.
- [x] Stable diagnostics contract maintained across routed and fallback responses.
- [x] Builder-facing QA panel added for flagged route segments.

### D) Guided Route Authoring Model
- [x] Shifted from manual line-item route editing to guided-route stop ordering.
- [x] Primary guided route + ordered stop model added.
- [x] Route order save regenerates explicit route connections.
- [x] Duplicate order-index issues removed with new flow.

### E) Door Anchor + Internal/External Handling
- [x] Added POI door-anchor fields (`route_anchor_lat`, `route_anchor_lng`).
- [x] Builder supports right-click to set door anchor.
- [x] Builder shows persisted anchor locus points.
- [x] Builder shows draft anchor point before save.
- [x] Internal/no-anchor POIs remain in stop list.
- [x] Route lines connect anchored POIs and skip non-anchored internal POIs.
- [x] Internal transfer messaging appears in public stops panel when relevant.
- [x] Manual stop-number input removed from POI form.

### F) POI Editing UX
- [x] POIs can be reopened and edited after submit/approve/publish.
- [x] Edit mode supports metadata/coordinate/category/anchor updates.
- [x] Quick action includes `Set Door = Pin`.

### G) Publish Governance / Anchor Validation
- [x] Added map setting: `require_anchors_for_publish`.
- [x] Publish-time validator blocks only guided-route stops that break anchored route continuity.
- [x] Internal pattern `anchored -> unanchored internal -> anchored` remains valid.
- [x] Publish blocker payload includes blocker list and summary counts.
- [x] Map workspace now surfaces publish blockers clearly in the UI.

### H) Permissions / Governance Hardening
- [x] Owner accounts protected from non-owner role modification.
- [x] Non-owner accounts cannot assign `owner` role.
- [x] Governance-sensitive map setting (`require_anchors_for_publish`) restricted above editor level.
- [x] Explicit scope checks added to POI approve/reject/publish endpoints.
- [x] UI action visibility aligned more closely with backend permission rules.
- [x] Dashboard/admin entrypoints made role-aware.
- [x] Department member APIs hardened with explicit department-head scope checks.

### I) Public Map UX
- [x] Public map starts in explore mode.
- [x] Routes are user-toggleable (`Show Route` / `Hide Route`).
- [x] Route display selection added and polished with more visitor-friendly wording.
- [x] Route visibility state now reads clearly (`Route Visible` / `Route Hidden`).
- [x] Route selector remains stable in the UI when route groups exist.
- [x] Compact map key/legend added for route line, stop marker, and internal transfer meaning.
- [x] Hidden/no-route states now display intentional helper messaging.

### J) Embed / Preview UX
- [x] Embed generator polished for better form grouping and preset presentation.
- [x] Embed preview 404 fixed.
- [x] Embed preview now resolves by map slug instead of map id.
- [x] Internal authenticated preview works for unpublished maps in embed builder.

---

## In Progress

### A) Routing Quality Hardening
- [ ] Continue evaluating occasional suboptimal campus path choices despite walking profile.
  - Done when: flagged detours can be diagnosed consistently from diagnostics + QA panel and reviewed against real Siena examples.
- [ ] Monitor short-hop guardrail signal quality before tuning thresholds.
  - Done when: real Siena route samples show whether current defaults are useful or noisy.
- [ ] Build a lightweight regression workflow around routing QA results.
  - Done when: a repeatable validation set exists for high-risk campus routes.

### B) Final UI Parity Check
- [ ] Review any remaining long-tail page for pass-2 parity, especially guided routes page if needed.
  - Done when: no remaining internal/admin page noticeably falls below the current polished baseline.

---

## Deferred

### A) Routing Phase 2+
- [ ] Route-response caching implementation (diagnostic/caching shape already prepared).
- [ ] Provider failover strategy beyond current straight-line fallback.
- [ ] Dual-anchor model (`arrival_anchor` / `departure_anchor`) for complex multi-entry buildings.
- [ ] Private campus graph overlay if OSM + managed routing prove insufficient.

### B) Advanced Product Features
- [ ] 3D experiences.
- [ ] Multi-tour branching logic.
- [ ] Advanced analytics and scheduling expansion.

### C) Optional Branding Refinement
- [ ] Replace current square Siena logo asset with a more official/final brand-approved square mark if a stronger asset is provided later.

---

## Current Recommended Execution List

- [ ] Add a regression checklist for guided-route + anchors + internal transfers flow.
- [ ] Review routing QA output against real Siena campus examples before tuning thresholds.
- [ ] Perform one final parity check on any remaining long-tail internal page (guided routes page only if needed).
- [ ] Enable phase-2 route caching when route volume justifies it.
- [ ] Revisit branding asset only if a stronger official Siena square logo is provided.

---

## Known Risks / Watchouts

1. **OSM data quality gaps**
   - Missing or mis-tagged campus footways can still produce suboptimal pedestrian routing.

2. **Endpoint snapping variability**
   - Even with anchors, imprecise anchor placement can still cause unexpected short detours.

3. **Provider dependency and rate limits**
   - Mapbox token/configuration and usage still directly affect routing reliability.

4. **Deferred caching**
   - Current no-cache routing may increase latency/cost as route volume grows.

5. **Long-tail page parity**
   - Core screens are strong; remaining minor pages should still be checked for consistency drift.

6. **Permissions edge cases**
   - Role enforcement is much tighter now, but should continue to be audited as new governance features are added.

---

## Current Validation Checklist

- [ ] Create/edit POI works end-to-end.
- [ ] Right-click anchor setting works.
- [ ] Draft anchor dot appears before save.
- [ ] Guided route ordering regenerates segments.
- [ ] Non-anchored internal POIs stay listed without forcing line rendering.
- [ ] Anchored stops connect with snapped pedestrian routes.
- [ ] Builder QA panel surfaces flagged route segments correctly.
- [ ] `require_anchors_for_publish = false` preserves current publish behavior.
- [ ] `anchored -> unanchored internal -> anchored` remains publishable when anchor requirement is enabled.
- [ ] Missing-anchor boundary stop blocks publish when anchor requirement is enabled.
- [ ] Publish blocker list is surfaced clearly in map workspace.
- [ ] Embed preview renders correctly in builder.
- [ ] Public map route toggle and route selection behave correctly.
- [ ] No client exceptions on POI/route/public map pages.