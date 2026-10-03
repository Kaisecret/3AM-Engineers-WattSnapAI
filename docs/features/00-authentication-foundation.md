# Foundation — Authentication and household isolation

Owner: Dev 1. Reviewer: Dev 4. Goals: G01, G17, G18. Added engineering foundation for the requested Supabase stack.

## Behavior

Provide sign-up, sign-in, sign-out, recovery, and authenticated household access. Recommended initial method is email/password. Create exactly one household for an account through an idempotent onboarding operation; retrying must not create duplicates. A new account can sign in online; saved local records can remain readable offline in the same account-scoped device context, with clear sync limitations.

## Interfaces and dependencies

Consumes Supabase identity/session and returns authorized account/household context. The server validates identity for protected operations. User access uses scoped authorization rather than privileged keys. Feature owners consume the same authorization helper.

## Future files

- `src/features/auth/service.ts`: account/session use cases.
- `src/features/auth/components/auth-form.tsx`: sign-in/sign-up controls.
- `src/lib/supabase/server.ts` and `browser.ts`: environment-specific clients.
- `src/features/auth/service.test.ts`: onboarding retry and session behavior.
- `tests/e2e/account-isolation.spec.ts`: direct cross-account access and cache clearing.

## Acceptance

- [ ] Sign-up, login, recovery, invalid credentials, and expired-session paths work.
- [ ] Repeated onboarding produces one household.
- [ ] Account A cannot read/write account B records or originals by changing IDs.
- [ ] Sign-out clears private local records and images; another account sees none of them.
- [ ] Offline views indicate that remote identity refresh and synchronization need connectivity.
