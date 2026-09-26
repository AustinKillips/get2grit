# Online editor deployment

Vercel project: get2grit-admin. Root directory: cms. Node 22, npm run build, output public.

Required Vercel production environment variables:
- CMS_ORIGIN (optional): defaults to https://get2grit-admin.vercel.app
- GITHUB_CLIENT_ID: GitHub OAuth application's client ID
- GITHUB_CLIENT_SECRET: that application's secret, stored only in Vercel
- SESSION_SECRET (optional): 64 random hexadecimal characters; otherwise a separate session key is derived from the OAuth secret. Rotating that secret invalidates sessions.

Register a GitHub OAuth app with the Vercel production URL as homepage and `<CMS_ORIGIN>/api/callback` as callback. This implementation requests public_repo scope; GitHub describes its permissions on the authorization screen. The service itself only targets AustinKillips/get2grit and requires repository write permission. A GitHub App can further narrow the token's repository scope in a later migration.

The browser receives an encrypted, HttpOnly, Secure, SameSite cookie that expires after eight hours. Secrets are never placed in public JavaScript. Content changes commit four data files atomically. Save conflicts are rejected instead of overwriting another editor's changes. Uploads are capped at 2.5 MB to stay below function payload limits.

After environment setup, redeploy, sign in, and verify loading and a small reversible content change before using this editor for production content. GitHub Pages and Vercel both redeploy after commits. Public assets can take a little time to appear after uploads.

Do not blindly republish old local content-data.js, raffle-data.js, rides-data.js or site-copy-data.js after online editing. Pull the GitHub changes into the local authoring copy first.
