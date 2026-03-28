<!-- BEGIN swamp managed section - DO NOT EDIT -->
# Project

This repository is managed with [swamp](https://github.com/systeminit/swamp).

## Rules

1. **Search before you build.** When automating AWS, APIs, or any external service: (a) search local types with `swamp model type search <query>`, (b) search community extensions with `swamp extension search <query>`, (c) if a community extension exists, install it with `swamp extension pull <package>` instead of building from scratch, (d) only create a custom extension model in `extensions/models/` if nothing exists. Use the `swamp-extension-model` skill for guidance. The `command/shell` model is ONLY for ad-hoc one-off shell commands, NEVER for wrapping CLI tools or building integrations.
2. **Extend, don't be clever.** When a model covers the domain but lacks the method you need, extend it with `export const extension` — don't bypass it with shell scripts, CLI tools, or multi-step hacks. One method, one purpose. Use `swamp model type describe <type> --json` to check available methods.
3. **Use the data model.** Once data exists in a model (via `lookup`, `start`, `sync`, etc.), reference it with CEL expressions. Don't re-fetch data that's already available.
4. **CEL expressions everywhere.** Wire models together with CEL expressions. Always prefer `data.latest("<name>", "<dataName>").attributes.<field>` over the deprecated `model.<name>.resource.<spec>.<instance>.attributes.<field>` pattern.
5. **Verify before destructive operations.** Always `swamp model get <name> --json` and verify resource IDs before running delete/stop/destroy methods.
6. **Prefer fan-out methods over loops.** When operating on multiple targets, use a single method that handles all targets internally (factory pattern) rather than looping N separate `swamp model method run` calls against the same model. Multiple parallel calls against the same model contend on the per-model lock, causing timeouts. A single fan-out method acquires the lock once and produces all outputs in one execution. Check `swamp model type describe` for methods that accept filters or produce multiple outputs.
7. **Extension npm deps are bundled, not lockfile-tracked.** Swamp's bundler inlines all npm packages (except zod) into extension bundles at bundle time. `deno.lock` and `package.json` do NOT cover extension model dependencies — this is by design. Always pin explicit versions in `npm:` import specifiers (e.g., `npm:lodash-es@4.17.21`).
8. **Reports for reusable data pipelines.** When the task involves building a repeatable pipeline to transform, aggregate, or analyze model output (security reports, cost analysis, compliance checks, summaries), create a report extension. Use the `swamp-report` skill for guidance.

## Skills

**IMPORTANT:** Always load swamp skills, even when in plan mode. The skills provide
essential context for working with this repository.

- `swamp-model` - Work with swamp models (creating, editing, validating)
- `swamp-workflow` - Work with workflows (creating, editing, running)
- `swamp-vault` - Manage secrets and credentials
- `swamp-data` - Manage model data lifecycle
- `swamp-report` - Create and run reports for models and workflows
- `swamp-repo` - Repository management
- `swamp-extension-model` - Create custom TypeScript models
- `swamp-extension-driver` - Create custom execution drivers
- `swamp-extension-datastore` - Create custom datastore backends
- `swamp-extension-vault` - Create custom vault providers
- `swamp-issue` - Submit bug reports and feature requests
- `swamp-troubleshooting` - Debug and diagnose swamp issues

## Getting Started

Always start by using the `swamp-model` skill to work with swamp models.

## Commands

Use `swamp --help` to see available commands.
<!-- END swamp managed section -->

# Project

This repository is managed with [swamp](https://github.com/systeminit/swamp).

## Getting Started

Always start by using the `swamp-model` skill to work with swamp models.

## Available Skills

Use these skills when working with swamp:

- **`swamp-model`** - Work with models: search types, create inputs, run methods
- **`swamp-workflow`** - Work with workflows: search, create, run workflows
- **`swamp-extension-model`** - Create custom TypeScript model types in `extensions/models/`

## File Locations

```
.swamp/
├── definitions/@user/<provider>/<type>/
│   └── <uuid>.yaml           # Model definition
└── workflows/
    └── workflow-<uuid>.yaml  # Workflow definition

extensions/
└── models/
    └── <name>.ts             # Custom TypeScript model types

models/                       # Symlink views (regenerated)
workflows/                    # Symlink views (regenerated)
```

## Expression Syntax

CEL expressions for referencing data between models:

```yaml
# Reference another model's resource data
${{ model.<name>.resource.<specName>.<instanceName>.attributes.<field> }}

# Reference environment variable
${{ env.VARIABLE_NAME }}
```

## Common Commands

```bash
# Model operations
swamp model search [query] --json
swamp model get <name> --json
swamp model method run <name> <method> --json

# Workflow operations
swamp workflow search [query] --json
swamp workflow run <name> --json

# Repository management
swamp repo index --json
```

## Workflow

| Workflow | Purpose | Command |
|----------|---------|---------|
| daily-summary | Core PR→summary→Discord flow | `swamp workflow run daily-summary --json` |
| extension-summary | New extensions→summary→Discord | `swamp workflow run extension-summary --json` |

### daily-summary

Main workflow that fetches PRs, generates a summary, and posts to Discord.

```
fetch-prs → generate-summary → post-to-discord
```

**Steps:**
1. `fetch-prs` - Runs `daily_pr_fetch_gh.list()` to fetch closed PRs from GitHub REST API
2. `generate-summary` - Runs `daily_summary_generator.generate()` to create a summary with Claude
3. `post-to-discord` - Runs `daily_discord_post.send()` to post to Discord webhook

### extension-summary

Fetches new extensions from swamp.club, summarizes them with Claude, and posts to Discord.

```
fetch-extensions → generate-summary → post-to-discord
```

**Steps:**
1. `fetch-extensions` - Runs `extension_fetch.list()` to fetch new extensions from swamp.club search API
2. `generate-summary` - Runs `extension_summary_generator.generate()` to create a summary with Claude
3. `post-to-discord` - Runs `extension_discord_post.send()` to post to Discord webhook

## Model Data Flow

### daily-summary
```
┌─────────────────────┐
│ daily_pr_fetch_gh   │  @user/github/gh-pr-list
│ (gh pr list)        │
└─────────┬───────────┘
          │ pullRequests[]
          ▼
┌─────────────────────┐
│ daily_summary_      │  @user/anthropic/claude
│ generator           │
└─────────┬───────────┘
          │ summary text
          ▼
┌─────────────────────┐
│ daily_discord_post  │  @user/discord/webhook
└─────────────────────┘
```

### extension-summary
```
┌─────────────────────────┐
│ extension_fetch         │  @user/swamp-club/extensions
│ (swamp.club search API) │
└─────────┬───────────────┘
          │ extensions[], summary stats, browseUrl
          ▼
┌─────────────────────────┐
│ extension_summary_      │  @user/anthropic/claude
│ generator               │
└─────────┬───────────────┘
          │ summary text
          ▼
┌─────────────────────────┐
│ extension_discord_post  │  @user/discord/webhook
└─────────────────────────┘
```

## Models

| Model | Type | Purpose |
|-------|------|---------|
| `daily_pr_fetch_gh` | @user/github/gh-pr-list | Fetch closed PRs from GitHub REST API (extension) |
| `daily_summary_generator` | @user/anthropic/claude | Generate summary with Claude (extension) |
| `daily_discord_post` | @user/discord/webhook | Post to Discord webhook (extension) |
| `extension_fetch` | @user/swamp-club/extensions | Fetch new extensions from swamp.club API |
| `extension_summary_generator` | @user/anthropic/claude | Generate extension summary with Claude |
| `extension_discord_post` | @user/discord/webhook | Post extension summary to Discord |

## Extension Models

Custom models live in `extensions/models/`. These are user-defined TypeScript modules that extend swamp.

### github_gh_pr_list.ts

Fetches PRs from the public GitHub REST API (no authentication required for public repos).

**Type:** `@user/github/gh-pr-list`

**Global arguments:** `owner`, `repo`, `state`, `limit`

**Methods:**
- `list` - Fetch PRs matching the criteria (optional `since` argument)

### anthropic_claude.ts

Calls the Anthropic Messages API to generate text with Claude.

**Type:** `@user/anthropic/claude`

**Global arguments:** `model`, `systemPrompt`, `maxTokens`

**Methods:**
- `generate` - Generate text (requires `prompt` argument)

### discord_webhook.ts

Posts messages to a Discord channel via webhook URL.

**Type:** `@user/discord/webhook`

**Methods:**
- `send` - Send a message (requires `content`, optional `username`)

### swamp_club_extensions.ts

Fetches new extensions from the swamp.club search API with pagination and pre-aggregation.

**Type:** `@user/swamp-club/extensions`

**Global arguments:** `baseUrl`, `sinceDays`

**Methods:**
- `list` - Fetch extensions published within the sinceDays window, with summary stats and browse URL

## Prerequisites

- `ANTHROPIC_API_KEY` in vault (`swamp vault put secrets ANTHROPIC_API_KEY <key>`)
- `DISCORD_WEBHOOK_URL` in vault (`swamp vault put secrets DISCORD_WEBHOOK_URL <url>`)

## Running Locally

```bash
# Run the full workflow
swamp workflow run daily-summary --json

# Run the extension summary workflow
swamp workflow run extension-summary --json

# Test PR fetching only
swamp model method run daily_pr_fetch_gh list --json

# Test extension fetching only
swamp model method run extension_fetch list --json
```
