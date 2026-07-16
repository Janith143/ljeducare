# LJ Educare — Setup Guide

Private single-institute LMS: Next.js (App Router) + Firebase (Auth, Firestore, Storage, Functions), multi-currency payments (PayPal + Marx + bank slip).

## 1. Prerequisites

- Node.js 22+ and npm 10+
- Firebase CLI: `npm i -g firebase-tools` then `firebase login`
- A [PayPal developer account](https://developer.paypal.com) (sandbox app for testing)
- Marx IPG merchant credentials (for LKR card payments)
- Notify.lk account + SMTP (Gmail app password works) for guardian alerts

## 2. Create the Firebase project

1. [Firebase console](https://console.firebase.google.com) → **Add project** (e.g. `ljeducare`).
2. Upgrade to the **Blaze** plan (required for Cloud Functions + outbound network).
3. Enable services:
   - **Authentication** → Sign-in methods: Email/Password (and Phone if you want OTP login).
   - **Firestore** → Create database → **(default)** database (do NOT create a named database), location `asia-south1`.
   - **Storage** → default bucket, `asia-south1`.
   - **App Hosting** (for the Next.js app) — connect this repo when deploying.
4. Project settings → **Your apps** → Add a **Web app** → copy the config values.

## 3. Configure this repo

```bash
# point the CLI at your project
firebase use --add        # choose your project, alias "default"
# (this rewrites .firebaserc — replace ljeducare-CHANGE_ME)
```

Copy `.env.example` → `web/.env.local` and fill in:
- `NEXT_PUBLIC_FIREBASE_*` from the web-app config
- `AUTH_COOKIE_SIGNATURE_KEY_CURRENT/PREVIOUS`: two random 32+ char strings
- Leave `NEXT_PUBLIC_USE_EMULATORS=1` for local dev; REMOVE it for production
- Also replace `ljeducare-CHANGE_ME` in `apphosting.yaml`

For server-side admin access in local dev **without** emulators, download a service-account key (Project settings → Service accounts) and set `GOOGLE_APPLICATION_CREDENTIALS` to its path. Never commit it.

## 4. Install & run locally (emulators)

The web app (`web/`) is a self-contained Next.js app — its shared code lives in
`web/src/shared` (no npm workspace, so App Hosting can build it directly).

```bash
npm install --prefix web      # install the web app
npm install                   # root: firebase-admin for the seed script
firebase emulators:start      # auth:9099 firestore:8080 storage:9199 ui:4000
# in another terminal:
npm run seed                  # demo users (see below) + currencies + sample content
npm run dev                   # http://localhost:3000
```

> On Windows the Java Firestore emulator may fail with an AF_UNIX socket error.
> If so, run the emulators in Docker instead:
> `docker compose -f dev/emulators/docker-compose.yml up -d`

Demo logins (all `password123`): `admin@lj.test` (main_admin), `manager@lj.test`,
`teacheradmin@lj.test`, `teacher@lj.test`, `student@lj.test`, `kiosk@lj.test`.

## 5. Payment gateways

### PayPal (foreign currencies)
1. developer.paypal.com → Apps & Credentials → Create app (start with **Sandbox**).
2. Put Client ID/Secret in function secrets:
   `firebase functions:secrets:set PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET`.
3. After the first functions deploy, register the webhook URL
   (`https://<region>-<project>.cloudfunctions.net/paypalWebhook`) for events:
   `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REFUNDED`,
   and set `PAYPAL_WEBHOOK_ID`.
4. Flip `PAYPAL_ENV` to `live` + live credentials when going to production.

### Marx IPG (LKR)
- Request merchant credentials from Marx; ask them to allowlist your callback URL
  (`https://<region>-<project>.cloudfunctions.net/marxPaymentHandler/marx-callback`).
- `firebase functions:secrets:set MARX_API_KEY`.

### Bank transfer (slip upload)
- Set the institute bank details in **Admin → Settings → Gateways** after first login.

### Guardian alerts
- `firebase functions:secrets:set NOTIFYLK_USER_ID NOTIFYLK_API_KEY NOTIFYLK_SENDER_ID SMTP_EMAIL_USER SMTP_EMAIL_PASS`

## 6. Deploy

**a. Rules, indexes, storage, functions** (from repo root):

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
firebase deploy --only functions          # auth-security, sale-handler, send-notification
```

**b. App Hosting (the web app)** — auto-rollout from GitHub:

1. Console → **App Hosting** → your backend → **Settings** → set the
   **Root directory** to `web` (the app is in `web/`, and `web/apphosting.yaml`
   configures it). This is required — the repo root is not a Next.js app.
2. Create the runtime secrets (they're referenced by `web/apphosting.yaml`):
   ```bash
   # two random 32+ char strings for signing session cookies:
   firebase apphosting:secrets:set AUTH_COOKIE_SIGNATURE_KEY_CURRENT
   firebase apphosting:secrets:set AUTH_COOKIE_SIGNATURE_KEY_PREVIOUS
   firebase apphosting:secrets:set REVALIDATE_SECRET
   ```
   Grant the backend access when prompted (or `firebase apphosting:secrets:grantaccess`).
3. Push to the connected branch — App Hosting builds and rolls out automatically.

**c. App Hosting service-account permissions.** The web app's admin actions
(create staff, suspend users, read Firestore server-side) run as the App Hosting
compute service account. Grant it, in the Google Cloud console → IAM (or `gcloud`):
`roles/datastore.user` and `roles/firebaseauth.admin` (or simply **Firebase Admin**).
If admin user-management errors with permission denied, this is why.

## 7. Bootstrap the first admin

1. Register yourself as a student through the site (or Authentication console → Add user).
2. Grant main_admin:
   ```bash
   node scripts/set-claims.mjs you@example.com main_admin
   ```
3. Sign out/in, open `/admin/settings`:
   - Set enabled currencies + exchange rates
   - Enter bank details for slip payments
   - Create staff (teachers), kiosk devices, and other admins (manager / teacher_admin)

## 8. The landing page

The marketing page is served at **`/landing`** and is fully admin-editable —
**Admin → Landing Page** (`/admin/landing-page`), behind the `landing_page`
permission (main_admin and manager hold it by default; delegate it to anyone else
from `/admin/users`).

> `/` deliberately still serves the existing subject/teacher directory — the landing
> page does **not** replace the current ljeducare.com home page. To swap them later,
> follow the steps in the `LANDING_PATH` comment in `web/src/lib/site.ts`; everything
> else (logo links, admin "View page", cache revalidation) follows that constant.

Every section is covered: brand/nav, hero, trust logos, founder, features,
learning paths, subjects, faculty, testimonials, results, gallery, recognition,
events, FAQ, contact details and the footer, plus SEO title/description/share
image. Each saves independently, and images upload straight to Storage
(`landing-images/`). Contact-form messages and newsletter sign-ups land in
**Admin → Inquiries** (`/admin/inquiries`), exportable as CSV.

A few things worth knowing:

- **Nothing needs seeding.** `web/src/shared/landing/defaults.ts` (`DEFAULT_LANDING`)
  ships the whole page; the stored `settings/landing` doc is merged over it. Fields
  an admin never touches keep following the defaults, so adding a new field there
  lights it up everywhere without a migration. If Firestore is unreachable, the page
  still renders from those defaults instead of erroring.
- **Subject chips** filter the subject cards by each card's *Filter tags*, not by
  text — keep a card's tags matching the chip names.
- **Events** with a past date hide themselves (toggleable per section).
- The design's stylesheet lives at `web/src/app/(landing)/landing.css`, scoped under
  `.lp` so its resets and class names (`.card`, `.btn-primary`, `.container`) can't
  collide with the LMS's Tailwind layer. Keep landing styles inside that file and
  that scope.

## 9. Environment variable reference

See `.env.example`. Anything prefixed `NEXT_PUBLIC_` is public client config;
everything else is server-side only. On App Hosting, secrets are wired through
`apphosting.yaml` → Cloud Secret Manager.
