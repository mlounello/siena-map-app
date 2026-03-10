# Current Routing / Line Rendering Flow (Phase 0 Baseline)

## Public guided map
- File: `src/components/map/public-leaflet-map.tsx`
- Guided lines are rendered for explicit route connections.
- If no explicit connections exist, guided mode uses sequential stop-to-stop lines.
- This pass routes explicit segments through `/api/routing/segments` and falls back to straight lines per segment.

## Internal builder canvas
- File: `src/components/map/internal-builder-map.tsx`
- Builder can toggle lines on/off.
- Builder route segments are derived from stop order and routed through `/api/routing/segments`.
- If routing fails, builder draws straight segments.

## Routing service entry point
- File: `src/app/api/routing/segments/route.ts`
- Batch endpoint validates segment payload and mode.
- Segment hard limit: `50`.
- Each segment resolves via provider abstraction and returns normalized GeoJSON LineString.

