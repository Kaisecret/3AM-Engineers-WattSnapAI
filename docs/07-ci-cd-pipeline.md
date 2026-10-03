# CI/CD pipeline plan

Status: documentation only. GitHub Actions, a GitHub repository, Vercel projects, secrets, branch protections, and workflow YAML are not configured. GitHub Actions and Vercel are proposed defaults; the team must confirm accounts and hosting before implementation.

## Environments and triggers

| Event | Checks/deployment | Data environment |
| --- | --- | --- |
| Pull request to develop or main | Required CI, optional restricted app preview | Ephemeral local Supabase for tests; synthetic isolated preview data |
| Merge into develop | Recheck commit, deploy migrations, deploy staging app, smoke test | Staging Supabase project |
| Release PR develop → main | CI plus staging acceptance evidence | No production writes from PR jobs |
| Merge approved release to main | Protected release job, migrations, app promotion, smoke test | Separate production Supabase project |

Never connect a preview to production. Shared staging is acceptable for trusted team previews only with disposable, isolated test accounts and no destructive test jobs. Prefer isolated preview databases when available; confirm cost before enabling branching services.

## Required CI sequence

1. Check out the commit using least-privilege repository access.
2. Install pinned runtime/tool versions and dependencies from the committed lockfile.
3. Validate formatting, linting, and TypeScript.
4. Run meaningful deterministic tests: kWh calculations, comparison edge cases, matching, forecasts, and countdowns.
5. Start ephemeral local Supabase; apply migrations from a clean database; verify household and Storage access isolation.
6. Regenerate database types and fail on committed-type drift once generated types exist.
7. Build Next.js using test configuration. Do not require a paid live Gemini call for routine CI.
8. Run core end-to-end flows with controlled Gemini fixtures, including confirmation before saving and offline revisit.
9. Upload sanitized reports/screenshots. Mark the combined required gate failed if any required job fails.

Select the exact check names once workflows exist and bind branch protection to those names. Documentation-only PRs may run Markdown/link checks, but changed migrations or shared contracts must never bypass relevant checks. Keep live Gemini compatibility checks separate, quota-limited, and server-secret protected.

## Future workflow files

| File to create later | Responsibility |
| --- | --- |
| `.github/workflows/ci.yml` | PR quality, build, calculations, isolation, end-to-end checks |
| `.github/workflows/staging.yml` | Serialized develop deployment and staging smoke checks |
| `.github/workflows/production.yml` | Protected main release and production smoke checks |

Workflow code will be written only during implementation. CLI commands and options must be verified against the selected pinned CLI's help/docs then.

## Deployment order

Use additive, backward-compatible database changes. Serialize deployments per environment; do not cancel a running migration job. Require migration success before deploying the dependent app. Stage the exact release commit, verify it, and promote that tested commit rather than a moving branch head.

Prevent automatic hosting integration from publishing production ahead of the orchestrated database gate. Have the release workflow control promotion or configure equivalent ordered gates. If an app build fails after migrations, the previous app must still operate against the expanded schema.

Remove old columns or contracts only in a later release after all deployed and cached clients have migrated. Offline clients make immediate breaking changes especially risky.

## Secrets and configuration

| Setting | Scope |
| --- | --- |
| Supabase URL and publishable key | Environment-specific client configuration, protected by access policies |
| Supabase deployment token/project reference/database password | Scoped GitHub environment secrets/settings for deployment jobs |
| Gemini API key | Server runtime only; no public browser environment prefix |
| Supabase secret/service-role key, if genuinely needed | Server-only, narrowly used; never standard user access |
| Hosting deployment credentials | Scoped protected deployment environment |

Do not expose deployment secrets to fork PRs or untrusted code. Separate staging and production values. Log neither tokens nor uploaded household data. Pin dependency versions and third-party Actions to reviewed versions, preferably immutable commit IDs for Actions.

## Release control and recovery

Require a non-author release reviewer. Where the repository plan supports environment approval, require it for production; otherwise use protected release PR review and restricted release permissions. This is a proposed team policy, not an approval request for these documents.

Before release, identify the prior app deployment, database backup/recovery capability, migrations, and recovery owner. On migration failure, stop app promotion and inspect migration history before retrying. On app smoke failure, roll back the app deployment if compatible. Prefer a forward database repair; destructive rollback or restoration requires a reviewed recovery plan because it can lose data.

Smoke checks cover authentication, household profile read, confirmed bill write/read using a synthetic release account, and private upload authorization. Alert the release owner on failure and record the deployed commit/version. Never create public test household data.

## Activation checklist

- [ ] Confirm repository host and application host.
- [ ] Pin compatible Next.js, Supabase, Gemini integration, Node, package manager, and CLI versions.
- [ ] Create separate staging and production projects with matching migration history.
- [ ] Configure environment secrets, branch protection, reviewer access, and release concurrency.
- [ ] Implement CI workflow and demonstrate a deliberate failing check blocks merge.
- [ ] Implement staging deployment and demonstrate migration failure blocks app deployment.
- [ ] Implement production promotion and rehearse app rollback in staging.

## Official references

- [Supabase environment management](https://supabase.com/docs/guides/deployment/managing-environments): separate staging/production projects and migration delivery with GitHub Actions.
- [GitHub deployment environments](https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments): environment protection, secrets, and plan-dependent availability.
- [Next.js project structure](https://nextjs.org/docs/app/getting-started/project-structure): App Router file and folder conventions.
- [Supabase changelog](https://supabase.com/changelog): check compatibility and breaking changes when implementation begins.
