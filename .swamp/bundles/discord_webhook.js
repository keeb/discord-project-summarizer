// extensions/models/discord_webhook.ts
const { z } = globalThis.__swamp_zod;
var ResultSchema = z.object({
  success: z.boolean(),
  statusCode: z.number().int(),
  timestamp: z.string().datetime()
});
var GlobalArgsSchema = z.object({
  webhookUrl: z.string()
});
var model = {
  type: "@user/discord/webhook",
  version: "2026.02.14.2",
  globalArguments: GlobalArgsSchema,
  resources: {
    result: {
      description: "Discord webhook post result",
      schema: ResultSchema,
      lifetime: "infinite",
      garbageCollection: 10
    }
  },
  methods: {
    send: {
      description: "Send a message to Discord via webhook",
      arguments: z.object({
        content: z.string(),
        username: z.string().optional()
      }),
      execute: async (args, context) => {
        const { webhookUrl } = context.globalArgs;
        let content = args.content;
        if (content.length > 2e3) {
          content = content.slice(0, 1997) + "...";
        }
        const body = {
          content,
          ...args.username ? {
            username: args.username
          } : {}
        };
        const response = await fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Discord webhook error (${response.status}): ${errorText}`);
        }
        const handle = await context.writeResource("result", "result", {
          success: true,
          statusCode: response.status,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        });
        return {
          dataHandles: [
            handle
          ]
        };
      }
    }
  }
};
export {
  model
};
