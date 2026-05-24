# External Integrations

**Analysis Date:** 2026-05-24

## APIs & External Services

**Agent Workflow Tools:**
- GStack - Required global toolset for AI-assisted work in Claude.
  - SDK/Client: Global skill installation at `~/.claude/skills/gstack/bin`
  - Auth: Not detected
  - Status: Enforced by `CLAUDE.md`, `.claude/settings.json`, and `.claude/hooks/check-gstack.sh`
- Gemini Spec Kit integration - Active Spec Kit integration for command prompts/workflows.
  - SDK/Client: Spec Kit integration files under `.gemini/.specify/` and Gemini command TOML files under `.gemini/commands/`
  - Auth: Not detected in repo
  - Status: Configured in `.gemini/.specify/integration.json` and `.gemini/.specify/init-options.json`
- Git / GitHub Spec Kit extension - Provides feature branch, remote detection, validation, initialization, and auto-commit commands.
  - SDK/Client: Git CLI commands described by `.gemini/.specify/extensions/git/extension.yml`
  - Auth: Uses local Git/GitHub setup if remote operations are used; no repo secrets detected
  - Status: Installed/configured through `.gemini/.specify/extensions.yml`

**Specified Routing Tools:**
- Context7 - Specified for third-party API/library documentation lookup in `docs/prd.md` and `.ai/constitution.md`.
  - SDK/Client: Not implemented in repo
  - Auth: Not detected
  - Status: Specified only
- GitNexus - Specified for impact analysis and dependency graph work in `docs/prd.md`.
  - SDK/Client: Not implemented in repo
  - Auth: Not detected
  - Status: Specified only
- Serena - Specified for symbol lookup/source-of-truth discovery in `docs/prd.md`; local project config exists at `.serena/project.yml`.
  - SDK/Client: Serena project config
  - Auth: Not detected
  - Status: Configured locally, no app integration
- Semble - Specified for semantic discovery in `docs/prd.md`.
  - SDK/Client: Not implemented in repo
  - Auth: Not detected
  - Status: Specified only
- Promptfoo/custom validator - Specified for future spec validation in `docs/prd.md`.
  - SDK/Client: Not implemented in repo
  - Auth: Not detected
  - Status: Specified only
- Playwright / GStack QA - Specified for browser/manual QA in `docs/prd.md`.
  - SDK/Client: Not implemented in repo
  - Auth: Not detected
  - Status: Specified only

## Data Storage

**Databases:**
- Not detected.
  - Connection: No database connection variables or config files detected
  - Client: No ORM/client detected
  - Status: No database implementation exists

**File Storage:**
- Local repository files only.
  - Planning/state files live under `.ai/`, `docs/`, `.gemini/`, `.claude/`, `.agents/`, and `.planning/`.
  - No cloud file storage integration detected.

**Caching:**
- Serena local cache directory exists at `.serena/cache/` and is ignored by `.gitignore`.
- No application cache service detected.

## Authentication & Identity

**Auth Provider:**
- Not detected.
  - Implementation: No OAuth/Auth0/Firebase/Supabase/custom auth code or config detected.
  - Status: Not applicable to current documentation/protocol repository.

## Monitoring & Observability

**Error Tracking:**
- None detected.

**Logs:**
- No logging service detected.
- `.gitignore` excludes `*.log` and `logs/`.
- AI workflow session artifacts are represented by `.ai/sessions/`, with the expected structure described in `docs/prd.md` and `.ai/constitution.md`.

## CI/CD & Deployment

**Hosting:**
- None detected.
- No Dockerfile, deployment manifest, cloud config, or hosting config was found.

**CI Pipeline:**
- None detected.
- No GitHub Actions, GitLab CI, CircleCI, or equivalent pipeline config was found.

## Environment Configuration

**Required env vars:**
- None detected for the current repo.
- GStack uses a required global filesystem path, not an env var: `~/.claude/skills/gstack/bin`, referenced in `CLAUDE.md` and `.claude/hooks/check-gstack.sh`.

**Secrets location:**
- No secret files detected.
- `.gitignore` explicitly excludes `.env`, `.env.local`, `.env.development.local`, `.env.test.local`, `.env.production.local`, `*.env`, `*.pem`, and `*.key`.

## Webhooks & Callbacks

**Incoming:**
- None implemented.
- `docs/prd.md` includes a payment webhook example around `PaymentWebhookController`, but it is illustrative protocol guidance, not source code in this repository.

**Outgoing:**
- None implemented.
- `docs/prd.md` mentions optional notification channels such as Slack, Telegram, GitHub issue, and PR comment for human review packets, but no integration code or credentials exist.

## Cloud Services

- No AWS, Azure, GCP, Vercel, Netlify, Fly.io, Railway, Supabase, Firebase, Neon, or other cloud service config detected.
- Current external dependencies are local/agent workflow tools rather than deployed cloud services.

---

*Integration audit: 2026-05-24*
