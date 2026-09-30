# Docs AI mock

A clickable UI mock of Docs AI: a Next.js 15 App Router app with shadcn/ui components and typed in-memory mock data. No backend. Any email and password sign in.

## Run it

```
pnpm install
pnpm dev          # http://localhost:3020
pnpm build        # production build must pass
npx tsc --noEmit  # typecheck
```

Sign in at `/login` (any credentials). The demo workspace is `/w/northwind`.

## Reviewing states

- Append `?state=empty`, `?state=loading` or `?state=error` to any page to see that state.
- Switch role from the user menu (bottom of the sidebar) → "View as" → Member to see permission-denied on admin pages.
- "Reset demo data" in the same menu clears local changes.

## Routes

| Area | Routes | Interactive |
|---|---|---|
| Entry | `/login`, `/signup`, `/forgot-password`, `/auth/error?code=`, `/workspaces`, `/oauth/authorize`, `/onboarding`, `/share/kb/northwind-help` | yes |
| Home | `/w/northwind` | yes |
| Knowledge bases | `/w/northwind/kb`, `/kb/new`, `/kb/{id}` + `sources`, `documents`, `retrieval`, `playground`, `api`, `analytics`, `access`, `evals`, `curation`, `proposals` | yes |
| Sources | `/w/northwind/sources`, `/sources/new`, `/sources/{id}` + `items`, `history`, `settings` | yes |
| Files | `/w/northwind/files`, `/files?upload=1`, `/files/{id}`, `/files/storage` | yes |
| Chat | `/w/northwind/chat`, `/chat/{threadId}`, `/chat/conversations` | yes |
| Connect | `/w/northwind/connect/clients`, `/connect/mcp`, `/connect/oauth-clients` | yes |
| Tools | `/w/northwind/tools`, `/tools/new`, `/tools/{id}/(general|rest|code|test)`, `/tools/import`, `/executions`, `/executions/{id}` | built, not polished |
| Team, audit, analytics | `/w/northwind/team`, `/audit`, `/analytics` | built, not polished |
| Later phase | Secrets, Integrations, Settings sub-pages | nav entries only |

Screenshots of the key screens are in `docs/screens/` (`node scripts/shoot.mjs docs/screens 1440 "/w/northwind,..."`). `scripts/flow.mjs` drives the main flows headless.

## Where to extend

- Navigation: `components/shell/app-sidebar.tsx` (sidebar groups), `components/shell/search-command.tsx` (Cmd+K), `components/shell/site-header.tsx` (breadcrumb labels).
- Mock store and actions: `lib/mock/store.ts`; types in `lib/mock/types.ts`; seed data under `lib/mock/seed/`.
- Shared building blocks: `components/shared/` (page header, states, data table, badges, dialogs, surface rows).
