import { z } from "npm:zod@4";

const GlobalArgsSchema = z.object({
  baseUrl: z.string().url().default("https://swamp.club"),
  sinceDays: z.number().int().positive().default(1),
});

const ExtensionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  repository: z.string().nullable(),
  platforms: z.array(z.string()),
  labels: z.array(z.string()),
  contentTypes: z.array(z.string()),
  contentNames: z.array(z.string()),
  latestVersion: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const SummarySchema = z.object({
  byNamespace: z.record(z.string(), z.number()),
  byContentType: z.record(z.string(), z.number()),
  highlighted: z.array(ExtensionSchema),
  fetchedAt: z.string().datetime(),
});

const ResultSchema = z.object({
  extensions: z.array(ExtensionSchema),
  total: z.number().int(),
  since: z.string(),
  browseUrl: z.string().url(),
  summary: SummarySchema,
});

export const model = {
  type: "@user/swamp-club/extensions",
  version: "2026.03.27.1",
  globalArguments: GlobalArgsSchema,
  resources: {
    result: {
      description: "New extensions from swamp.club",
      schema: ResultSchema,
      lifetime: "infinite",
      garbageCollection: 10,
    },
  },
  methods: {
    list: {
      description:
        "Fetch extensions published within the sinceDays window from swamp.club",
      arguments: z.object({}),
      execute: async (args, context) => {
        const { baseUrl, sinceDays } = context.globalArgs;
        const createdAfter = new Date(
          Date.now() - sinceDays * 24 * 60 * 60 * 1000,
        ).toISOString();
        const browseDate = createdAfter.slice(0, 10);
        const browseUrl = `${baseUrl}/extensions?createdAfter=${browseDate}`;

        context.logger.info(
          "Fetching extensions created after {since} from {baseUrl}",
          { since: createdAfter, baseUrl },
        );

        // Paginate through all results
        var allExtensions = [];
        var page = 1;
        var totalPages = 1;

        while (page <= totalPages) {
          const url = `${baseUrl}/api/v1/extensions/search?createdAfter=${encodeURIComponent(createdAfter)}&sort=new&perPage=100&page=${page}`;
          const response = await fetch(url);
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `Swamp Club API error (${response.status}): ${errorText}`,
            );
          }
          const data = await response.json();
          allExtensions = allExtensions.concat(data.extensions);
          totalPages = Math.ceil(data.meta.total / data.meta.perPage);
          context.logger.info("Fetched page {page}/{totalPages} ({count} extensions)", {
            page: String(page),
            totalPages: String(totalPages),
            count: String(data.extensions.length),
          });
          page++;
        }

        context.logger.info("Total extensions fetched: {total}", {
          total: String(allExtensions.length),
        });

        // Aggregate by namespace
        const byNamespace = {};
        for (const ext of allExtensions) {
          const match = ext.name.match(/^(@[^/]+)\//);
          const ns = match ? match[1] : "unscoped";
          byNamespace[ns] = (byNamespace[ns] || 0) + 1;
        }

        // Aggregate by content type
        const byContentType = {};
        for (const ext of allExtensions) {
          for (const ct of ext.contentTypes || []) {
            byContentType[ct] = (byContentType[ct] || 0) + 1;
          }
        }

        // Pick highlighted extensions: prefer those with description + repository or multiple content types
        const highlighted = allExtensions
          .filter(
            (ext) =>
              ext.description &&
              ext.description.length > 10 &&
              (ext.repository || (ext.contentTypes && ext.contentTypes.length > 1)),
          )
          .slice(0, 5);

        // If the heuristic found fewer than 5, fill from the top of the list
        if (highlighted.length < 5) {
          for (const ext of allExtensions) {
            if (highlighted.length >= 5) break;
            if (!highlighted.find((h) => h.id === ext.id)) {
              highlighted.push(ext);
            }
          }
        }

        const result = {
          extensions: allExtensions,
          total: allExtensions.length,
          since: createdAfter,
          browseUrl,
          summary: {
            byNamespace,
            byContentType,
            highlighted: highlighted.slice(0, 5),
            fetchedAt: new Date().toISOString(),
          },
        };

        const dataHandle = await context.writeResource(
          "result",
          "result",
          result,
        );
        return { dataHandles: [dataHandle] };
      },
    },
  },
};
