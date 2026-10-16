import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, createPrivateKey, createSign, createECDH, randomBytes, createCipheriv, createHmac } from "node:crypto";
import { authMiddleware } from "@/lib/auth/middleware";
import { env } from "@/lib/env.server";

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(8).max(100) }),
});

const b64url = (input: Buffer) => input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
const fromB64url = (value: string) => Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4), "base64");
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
  const payload = b64url(Buffer.from(JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, sub: subject })));
  const signingInput = `${header}.${payload}`;
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
  return `${signingInput}.${b64url(signature)}`;
}

function encryptWebPush(payload: string, p256dhB64: string, authB64: string) {
  const uaPublic = fromB64url(p256dhB64);
  const authSecret = fromB64url(authB64);
  const ephemeral = createECDH("prime256v1");
  ephemeral.generateKeys();
  const asPublic = ephemeral.getPublicKey();
  const sharedSecret = ephemeral.computeSecret(uaPublic);

  const prkKey = hkdfExtract(authSecret, sharedSecret);
  const info = Buffer.concat([Buffer.from("WebPush: info\0"), uaPublic, asPublic]);
  const ikm = hkdfExpand(prkKey, info, 32);
  const salt = randomBytes(16);
  const prk = hkdfExtract(salt, ikm);
  const cek = hkdfExpand(prk, Buffer.from("Content-Encoding: aes128gcm\0"), 16);
  const nonce = hkdfExpand(prk, Buffer.from("Content-Encoding: nonce\0"), 12);

  const plaintext = Buffer.concat([Buffer.from(payload, "utf8"), Buffer.from([2])]);
  const recordSize = 4096;
  if (plaintext.length + 16 + 1 + asPublic.length + 21 > recordSize) throw new Error("push_payload_too_large");
  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
  const header = Buffer.alloc(16 + 4 + 1);
  salt.copy(header, 0);
  header.writeUInt32BE(recordSize, 16);
  header.writeUInt8(asPublic.length, 20);
  return Buffer.concat([header, asPublic, ciphertext]);
}

async function sendNativePush(endpoint: string, p256dh: string, auth: string, body: string) {
  const privateKey = env("VAPID_PRIVATE_KEY");
  const subject = env("VAPID_SUBJECT");
  if (!privateKey || !subject) return { ok: false, code: "not_configured" as const };
  const publicKey = vapidPublicKey(privateKey);
  const jwt = vapidJwt(endpoint, subject, privateKey);
  const encrypted = encryptWebPush(body, p256dh, auth);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      TTL: "86400",
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      Authorization: `vapid t=${jwt}, k=${b64url(publicKey)}`,
    },
    body: encrypted,
  });
  return { ok: response.ok, status: response.status };
}

export async function notifyUser(userId: string, title: string, message: string, url: string) {
  const { getSql } = await import("@/lib/db");
  const sql = await getSql();
  const subscriptions = await sql<{ id: string; endpoint: string; p256dh: string; auth: string }>`
    select id, endpoint, p256dh, auth from push_subscriptions where user_id = ${userId}
  `;
  for (const subscription of subscriptions) {
    try {
      const result = await sendNativePush(subscription.endpoint, subscription.p256dh, subscription.auth, JSON.stringify({ title, body: message, url, icon: "/icons/bultum-icon-192.png" }));
      if (!result.ok && (result.status === 404 || result.status === 410)) {
        await sql`delete from push_subscriptions where id = ${subscription.id}`;
      }
    } catch {
      // A notification failure must never roll back the marketplace transaction.
    }
  }
}

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
      on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, updated_at = now()
    `;
    return { ok: true as const };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => z.object({ endpoint: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    const { getSql } = await import("@/lib/db");
    const sql = await getSql();
    await sql`delete from push_subscriptions where endpoint = ${data.endpoint} and user_id = ${context.userId}`;
    return { ok: true as const };
  });
