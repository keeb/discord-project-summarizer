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
  version: "2026.02.14.4",
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
      description: "List PRs from GitHub using the gh CLI",
      arguments: z.object({
        since: z.string().datetime().optional(),
        sinceDays: z.number().int().positive().optional(),
      }),
      execute: async (args, context) => {
        const { owner, repo, state, limit } = context.globalArgs;

        const cmd = new Deno.Command("gh", {
          args: [
            "pr", "list",
            "--repo", `${owner}/${repo}`,
            "--state", state,
            "--limit", String(limit),
            "--json", "number,title,url,mergedAt,author,body,closedAt",
          ],
          stdout: "piped",
          stderr: "piped",
        });

        const output = await cmd.output();
        if (!output.success) {
          const stderr = new TextDecoder().decode(output.stderr);
          throw new Error(`gh CLI error: ${stderr}`);
        }

        const prsRaw = JSON.parse(new TextDecoder().decode(output.stdout));
        const sinceDate = args.since
          ? new Date(args.since)
          : new Date(Date.now() - (args.sinceDays || 1) * 24 * 60 * 60 * 1000);

        const pullRequests = prsRaw
          .filter((pr) => {
            if (state === "merged" && !pr.mergedAt) return false;
            const closedAt = pr.closedAt ? new Date(pr.closedAt) : null;
            return closedAt && closedAt >= sinceDate;
          })
          .map((pr) => ({
            number: pr.number,
            title: pr.title,
            url: pr.url,
            mergedAt: pr.mergedAt ?? null,
            author: pr.author?.login ?? "unknown",
            body: pr.body ? pr.body.replace(/\$\{\{.*?\}\}/g, "") : null,
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
