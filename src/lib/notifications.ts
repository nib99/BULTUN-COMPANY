import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash } from "node:crypto";
import { authMiddleware } from "@/lib/auth/middleware";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(20).max(200),
    auth: z.string().min(8).max(100),
  }),
});

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => subscriptionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const id = createHash("sha256").update(data.endpoint).digest("hex");
    await sql`
      insert into push_subscriptions (id, user_id, endpoint, p256dh, auth)
      values (${id}, ${context.userId}, ${data.endpoint}, ${data.keys.p256dh}, ${data.keys.auth})
      on conflict (endpoint) do update
        set user_id = excluded.user_id,
            p256dh = excluded.p256dh,
            auth = excluded.auth,
            updated_at = now()
    `;
    return { ok: true as const };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ endpoint: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`
      delete from push_subscriptions
      where endpoint = ${data.endpoint} and user_id = ${context.userId}
    `;
    return { ok: true as const };
  });
