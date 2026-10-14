import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";

const hits = new Map<string, number[]>();

function allow(limit: number) {
  const now = Date.now();
  const recent = (hits.get("tg") ?? []).filter((stamp) => now - stamp < 60_000);
  if (recent.length >= limit) return false;
  recent.push(now);
  hits.set("tg", recent);
  return true;
}

export type TelegramAuthResult =
  | { ok: true; code: "valid"; telegramUserId: string }
  | { ok: false; code: "not_configured" | "malformed" | "bad_signature" | "expired" | "missing_user" | "rate_limited" };

/**
 * Checks a Telegram Mini App launch payload.
 * Does not create a session. Web sign-in stays on Better Auth.
 * initDataUnsafe is never accepted here — only the raw signed string.
 */
export const checkTelegramLaunch = createServerFn({ method: "POST" })
  .validator((input: unknown) => z.object({ initData: z.string().min(1).max(8000) }).parse(input))
  .handler(async ({ data }): Promise<TelegramAuthResult> => {
    if (!allow(30)) return { ok: false, code: "rate_limited" };
    const { env } = await import("@/lib/env.server");
    const token = env("TELEGRAM_BOT_TOKEN");
    if (!token) return { ok: false, code: "not_configured" };
    const { validateTelegramInitData } = await import("./validate.server");
    const result = validateTelegramInitData(data.initData, token);
    if (!result.ok) return { ok: false, code: result.code };
    return { ok: true, code: "valid", telegramUserId: result.user.id };
  });


/** Link a previously verified Telegram identity to the currently authenticated app user. */
export const linkTelegramIdentity = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ telegramUserId: z.string().regex(/^\d{1,20}$/), username: z.string().max(32).optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    const existing = await sql<{ user_id: string }>`
      select user_id from telegram_identities where telegram_user_id = ${data.telegramUserId}
    `;
    if (existing[0] && existing[0].user_id !== context.userId) throw new Error("telegram_already_linked");
    await sql`
      insert into telegram_identities (telegram_user_id, user_id, username)
      values (${data.telegramUserId}, ${context.userId}, ${data.username ?? null})
      on conflict (telegram_user_id) do update set username = excluded.username, user_id = excluded.user_id
    `;
    return { ok: true as const };
  });
