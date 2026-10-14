import { env } from "@/lib/env.server";
import { timingSafeEqual } from "node:crypto";

function sameSecret(expected: string, received: string) {
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

const welcome = {
  en: "BULTUM COMPANY. Open the yard to browse cars, trucks, and machines across Ethiopia.",
  am: "BULTUM COMPANY መኪና እና ማሽነሪ። መኪና፣ የጭነት መኪና እና ማሽን ለማየት ግቢውን ይክፈቱ።",
  om: "BULTUM COMPANY konkolaataa fi maashinoota. Konkolaataa, fe'umsaa fi maashina ilaaluuf dirree bani.",
  so: "BULTUM COMPANY baabuur iyo mashiin. Fur barxadda si aad u aragto baabuurta, xamuulka, iyo mashiinnada.",
};

/**
 * Telegram webhook. Rejects callers who do not present the configured secret.
 * Duplicate update ids are ignored. Never logs the bot token.
 */
export async function handleTelegramWebhook(request: Request): Promise<Response> {
  const secret = env("TELEGRAM_WEBHOOK_SECRET");
  const token = env("TELEGRAM_BOT_TOKEN");
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
    });

  if (!secret || !token) return json({ ok: false, code: "not_configured" }, 503);
  const header = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!sameSecret(secret, header)) return json({ ok: false, code: "unauthorized" }, 401);

  let update: { update_id?: unknown; message?: { text?: string; chat?: { id?: number } } };
  try {
    update = (await request.json()) as typeof update;
  } catch {
    return json({ ok: false, code: "malformed" }, 400);
  }
  if (typeof update.update_id !== "number" || !Number.isSafeInteger(update.update_id)) {
    return json({ ok: false, code: "malformed" }, 400);
  }

  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const inserted = await sql<{ update_id: string }>`
    insert into telegram_updates (update_id) values (${String(update.update_id)})
    on conflict (update_id) do nothing
    returning update_id
  `;
  if (!inserted.length) return json({ ok: true, duplicate: true });

  const text = update.message?.text?.trim() ?? "";
  const chatId = update.message?.chat?.id;
  if (text === "/start" && typeof chatId === "number") {
    const appUrl = env("APP_PUBLIC_URL");
    const button = appUrl ? [[{ text: "Open BULTUM", web_app: { url: appUrl } }]] : undefined;
    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `${welcome.en}\n\n${welcome.am}`,
          reply_markup: button ? { inline_keyboard: button } : undefined,
        }),
      });
    } catch {
      /* The update is already recorded. Telegram should not retry forever. */
    }
  }
  return json({ ok: true });
}
