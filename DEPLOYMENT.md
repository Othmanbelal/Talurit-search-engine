# Deployment

This project can be split across:

- Backend API: Render
- Frontend: Vercel
- PostgreSQL: Supabase

## Supabase

Create a Supabase project and copy the PostgreSQL connection string.

For Render, set `DATABASE_URL` to the Supabase connection string with SSL enabled.

## Render Backend

Use this repository as a Render Blueprint or create a Web Service manually.

Manual settings:

- Root directory: repository root
- Build command: `npm install --include=dev && npm --workspace server run build`
- Start command: `npm --workspace server run db:migrate:deploy && npm --workspace server run db:seed && npm --workspace server run start`
- Health check path: `/api/health`

Required environment variables:

- `NODE_ENV=production`
- `DATABASE_URL`
- `CLIENT_URL=https://your-vercel-app.vercel.app`
- `APP_PUBLIC_URL=https://your-vercel-app.vercel.app`
- `SESSION_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_NAME`

SMTP variables are optional until email is configured.

## Vercel Frontend

Create a Vercel project from the `client` folder.

Settings:

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`

Environment variable:

- `VITE_API_URL=https://your-render-service.onrender.com`

## Important Upload Note

Render free service storage is ephemeral. Uploaded item pictures and QR images may disappear after redeploys or restarts.

For production, move uploads to persistent object storage before relying on uploaded images.
