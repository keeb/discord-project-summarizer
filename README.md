# Discord Project Summarizer

Automated daily PR summaries for GitHub repositories, delivered to Discord. Built with [swamp](https://github.com/systeminit/swamp) for AI-native automation.

## What it does

1. **Fetches PRs** - Queries the GitHub REST API for recently closed pull requests
2. **Generates summaries** - Sends PR data to Claude for intelligent summarization
3. **Posts to Discord** - Delivers the summary to a Discord channel via webhook

## Prerequisites

- [swamp](https://github.com/systeminit/swamp) - AI-native automation CLI
- Anthropic API key - For Claude summaries
- Discord webhook URL - For posting summaries

## Setup

1. Clone this repository:
   ```bash
   git clone https://github.com/keeb/discord-project-summarizer.git
   cd discord-project-summarizer
   ```

2. Store secrets in the swamp vault:
   ```bash
   swamp vault put secrets ANTHROPIC_API_KEY <your-key>
   swamp vault put secrets DISCORD_WEBHOOK_URL <your-url>
   ```

3. Verify the setup:
   ```bash
   swamp model search
   swamp workflow search
   ```

## Running

### Run the full workflow

```bash
swamp workflow run daily-summary
```

### Test individual steps

```bash
# Fetch PRs only
swamp model method run daily_pr_fetch_gh list

# Generate summary (requires PRs to be fetched first)
swamp model method run daily_summary_generator generate
```

## Models

| Model | Type | Description |
|-------|------|-------------|
| `daily_pr_fetch_gh` | `@user/github/gh-pr-list` | Fetches closed PRs from GitHub REST API |
| `daily_summary_generator` | `@user/anthropic/claude` | Generates PR summaries with Claude |
| `daily_discord_post` | `@user/discord/webhook` | Posts to Discord via webhook |

## Workflows

| Workflow | Description |
|----------|-------------|
| `daily-summary` | Fetch PRs, generate summary, post to Discord |
| `generate-summary` | Fetch PRs and generate summary (no Discord post) |

## Extension Models

Custom model types in `extensions/models/`:

- **`github_gh_pr_list.ts`** - Fetches PRs from the public GitHub REST API (no auth required)
- **`anthropic_claude.ts`** - Calls the Anthropic Messages API to generate text with Claude
- **`discord_webhook.ts`** - Posts messages to Discord via webhook URL

## Configuration

The PR fetch model is configured to watch `systeminit/swamp`. To change the repository:

```bash
swamp model edit daily_pr_fetch_gh
```

Update the `owner` and `repo` global arguments.
