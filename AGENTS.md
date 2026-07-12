# Agent Instructions

## Start here

- Read this file and any applicable parent `AGENTS.md` files before working.
- Check `.agents/`, `.codex/`, the README, and package/task configuration for additional repository guidance.
- Preserve unrelated user changes in a dirty worktree.

## Secrets and external services

- Inspect local `.env*` and service-specific environment filenames before external operations, but never print secret values.
- Do not commit, log, or persist credentials.
- Before GitHub actions, verify the intended repository, account, and permission. Prefer a repository-scoped `GITHUB_TOKEN` when one is provided; do not assume global GitHub credentials are correct.

## Changes and verification

- Make the smallest change that fulfills the request.
- Run the relevant checks before handing work off.
- Stage and commit only files within the requested scope.

## NEPA Trackr specifics

- This is a Vite + React application. Run `npm run lint` and `npm run build` for relevant frontend or API changes.
- Power-event and analysis data uses Turso through `@libsql/client`; runtime credentials are supplied through local environment files.
- AI analysis uses OpenRouter. Preserve the deterministic local-analysis fallback when modifying the analysis workflow.
- `.env.github.local` contains the project-scoped `GITHUB_TOKEN`. Before GitHub operations, source it only for the relevant command, validate the account and push permission with `gh api`, and do not alter global GitHub authentication or persist the token in Git configuration.
