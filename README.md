# Siena Maps Platform

Phase 1 scaffold for Siena's internal map publishing platform.

## Included in this scaffold

- Next.js App Router + TypeScript baseline
- Supabase SSR auth/session wiring
- Schema-scoped db access (`app_siena_maps`)
- Server env validation and admin Supabase client support
- MVP domain model/types/constants/workflow helpers
- Initial API routes:
  - `GET/POST /api/maps`
  - `GET/POST /api/pois`
  - `GET /api/review-queue`

## Local setup

1. Install dependencies:
   - `npm install`
2. Configure environment:
   - copy `.env.example` into `.env.local`
3. Apply SQL migration in Supabase:
   - `supabase/migrations/001_siena_maps_initial.sql`
4. Run app:
   - `npm run dev`

## Notes

- Login route: `/login`
- OAuth callback route: `/auth/callback`
- Default app schema: `app_siena_maps`
- Health route: `/api/health`
- Owner bootstrap route: `POST /api/admin/bootstrap-owner` (requires authenticated Google session + `OWNER_EMAIL`)

## UI System (Required for New Pages)

- Standards: `docs/siena-ui-standards.md`
- Merge checklist: `docs/ui-checklist.md`
- Shared primitives:
  - `src/components/ui/siena.tsx`
  - `src/components/ui/page-scaffold.tsx`
  - `src/components/ui/form-controls.tsx`
