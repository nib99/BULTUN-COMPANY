# BULTUM COMPANY — production deployment

BULTUM COMPANY is a mobile-first Ethiopian marketplace for cars, trucks, heavy machinery and agricultural equipment.

## Production stack

- Vite + React + TanStack Router
- Better Auth
- PostgreSQL (Neon or another managed PostgreSQL provider)
- Google OAuth
- Email/password authentication
- Telegram Bot + Telegram Mini App
- PWA install on Android/iOS browsers
- English, Afaan Oromoo and Amharic UI
- Vercel deployment

## Required Vercel environment variables

```text
DATABASE_URL=postgresql://...
BETTER_AUTH_URL=https://your-domain.example
BETTER_AUTH_SECRET=generate-a-long-random-secret
VITE_AUTH_ENABLED=true

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

TELEGRAM_BOT_TOKEN=...
TELEGRAM_WEBHOOK_SECRET=...
TELEGRAM_WEBHOOK_URL=https://your-domain.example/api/telegram/webhook
APP_PUBLIC_URL=https://your-domain.example
```

Never commit real secrets to GitHub.

## Google OAuth

Create a Google OAuth Web application in Google Cloud Console.

Production callback URL:

```text
https://your-domain.example/api/auth/callback/google
```

For a temporary Vercel URL, use that exact HTTPS hostname until the custom domain is connected.

## Email/password

Email/password is enabled in `src/lib/auth/email-password.ts` and is stored by Better Auth in PostgreSQL.

For production password reset and email verification, connect an email delivery provider and add Better Auth's `sendEmail` integration. Basic account creation and sign-in do not require a separate broker.

## Database

Use managed PostgreSQL in production. Run:

```text
npm run db:migrate
```

The production build already runs the migration command after the Vite build.

## Telegram

After deployment, set the three Telegram values above and run:

```text
npm run telegram:configure
```

The webhook endpoint is:

```text
/api/telegram/webhook
```

## PWA

The app manifest is `/manifest.webmanifest` and the app icons are:

```text
/bultum-icon-192.png
/bultum-icon-512.png
```

The installed app name is **BULTUM COMPANY** and the short name is **BULTUM**.

## Brand

The primary product name is **BULTUM COMPANY**. The visual identity uses a bold B + excavator/machinery mark, deep navy, white and construction yellow.

## Media uploads

The current marketplace data model is prepared for listing media metadata. For a full production seller upload pipeline, connect direct-to-object-storage uploads (S3-compatible, Cloudflare R2, Supabase Storage, or another managed object store), validate file size/type server-side, generate thumbnails, and store only media keys/URLs in PostgreSQL.

Do not store large image/video binaries in PostgreSQL or Vercel's application filesystem.

## Commercial marketplace upgrade

This version adds:

- Seller/company profiles with phone, WhatsApp, website, logo, bio and verification state.
- Verified seller badges on inventory cards and listing pages. Verification is server-controlled; sellers can request review.
- Real photo/video uploads through signed Cloudinary uploads. Configure `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
- Up to 20 images and 1 video per listing. Media URLs and ordering are stored in PostgreSQL.
- Native Web Push subscriptions and server-side encrypted Web Push delivery. Run `npm run generate:vapid` and configure the VAPID variables.
- Inquiry notifications to linked seller Telegram accounts and the optional `TELEGRAM_OWNER_CHAT_ID`.
- Optional WhatsApp Business Cloud API template notifications using `WHATSAPP_*` variables. The template must be approved by Meta and contain four body placeholders: buyer name, listing title, message, listing URL.
- The supplied BULTUM logo/icon assets are used for the browser, PWA manifest, Apple touch icon, notification icon and in-app brand mark.

### Production environment additions

```text
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT
VITE_VAPID_PUBLIC_KEY
TELEGRAM_OWNER_CHAT_ID
WHATSAPP_OWNER_NUMBER
WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_TEMPLATE_NAME
WHATSAPP_TEMPLATE_LANGUAGE
WHATSAPP_GRAPH_VERSION
```

`DATABASE_URL` must point to a real PostgreSQL/Neon database in production. Do not upload `.env` or any secret values to GitHub.

## PWA branding

The supplied uploaded BULTUM assets are installed under both `public/` and `public/icons/` for compatibility. The PWA manifest uses:

- `/icons/bultum-icon-192.png`
- `/icons/bultum-icon-512.png`
- `/icons/bultum-icon-180.png` for Apple touch icon
- `/icons/bultum-icon.svg` for the in-app brand mark
- `/icons/bultum-logo.svg` for full brand lockups
- `/icons/favicon.svg` for the browser favicon

After changing an already-installed Android PWA, uninstall the old BULTUM shortcut and reinstall once if Android keeps the previous launcher icon cached.
