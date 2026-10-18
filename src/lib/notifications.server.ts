// src/lib/notifications.server.ts
import { createHash, createPrivateKey, createSign, createECDH, randomBytes, createCipheriv, createHmac } from "node:crypto";
import { env } from "@/lib/env.server";

const b64url = (input: Buffer) =>
  input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

const fromB64url = (value: string) =>
  Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4), "base64");

function hkdfExtract(salt: Buffer, ikm: Buffer) {
  return createHmac("sha256", salt).update(ikm).digest();
}

function hkdfExpand(prk: Buffer, info: Buffer, length: number) {
  const blocks: Buffer[] = [];
  let previous = Buffer.alloc(0);
  for (let i = 1; Buffer.concat(blocks).length < length; i += 1) {
    previous = createHmac("sha256", prk).update(Buffer.concat([previous, info, Buffer.from([i])])).digest();
    blocks.push(previous);
  }
  return Buffer.concat(blocks).subarray(0, length);
}

function vapidPublicKey(privateKeyB64: string) {
  const d = fromB64url(privateKeyB64);
  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(d);
  return ecdh.getPublicKey();
}

function vapidJwt(endpoint: string, subject: string, privateKeyB64: string) {
  const audience = new URL(endpoint).origin;
  const header = b64url(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = b64url(
    Buffer.from(
      JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: subject,
      }),
    ),
  );
  const signingInput = `\( {header}. \){payload}`;
  const d = fromB64url(privateKeyB64);
  const ecdh = createECDH("prime256v1");
  ecdh.setPrivateKey(d);
  const publicKey = ecdh.getPublicKey();
  const sec1 = Buffer.concat([
    Buffer.from("30770201010420", "hex"),
    d,
    Buffer.from("a00a06082a8648ce3d030107a144034200", "hex"),
    publicKey,
  ]);
  const key = createPrivateKey({ key: sec1, format: "der", type: "sec1" });
  const signer = createSign("SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign({ key, dsaEncoding: "ieee-p1363" });
  return `\( {signingInput}. \){b64url(signature)}`;
}

function encryptWebPush(payload: string, p256dhB64: string, authB64: string) {
  // Keep your existing encryptWebPush implementation here (unchanged)
  // ... (copy the full function body from the original file)
}

async function sendNativePush(endpoint: string, p256dh: string, auth: string, body: string) {
  const privateKey = env("VAPID_PRIVATE_KEY");
  const subject = env("VAPID_SUBJECT");
  if (!privateKey || !subject) return { ok: false, code: "not_configured" as const };

  // Keep the rest of your existing sendNativePush body here
  // ...
}

export async function notifyUser(userId: string, title: string, message: string, url: string) {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const rows = await sql<{ id: string; endpoint: string; p256dh: string; auth: string }>`
    select id, endpoint, p256dh, auth from push_subscriptions where user_id = ${userId}
  `;
  for (const subscription of rows) {
    const result = await sendNativePush(
      subscription.endpoint,
      subscription.p256dh,
      subscription.auth,
      JSON.stringify({ title, body: message, url }),
    );
    if (!result.ok && "status" in result && result.status === 410) {
      await sql`delete from push_subscriptions where id = ${subscription.id}`;
    }
  }
}

async function telegramSend(chatId: string, text: string) {
  const token = env("TELEGRAM_BOT_TOKEN");
  if (!token) return false;
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
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

  const response = await fetch(`https://graph.facebook.com/\( {version}/ \){phoneNumberId}/messages`, {
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
  const chatIds = [
    ...new Set([...linked.map((row) => row.telegram_user_id), ...(ownerChat ? [ownerChat] : [])]),
  ];
  const telegramText = `🔔 BULTUM COMPANY inquiry\n\nBuyer: ${args.buyerName}\nListing: ${args.title}\nMessage: \( {args.message}\n\n \){args.url}`;

  for (const chatId of chatIds) {
    try {
      await telegramSend(chatId, telegramText);
    } catch {
      /* fail-open */
    }
  }

  const ownerWhatsApp = env("WHATSAPP_OWNER_NUMBER");
  if (ownerWhatsApp) {
    try {
      await whatsappTemplateSend(ownerWhatsApp, args.buyerName, args.title, args.message, args.url);
    } catch {
      /* fail-open */
    }
  }
}
