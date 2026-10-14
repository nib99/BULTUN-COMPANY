import { createHmac, timingSafeEqual } from "node:crypto";

/** Launch data older than this is rejected. Documented policy: one hour. */
export const TELEGRAM_INIT_MAX_AGE_SEC = 60 * 60;

export type TelegramLaunchUser = {
  id: string;
  username?: string;
};

export type TelegramCheck =
  | { ok: true; user: TelegramLaunchUser; authDate: number }
  | { ok: false; code: "malformed" | "bad_signature" | "expired" | "missing_user" };

/**
 * Validate Telegram Mini App initData.
 * Algorithm: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 * secret_key = HMAC_SHA256(bot_token, key "WebAppData")
 * Identity is read only after the signature matches.
 */
export function validateTelegramInitData(
  initData: string,
  botToken: string,
  nowSec = Math.floor(Date.now() / 1000),
  maxAgeSec = TELEGRAM_INIT_MAX_AGE_SEC,
): TelegramCheck {
  if (!initData || !botToken || initData.length > 8000) return { ok: false, code: "malformed" };
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return { ok: false, code: "malformed" };
  }
  const hash = params.get("hash");
  if (!hash || !/^[0-9a-f]{64}$/i.test(hash)) return { ok: false, code: "malformed" };

  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key === "hash") continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const dataCheck = pairs.join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computed = createHmac("sha256", secret).update(dataCheck).digest("hex");
  const a = Buffer.from(computed, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, code: "bad_signature" };
  }

  const authDate = Number(params.get("auth_date"));
  if (!Number.isFinite(authDate)) return { ok: false, code: "malformed" };
  if (authDate > nowSec + 60 || nowSec - authDate > maxAgeSec) {
    return { ok: false, code: "expired" };
  }

  const userRaw = params.get("user");
  if (!userRaw) return { ok: false, code: "missing_user" };
  try {
    const user = JSON.parse(userRaw) as { id?: number | string; username?: string };
    if (user.id === undefined || user.id === null) return { ok: false, code: "missing_user" };
    const id = String(user.id);
    if (!/^\d{1,20}$/.test(id)) return { ok: false, code: "missing_user" };
    const username =
      typeof user.username === "string" && /^[A-Za-z0-9_]{3,32}$/.test(user.username)
        ? user.username
        : undefined;
    return { ok: true, user: { id, username }, authDate };
  } catch {
    return { ok: false, code: "missing_user" };
  }
}
