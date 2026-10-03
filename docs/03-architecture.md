# Architecture design

Status: proposed design for review; no code or services are configured.

## Recommended approach

Use one Next.js application with feature modules and Supabase Auth, database, and private Storage. This keeps deployment and integration manageable for four developers. A layer-only application is initially simple but scatters each feature across many folders. Separate microservices add deployment and contract overhead; defer them until a measured need appears.

## Responsibilities

| Component | Responsibility |
| --- | --- |
| Next.js App Router | Page composition, authenticated server boundaries, AI request endpoints |
| Feature modules | Feature UI, input validation, domain logic, data access, tests |
| Supabase Auth | Account identity and sessions |
| Supabase database | Confirmed household records and saved generated results, guarded by household authorization |
| Supabase private Storage | Authorized bill, appliance, and advisory originals when cloud retention is enabled |
| Gemini server adapter | Multimodal extraction and personalized explanations; never household authorization or authoritative arithmetic |
| IndexedDB | Account-scoped saved records, local calculations, pending edits, and sync metadata |
| Service worker/PWA | Installable app shell and controlled static caching |

## Data flow

1. The browser validates input and authenticates a request to Next.js.
2. The server checks household access, limits upload size and request rate, and calls Gemini with only needed input.
3. Gemini output is validated against the feature's agreed result contract. Missing fields stay unknown.
4. The UI presents a draft. The user corrects and confirms it before it becomes a bill or appliance record.
5. Confirmed data is stored through authorized Supabase access and retained in the household's local saved cache.
6. Deterministic modules compute estimates, changes, simulations, budgets, and countdowns. Tips consume the same verified inputs.

Advisory interpretations retain the original, source attribution, review status, and matching rationale. Unknown or partial locations cannot produce an unqualified affected result.

## Feature boundaries

Route files compose features; they do not contain large calculation or persistence implementations. Features expose a small public entry file, use shared contracts, and do not reach into another feature's internal files. Shared components contain reusable controls only. Shared integration adapters handle Supabase, Gemini, and local storage consistently.

## Offline boundary

Offline capability begins after the application shell and selected records have been saved successfully. A first visit without a network cannot create an account or fetch uncached data. AI generation, fresh advisories, and cloud synchronization require a connection. Browser storage can be evicted; indicate local-save status rather than promising permanent availability.

Account changes and sign-out clear private records and private image caches. Avoid blindly caching authenticated HTTP responses. Use record-level storage for private data and version caches explicitly.

## Deployment boundary

GitHub Actions is the proposed orchestrator. Preview and staging use non-production data; production uses a separate Supabase project and secrets. Vercel is the proposed app host, subject to team selection. Database changes are serialized, compatible with the preceding application release, and deployed before the dependent application is promoted.

## Engineering references

Next.js permits feature organization outside route folders and private implementation folders inside them: [Project structure](https://nextjs.org/docs/app/getting-started/project-structure). Separate staging and production Supabase projects follow the [environment guide](https://supabase.com/docs/guides/deployment/managing-environments).
