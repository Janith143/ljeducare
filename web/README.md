# LJ Educare — web app

Next.js 15 (App Router) front end for the LJ Educare private LMS, deployed on
Firebase App Hosting. This directory is the App Hosting **root directory** (`/web`).

- Shared domain code (types, money utils, permissions) lives in `src/shared`
  and is imported as `@ljeducare/shared` via a tsconfig path alias.
- Runtime config comes from `apphosting.yaml` (public Firebase config as values;
  session-cookie + revalidate keys as Secret Manager references).

## Local development

```bash
npm install          # from this directory
npm run dev          # http://localhost:3000 (point at Firebase emulators)
npm run build        # production build
npm test             # money-util unit tests (vitest)
```

See the repository root `SETUP.md` for full provisioning and deploy steps.

<!-- Deployed on Firebase App Hosting (asia-southeast1). -->

