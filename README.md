# WattSnap AI

An AI-assisted electricity consumption and provider advisory assistant for households.

This repository contains **documentation, asset folders, and an empty Next.js file scaffold**. Route, feature, integration, test, configuration, and workflow files are zero-byte placeholders requested for organization. No application logic, dependencies, database migrations, or working CI/CD workflows have been implemented. Empty configuration and workflow files must be filled before installing, running Next.js, or enabling CI/CD. The original [proposal](WattSnap_AI_Proposal.docx) is preserved.

## Start here

1. Read the [proposal overview](docs/01-proposal-overview.md) and [system goals](docs/02-system-goals.md).
2. Review the [architecture](docs/03-architecture.md), [future file structure](docs/04-project-structure.md), and [shared contracts](docs/05-shared-contracts.md).
3. Assign the four developers using the [team plan](docs/06-four-developer-workflow.md).
4. Follow the [delivery roadmap](docs/08-delivery-roadmap.md) and [CI/CD plan](docs/07-ci-cd-pipeline.md).
5. Implement each feature from its own [specification](docs/features/README.md), after reviewing the design.

## Stack and scope

- Requested: Next.js and Supabase.
- Proposal requirements: Google Gemini API, offline-first Progressive Web Application, one account per household, user-confirmed AI extraction, location-aware provider suggestions.
- Proposed engineering choices: TypeScript, App Router, IndexedDB for saved offline data, GitHub Actions for CI/CD, and Vercel for Next.js hosting. These are planning defaults, not configured services.
- Initial validation: ANTECO bills and advisories; other Panay providers require verified coverage information.
- Team: four developer slots. The proposal lists five team members; developer assignments use Dev 1–4 so no fifth member is assigned or excluded by assumption.

## Documentation map

| File | Purpose |
| --- | --- |
| [Proposal overview](docs/01-proposal-overview.md) | Faithful summary, audience, boundaries, source references |
| [System goals](docs/02-system-goals.md) | Goals, acceptance outcomes, and feature traceability |
| [Architecture](docs/03-architecture.md) | Next.js, Supabase, Gemini, offline responsibilities |
| [Project structure](docs/04-project-structure.md) | Future feature-based folders and file responsibilities |
| [Shared contracts](docs/05-shared-contracts.md) | Data meanings and interfaces between features |
| [Team workflow](docs/06-four-developer-workflow.md) | Ownership, branches, reviews, integration |
| [CI/CD](docs/07-ci-cd-pipeline.md) | Checks, environments, deployments, recovery |
| [Roadmap](docs/08-delivery-roadmap.md) | Dependency-aware development batches |
| [Quality and security](docs/09-quality-security.md) | Acceptance, isolation, privacy, AI quality |
| [Decision register](docs/10-decisions.md) | Recommended choices and unresolved product decisions |
| [Feature index](docs/features/README.md) | All 12 core features and authentication foundation |
| [Assets guide](assets/README.md) | Organized design and reference assets |

Planning date: 3 October 2026 (Asia/Manila). Read the [official engineering references](docs/07-ci-cd-pipeline.md#official-references) again before selecting package versions or implementing deployment configuration.
