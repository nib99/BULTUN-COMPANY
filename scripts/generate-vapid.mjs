import { createECDH, randomBytes } from "node:crypto";

const ecdh = createECDH("prime256v1");
ecdh.setPrivateKey(randomBytes(32));
const privateKey = ecdh.getPrivateKey().toString("base64url");
const publicKey = ecdh.getPublicKey().toString("base64url");
console.log("Add these to Vercel Production Environment Variables:");
console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log("VAPID_SUBJECT=mailto:you@your-domain.com");
console.log("");
console.log("For the browser build also add:");
console.log(`VITE_VAPID_PUBLIC_KEY=${publicKey}`);
