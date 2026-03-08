# Siena Maps MVP Implementation Plan

This document converts the product brief into a buildable MVP sequence.

## 1. Technical Baseline

- Framework: Next.js App Router + TypeScript
- Data/Auth: Supabase (Auth, Postgres, Storage)
- Styling/UI: Tailwind + shadcn/ui
- Data Fetching: TanStack Query
- Mapping: Leaflet + React-Leaflet

## 2. MVP Domain Boundaries

- Identity and access control (owner/super_admin/department_head/editor/viewer)
- Departmental governance (primary + collaborators)
- Map shell lifecycle (draft -> submitted -> approved/rejected -> archived)
- POI lifecycle (draft -> submitted -> approved -> published/rejected/archived)
- Public rendering from published content only
- Public directory filtering (department + category)
- Embed generation for public/unlisted maps

## 3. Milestones

1. Foundation
- Supabase schema migration and RLS policies
- typed domain model and permission helpers
- auth/session scaffolding with schema-aware db client

2. Internal App v1
- dashboard, maps list, map create/edit, POI editor
- review queue for map shells + POIs
- department/user/category management

3. Public App v1
- public directory
- public map page with explore/guided modes
- embed route + iframe generator

4. Media and Performance
- POI image upload + optimization pipeline
- caching strategy for public read endpoints

## 4. Key Design Decisions Applied

- Owner is a protected role in policy/function checks.
- Categories are global.
- Editors can edit POIs they created or owned by their department only.
- POI approval and publication are separate fields; default publish-on-approval unless scheduled publish is set.
- Route style is editable per connection.

## 5. Suggested Next Build Order

1. Wire this migration into Supabase and generate typed API bindings.
2. Implement auth callback + role bootstrap for the first owner account.
3. Build map shell CRUD + review queue APIs.
4. Build POI CRUD + approval + publish scheduler APIs.
5. Build public directory and public map read models.
