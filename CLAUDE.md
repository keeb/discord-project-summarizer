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

### daily-summary

Main workflow that fetches PRs, generates a summary, and posts to Discord.

```
fetch-prs → generate-summary → post-to-discord
```

**Steps:**
1. `fetch-prs` - Runs `daily_pr_fetch_gh.list()` to fetch closed PRs from GitHub REST API
2. `generate-summary` - Runs `daily_summary_generator.generate()` to create a summary with Claude
3. `post-to-discord` - Runs `daily_discord_post.send()` to post to Discord webhook

## Model Data Flow

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

## Models

| Model | Type | Purpose |
|-------|------|---------|
| `daily_pr_fetch_gh` | @user/github/gh-pr-list | Fetch closed PRs from GitHub REST API (extension) |
| `daily_summary_generator` | @user/anthropic/claude | Generate summary with Claude (extension) |
| `daily_discord_post` | @user/discord/webhook | Post to Discord webhook (extension) |

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

## Prerequisites

- `ANTHROPIC_API_KEY` in vault (`swamp vault put secrets ANTHROPIC_API_KEY <key>`)
- `DISCORD_WEBHOOK_URL` in vault (`swamp vault put secrets DISCORD_WEBHOOK_URL <url>`)

## Running Locally

```bash
# Run the full workflow
swamp workflow run daily-summary --json

# Test PR fetching only
swamp model method run daily_pr_fetch_gh list --json
```
