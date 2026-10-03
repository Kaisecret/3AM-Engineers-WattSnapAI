# Decision register

## Fixed by the request or proposal

- Documentation and organized files first; no application code at this stage.
- Four developers, with feature-based ownership and documentation.
- Next.js and Supabase.
- Gemini for multimodal extraction and personalized explanations.
- Offline access to saved information, one account per household, manually confirmed provider and extracted records.
- All 12 core proposal features, original-advisory reference, and estimates clearly distinguished from official records.

## Recommended engineering defaults

| Choice | Reason | Review point |
| --- | --- | --- |
| One TypeScript Next.js App Router app | Shared types and one deployable application | Foundation kickoff |
| Supabase Auth with email/password and recovery | Concrete minimal account flow | Confirm demo email-verification experience |
| GitHub Actions and Vercel | Proposed CI orchestrator and app host | Confirm accounts, plans, and deployment controls |
| develop staging; main production | Simple shared integration/release boundary | Before repository configuration |
| IndexedDB plus static app-shell caching | Saved structured offline data without caching private responses blindly | Offline prototype |
| Server-side Gemini adapter | Central validation, quotas, and secret handling | First scanner integration |
| ANTECO-first provider validation | Matches proposal's initial local validation | Gather verified coverage and sample records |
| User-set effective rate or transparent historical estimate | PHP projections need an explicit rate basis | Budget feature review |

## Product decisions to settle before dependent implementation

- Confirm developer names and who handles design/demo responsibilities among the five listed proposal members.
- Agree provider coverage evidence and locality aliases; do not assume municipality boundaries prove a utility service area.
- Agree image retention/deletion period and whether originals remain device-local or synchronize privately.
- Recommended change-detection threshold: highlight absolute percentage changes of 10% or more only for comparable periods, visibly described as a product threshold. Confirm with sample bills before acceptance.
- Recommended budget forecast: appliance-based daily estimated usage for the target period, with user-confirmed assumptions; never label this as live meter consumption. Determine which periods and usage edits are supported.
- Recommended readiness rule: automatic activation for reviewed Affected matches with a future valid schedule; Possibly Affected offers user confirmation before activation.
- Select supported browsers and whether Web Share Target is feasible; image upload and text paste remain mandatory fallbacks.
- Pin compatible package and CLI versions during foundation work; no unverified version numbers are prescribed here.

These decisions are visible design choices, not missing code placeholders. The present deliverable is ready for review without implementing them.
