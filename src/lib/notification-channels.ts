import { env } from "@/lib/env.server";

async function telegramSend(chatId: string, text: string) {
  const token = env("TELEGRAM_BOT_TOKEN");
  if (!token || !chatId) return false;
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
  });
  return response.ok;
}

async function whatsappTemplateSend(to: string, buyerName: string, title: string, message: string, url: string) {
  const token = env("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = env("WHATSAPP_PHONE_NUMBER_ID");
  const template = env("WHATSAPP_TEMPLATE_NAME");
  const language = env("WHATSAPP_TEMPLATE_LANGUAGE") || "en_US";
  const version = env("WHATSAPP_GRAPH_VERSION") || "v23.0";
  if (!token || !phoneNumberId || !template || !to) return false;

  const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace(/\D/g, ""),
      type: "template",
      template: {
        name: template,
        language: { code: language },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: buyerName.slice(0, 80) },
              { type: "text", text: title.slice(0, 120) },
              { type: "text", text: message.slice(0, 240) },
              { type: "text", text: url.slice(0, 500) },
            ],
          },
        ],
      },
    }),
  });
  return response.ok;
}

export async function notifyInquiryChannels(args: {
  sellerUserId: string;
  buyerName: string;
  buyerEmail: string;
  title: string;
  message: string;
  url: string;
}) {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const linked = await sql<{ telegram_user_id: string }>`
    select telegram_user_id from telegram_identities where user_id = ${args.sellerUserId}
  `;
  const ownerChat = env("TELEGRAM_OWNER_CHAT_ID");
  const chatIds = [...new Set([...linked.map((row) => row.telegram_user_id), ...(ownerChat ? [ownerChat] : [])])];
  const telegramText = `🔔 BULTUM COMPANY inquiry\n\nBuyer: ${args.buyerName}\nListing: ${args.title}\nMessage: ${args.message}\n\n${args.url}`;

  for (const chatId of chatIds) {
    try {
      await telegramSend(chatId, telegramText);
    } catch {
      /* Never block an inquiry because a notification channel is unavailable. */
    }
  }

  const ownerWhatsApp = env("WHATSAPP_OWNER_NUMBER");
  if (ownerWhatsApp) {
    try {
      await whatsappTemplateSend(ownerWhatsApp, args.buyerName, args.title, args.message, args.url);
    } catch {
      /* Same fail-open behavior for external messaging. */
    }
  }
}
