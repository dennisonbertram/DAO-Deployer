# AGENTS

This document guides AI coding agents (Claude, ChatGPT/Codex CLI, etc.) contributing to this repository. It captures project structure, safe operating rules, and common workflows so agents can deliver helpful, minimal, and verifiable changes.

## Purpose
- Provide clear roles and guardrails for agents.
- Standardize how agents search, edit, test, and document changes.
- Ensure changes align with this repo’s toolchain (Foundry + Next.js monorepo).

## Repo Overview
- Monorepo workspaces: `contracts/` (Foundry), `frontend/` (Next.js/TypeScript)
- Orchestration scripts in root `package.json` and `scripts/`
- Helpful docs: `README.md`, `LOCAL_DEVELOPMENT.md`, `DAO_DEPLOYMENT_INTEGRATION.md`, `DEVELOPMENT_LOG.md`, `contracts/README.md`, `contracts/README_DEPLOYMENT.md`

## Roles
- Builder Agent: Implements focused features or fixes with minimal scope.
- Contracts Agent: Solidity/Foundry work (build, test, deploy scripts, addresses).
- Frontend Agent: Next.js/TypeScript UI and integration with `viem`/`wagmi`.
- Docs Agent: Updates or adds concise documentation close to the change.
- Reviewer Agent: Validates changes, trims scope, and ensures safety/consistency.

## Operating Guidelines
- Keep changes minimal and scoped to the task; avoid unrelated refactors.
- Prefer repository conventions and existing patterns; don’t rename files needlessly.
- Use fast search and read in small chunks:
  - Prefer `rg` to search; read files in ≤250-line chunks.
- Editing files:
  - Use patch-based edits; keep diffs small and targeted.
  - Update nearby docs if behavior/config changes.
- Testing & validation:
  - Contracts: `npm run contracts:build` / `npm run contracts:test` (Foundry).
  - Frontend: `npm run dev --workspace=frontend` for smoke checks; lean on linters/type checks.
  - Avoid adding new frameworks or tools.
- Formatting & linting:
  - Solidity: use `forge fmt` if available; otherwise retain existing style.
  - Frontend: `eslint` and TypeScript type checks (`npm run lint` / `npm run type-check`).
- Secrets & safety: never add secrets; prefer `.env` and `.env.example`. Do not commit generated artifacts unless the repo already does.

## Commands Reference
Root scripts (see `package.json`):
- Local dev orchestration: `npm run dev:local` or `npm run dev:local:watch`
- Contracts (Foundry):
  - `npm run contracts:anvil` – start Anvil
  - `npm run contracts:build` – build contracts
  - `npm run contracts:test` – run Foundry tests
  - `npm run contracts:deploy:local` – deploy to local Anvil
- Frontend (Next.js):
  - `npm run dev --workspace=frontend`
  - `npm run build --workspace=frontend`

Helpful scripts (see `scripts/`):
- `dev-local.sh`, `dev-local-watch.sh` – start Anvil, deploy, run frontend
- `watch-contracts.sh` – watch and rebuild/deploy contracts on changes

## Contracts Notes
- Toolchain: Foundry (`foundry.toml` present). Use `forge build/test/script`.
- Local network: Anvil on `http://127.0.0.1:8545` (see docs and scripts).
- Deterministic deployments: respect existing deploy scripts and address prediction.
- Outputs: Mind `contracts/out/` and any `broadcast/` artifacts.

## Frontend Notes
- Stack: Next.js 14, React 18, TypeScript, Tailwind, RainbowKit, Wagmi, Viem, Zod.
- Keep components small; prefer existing UI primitives and state stores (Zustand).
- Integration points: contract addresses/config under `frontend/src/lib/contracts/`.

## Claude Settings
A local settings file exists: `.claude/settings.local.json`.

```json
{
  "permissions": {
    "allow": [
      "Bash(git add:*)"
    ],
    "deny": [],
    "ask": []
  }
}
```

Recommendations:
- Keep allowlist minimal; default to ask/deny for destructive commands.
- Prefer patch-based edits over direct shell writes.

## How Agents Should Work
1. Discover context
   - Read `README.md`, `LOCAL_DEVELOPMENT.md`, relevant workspace `README*`.
   - Identify exact files to touch with `rg`.
2. Plan briefly
   - Outline 2–5 short steps; execute sequentially.
3. Implement changes
   - Apply small patches; keep commits clean (if committing is requested).
4. Validate
   - Use the narrowest tests and linters relevant to the change.
5. Document
   - Update or add minimal docs near the change (and/or this file if process changes).

## Review Checklist
- Scope: Only changed what was necessary for the task.
- Build/Test: Contracts build/tests pass; frontend lints/types pass.
- Config: No unintended config changes; env secrets not committed.
- Docs: Added/updated docs for new or changed behavior.
- Rollback: Changes are easy to revert if needed.

## Useful Context to Provide Agents
- High-level goal and expected outcome.
- User flows or CLI steps to reproduce before/after.
- Pointers to exact files and commands to run.
- Constraints (e.g., avoid new deps, network restrictions, time budgets).

## Future Improvements
- Expand `.claude/` with task-specific prompts and role playbooks.
- Add lightweight command recipes (e.g., common `forge script` invocations).
- Include suggested PR title/body templates and semantic commit hints if adopted.

---
If you need a task-specific agent brief, add it under `.claude/` (e.g., `.claude/roles/contracts.md`) and reference it here.
