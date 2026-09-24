## Linear Issue

<!-- Example: [MB-42](https://linear.app/...) -->

- Issue:

## What changed?

-

## Why?

-

## How to test

1.
2.
3.

## Screenshots

<!-- Include desktop and mobile screenshots for UI changes. -->

## Risks and rollout

- Migration:
- Environment variables:
- Rollback plan:
- Known risks:

## Checklist

- [ ] The Linear issue is linked and its acceptance criteria are met.
- [ ] `pnpm lint` passes.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm test` passes.
- [ ] `pnpm build` passes.
- [ ] The Vercel Preview deployment has been tested.
- [ ] Mobile layout and accessibility impact have been reviewed.
- [ ] New environment variables are documented in `.env.example`.
- [ ] Any required Supabase migration has been added and verified in the development environment.
- [ ] Authentication, authorization, and RLS impact have been reviewed.
- [ ] Stripe webhook and idempotency impact have been reviewed.
- [ ] Documentation and rollback instructions have been updated.
