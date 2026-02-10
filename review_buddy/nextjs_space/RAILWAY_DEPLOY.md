# Railway Deployment Guide

This guide will walk you through deploying your Review Buddy application to Railway.

## Prerequisites

- A [Railway](https://railway.app/) account.
- The `Railway CLI` installed (optional, but recommended).

## Steps

### 1. Create a Project on Railway

1. Go to your Railway dashboard.
2. Click "New Project".
3. Select "Deploy from GitHub repo" and choose your repository.

### 2. Add a Database

1. In your Railway project view, right-click on the canvas or click "New".
2. Select "Database" -> "PostgreSQL".
3. This will create a new PostgreSQL service in your project.

### 3. Configure Environment Variables

1. Click on your Next.js application service.
2. Go to the "Variables" tab.
3. You need to add the following variables:
    - `DATABASE_URL`: detailed below.
    - `NEXTAUTH_SECRET`: Generate a random string (e.g., `openssl rand -base64 32`).
    - `NEXTAUTH_URL`: Your Railway deployment URL (e.g., `https://web-production-xxxx.up.railway.app`).
    - Any other API keys you use (e.g., `OPENAI_API_KEY`, `GOOGLE_CLIENT_ID`, etc.).

**Linking the Database:**
Railway makes this easy. Instead of manually copying the connection string:
1. In the "Variables" tab, click "New Variable".
2. Name it `DATABASE_URL`.
3. In the value field, type `${{Postgres.DATABASE_URL}}` (or verify the variable name provided by the Postgres service). Railway usually auto-completes this.

### 4. Database Migration

Since this is a new deployment, you need to push your Prisma schema to the database.

**Option A: Automated (Recommended for simple setups)**
Add a start command in your service settings:
1. Go to "Settings" -> "Deploy" -> "Start Command".
2. Set it to: `npx prisma migrate deploy && next start`.
   *Note: This runs migrations on every boot. For production, you might want to run this manually.*

**Option B: Manual (via CLI)**
1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Link your project: `railway link`
4. Run migration: `railway run npx prisma migrate deploy`

### 5. Verify

1. Wait for the deployment to finish.
2. Click the generated URL.
3. Your app should be live!

## Troubleshooting

- **Logs:** Check the "Deployments" tab and click on the latest build/deploy logs to see errors.
- **Build Failures:** Ensure `postinstall` script is running `prisma generate`.
- **Database Connection:** Verify `DATABASE_URL` is correct.
