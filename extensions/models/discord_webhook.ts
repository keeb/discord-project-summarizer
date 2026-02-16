import { z } from "npm:zod@4";

const ResultSchema = z.object({
  success: z.boolean(),
  statusCode: z.number().int(),
  timestamp: z.string().datetime(),
});

const GlobalArgsSchema = z.object({
  webhookUrl: z.string(),
});

export const model = {
  type: "@user/discord/webhook",
  version: "2026.02.14.2",
  globalArguments: GlobalArgsSchema,
  resources: {
    result: {
      description: "Discord webhook post result",
      schema: ResultSchema,
      lifetime: "infinite",
      garbageCollection: 10,
    },
  },
  methods: {
    send: {
      description: "Send a message to Discord via webhook",
      arguments: z.object({
        content: z.string(),
        username: z.string().optional(),
      }),
      execute: async (args, context) => {
        const { webhookUrl } = context.globalArgs;

        const body = {
          content: args.content,
          ...(args.username ? { username: args.username } : {}),
        };

        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Discord webhook error (${response.status}): ${errorText}`,
          );
        }

        const handle = await context.writeResource("result", "result", {
          success: true,
          statusCode: response.status,
          timestamp: new Date().toISOString(),
        });

        return { dataHandles: [handle] };
      },
    },
  },
};
