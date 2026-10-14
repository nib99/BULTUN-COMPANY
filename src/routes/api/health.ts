import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const { dbSource } = await import("@/lib/db");
        const { env } = await import("@/lib/env.server");
        return Response.json(
          {
            ok: true,
            db: dbSource,
            telegramBot: Boolean(env("TELEGRAM_BOT_TOKEN")),
            telegramWebhook: Boolean(env("TELEGRAM_WEBHOOK_SECRET")),
          },
          { headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});
