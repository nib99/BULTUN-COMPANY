# DALALA Motors & Machinery — production blueprint

## Product
Mobile-first Ethiopian marketplace for cars, trucks, heavy machinery and agricultural machinery. Primary UI languages: English, Afaan Oromoo and Amharic. Telegram is supported as a Mini App entry point, listing-share channel and verified identity-linking channel.

## Required production environment

- `DATABASE_URL` — production PostgreSQL/Neon connection string
- `BETTER_AUTH_URL` — exact public HTTPS origin
- `VITE_AUTH_ENABLED=true`
- `GROK_AUTH_ISSUER`, `GROK_AUTH_CLIENT_ID`, `GROK_AUTH_CLIENT_SECRET` — production authentication broker values used by this workspace
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `APP_PUBLIC_URL` — public HTTPS URL used in Telegram buttons
- `TELEGRAM_WEBHOOK_URL` — `${APP_PUBLIC_URL}/api/telegram/webhook`

Do not commit secrets. Add them to Vercel Project Settings → Environment Variables.

## Deploy

1. Push this folder to GitHub.
2. Import the repository into Vercel.
3. Select the Vite project. `vercel.json` already uses `npm ci --include=dev --no-audit --no-fund` and `npm run build`.
4. Add all production environment variables.
5. Deploy.
6. Verify `https://YOUR-DOMAIN/api/health`.

## Telegram

After the first production deployment:

```bash
TELEGRAM_BOT_TOKEN=... \
TELEGRAM_WEBHOOK_SECRET=... \
TELEGRAM_WEBHOOK_URL=https://YOUR-DOMAIN/api/telegram/webhook \
node scripts/configure-telegram.mjs
```

The webhook rejects requests without Telegram's configured secret header. The server validates Telegram Mini App `initData` using the bot token, rejects stale payloads, deduplicates update IDs, and can link a verified Telegram identity to the signed-in marketplace account.

For a listing share/deep link, the app can open a Telegram share URL. For Mini App launch links, configure the bot's menu button to the public app URL and use `startapp=l_<listing-id>` when opening a specific listing.

## PWA

The app includes a manifest, safe-area mobile navigation and a service worker. HTTPS is required in production for service workers. Android Chrome users can install it from the browser's install/add-to-home-screen flow.

## SEO

The marketplace has locale-aware page titles/descriptions, Open Graph metadata, semantic headings, crawlable listing URLs and lightweight assets. Replace any company-domain placeholders with the real production domain before launch and add a generated sitemap for every public listing/category URL.

## Business production gates

Before accepting real customer money: use a contracted Ethiopian payment provider with server-to-server webhook verification, idempotency, signed callbacks and reconciliation. Do not treat a database `payment_orders` row as proof that money was received. Also add object storage for seller photos, image processing, rate limiting backed by Redis/KV, error monitoring, backups and an admin moderation console.
