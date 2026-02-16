import { z } from "npm:zod@4";

const GlobalArgsSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  state: z.enum(["open", "closed", "merged", "all"]).default("closed"),
  limit: z.number().int().positive().default(100),
});

const PullRequestSchema = z.object({
  number: z.number().int(),
  title: z.string(),
  url: z.string().url(),
  mergedAt: z.string().datetime().nullable(),
  author: z.string(),
  body: z.string().nullable(),
});

const ResultSchema = z.object({
  pullRequests: z.array(PullRequestSchema),
  fetchedAt: z.string().datetime(),
  owner: z.string(),
  repo: z.string(),
});

export const model = {
  type: "@user/github/gh-pr-list",
  version: "2026.02.14.2",
  globalArguments: GlobalArgsSchema,
  resources: {
    result: {
      description: "Fetched pull requests",
      schema: ResultSchema,
      lifetime: "infinite",
      garbageCollection: 10,
    },
  },
  methods: {
    list: {
      description: "List PRs from GitHub using the public API",
      arguments: z.object({
        since: z.string().datetime().optional(),
      }),
      execute: async (args, context) => {
        const { owner, repo, state, limit } = context.globalArgs;

        const apiState = state === "merged" ? "closed" : state;
        const url = `https://api.github.com/repos/${owner}/${repo}/pulls?state=${apiState}&per_page=${limit}&sort=updated&direction=desc`;

        const response = await fetch(url, {
          headers: {
            Accept: "application/vnd.github+json",
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `GitHub API error (${response.status}): ${errorText}`,
          );
        }

        const prsRaw = await response.json();
        const sinceDate = args.since
          ? new Date(args.since)
          : new Date(Date.now() - 24 * 60 * 60 * 1000);

        const pullRequests = prsRaw
          .filter((pr) => {
            if (state === "merged" && !pr.merged_at) return false;
            const closedAt = pr.closed_at ? new Date(pr.closed_at) : null;
            return closedAt && closedAt >= sinceDate;
          })
          .map((pr) => ({
            number: pr.number,
            title: pr.title,
            url: pr.html_url,
            mergedAt: pr.merged_at ?? null,
            author: pr.user?.login ?? "unknown",
            body: pr.body ?? null,
          }));

        const handle = await context.writeResource("result", "result", {
          pullRequests,
          fetchedAt: new Date().toISOString(),
          owner,
          repo,
        });

        return { dataHandles: [handle] };
      },
    },
  },
};
