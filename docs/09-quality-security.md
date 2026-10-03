# Quality, security, and acceptance

## Household isolation

Enforce account ownership in server requests, exposed database access, and private Storage access. Database RLS policies must authorize the specific household rather than merely requiring a logged-in role. No cross-household access is permitted by guessed record IDs or file paths. Use server-only privileged credentials only for explicitly reviewed administrative needs.

## AI quality

Treat uploaded/pasted content as data, including text that resembles instructions. Validate output fields, supported units, and dates. Reject malformed outputs; preserve unknown values and show correction controls. Bills and appliance drafts require explicit confirmation. Advisory ambiguity is explained before readiness decisions. Record model/prompt version and input revisions for reproducibility without logging raw personal content.

## Upload and location privacy

Allow only approved image formats and sizes; verify actual content server-side. Retain originals privately with a documented deletion policy. Use synthetic/redacted samples in Git. Ask for geolocation only when needed, support denial, and retain precise coordinates only with a defined purpose. Provider coverage evidence must be sourced and versioned.

## Offline quality

Verify after disconnect and reload, not merely by disabling one request. Confirm saved graphs, tips, advisories, reminders, and calculations remain readable. Check pending edits, duplicate replay, conflicts, eviction handling, service-worker upgrade compatibility, and account changes. Never display the prior account's data after sign-out or sign-in by another user.

## Meaningful test matrix

| Area | Required checks |
| --- | --- |
| Calculations | 240/150/90 kWh example; zero inputs; invalid hours/days; rounding |
| History/change | One bill; missing month; duplicate periods; prior zero kWh; unequal period length |
| Budget | 38 kWh remaining; below/over target; invalid period; absent rate; negative remaining |
| Advisory matching | Exact provider/location; ambiguous name; municipality-wide area; missing location; unlisted area |
| Readiness | Fixed clock; past advisory; missing end; changed restoration; cached countdown |
| AI integration | Timeout; unreadable image; missing fields; adversarial source text; malformed response |
| Isolation | Other account IDs/files; unauthenticated requests; offline cache after sign-out |
| Delivery | Failed required check; failed migration; app rollback; staging/production secret separation |

## Usability

Support mobile camera/upload and keyboard navigation. Label appliance icons with text, show units beside numeric inputs, expose graph summaries in readable text, and do not communicate risk by color alone. Upload and paste fallbacks are available if camera or sharing is unsupported.

## Release evidence

Keep the verified commit, test reports, feature acceptance outcomes, schema compatibility review, staging smoke result, and release owner. A CI/CD design document alone does not demonstrate an operational pipeline.
