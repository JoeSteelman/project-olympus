# Project Olympus

Project Olympus is a mobile-first Next.js PWA for running a "Man Olympics" event with 8 players split into 2 teams of 4. It includes a live race-style scoreboard, configurable scoring, Supabase auth wiring, Prisma models for persistent data, seed data, and Vercel-friendly deployment defaults.

## Features

- Live entry dashboard with:
  - team score bars at the top
  - points-remaining-to-win tracking
  - live win-probability gauges
  - horse-race style player lanes where Greek avatars move right as points increase
- Admin console for:
  - event name and winning score
  - player name/email/team assignment
  - Greek avatar selection
  - game enablement and scoring JSON editing
- Configured starter games:
  - Shooting: `.22` targets (`5/3/1`)
  - Shooting: handgun silhouette (`9` shots, adjustable)
  - Golf Match A and B (`2v2` match play, adjustable hole values)
  - Poker with adjustable placement payouts
- Extensible `Game` model with JSON scoring config for future mini-games
- Supabase magic-link sign-in flow (`/login` and `/auth/callback`)
- PWA support with manifest, icons, and a basic offline service worker

## Stack

- Next.js 15 App Router
- React 19
- Prisma ORM
- Supabase Auth + Supabase Postgres
- TypeScript

## Data Model

The Prisma schema defines:

- `User`: player/admin profile with email, display name, role, team, avatar
- `Team`: two teams with color and roster
- `Game`: configurable mini-games with JSON scoring config
- `ScoreEntry`: persisted score submissions with team and optional player points
- `EventConfig`: global event metadata and winning score

The current app assumes:

- 8 total players
- 2 teams
- 4 players max per team

The team-size cap is enforced in the player update API.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Configure Supabase and Prisma environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: browser anon key
- `SUPABASE_SERVICE_ROLE_KEY`: optional for future server-side admin automation
- `DATABASE_URL`: Supabase pooled/transaction Prisma connection string
- `DIRECT_URL`: Supabase direct Node/Postgres connection string for migrations

4. Generate the Prisma client:

```bash
npm run prisma:generate
```

5. Apply schema to your database:

```bash
npm run prisma:push
```

Or use migrations instead:

```bash
npm run prisma:migrate
```

6. Seed the default event:

```bash
npm run prisma:seed
```

7. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Supabase + Prisma Notes

Prisma is compatible with Supabase Postgres. The recommended setup is:

- Use the Supabase pooler/transaction connection for `DATABASE_URL` at runtime.
- Use the direct connection string for `DIRECT_URL` when running migrations or schema changes.

That avoids common connection-limit issues on Vercel and keeps Prisma migrations reliable.

If your environment cannot use a direct connection for migrations, the practical fallback is:

- run `prisma db push` from a trusted machine against a temporarily enabled direct URL
- or manage schema changes with Supabase SQL migrations while Prisma still uses the pooled runtime URL

## Seed Data

The seed creates:

- 2 teams: `Spartans` and `Titans`
- 8 users with emails and Greek avatars
- 5 initial mini-games
- a `500` point win target
- sample score entries so the dashboard is populated immediately

## Auth Flow

- `/login` sends Supabase magic links
- `/auth/callback` exchanges the auth code for a session

The current repo wires the auth flow but does not hard-block routes by role yet. For production, the usual next step is to add middleware or server-side guards so only signed-in admins can access `/admin`.

## API Routes

- `GET /api/dashboard`: live dashboard data for the entry screen
- `GET /api/admin/bootstrap`: admin bootstrap payload
- `PATCH /api/players`: update avatar, email, display name, or team assignment
- `PATCH /api/settings`: update event config and game config
- `POST /api/score-entries`: create a new persisted score entry

## Deployment (Vercel)

1. Create a Supabase project.
2. Add all environment variables in Vercel.
3. Deploy this repository to Vercel.
4. Run `npm run prisma:generate` during build (already included in the build script).
5. Run `npm run prisma:push` or `npm run prisma:migrate` against the production database before first use.
6. Run `npm run prisma:seed` once if you want starter data in production.

The build script is already Vercel-friendly:

```bash
npm run build
```

## PWA Notes

The app includes:

- `app/manifest.ts`
- installable icons in `public/`
- a basic offline cache in `public/sw.js`
- automatic service worker registration in the root layout

For a more advanced production offline experience, replace the simple service worker with a versioned caching strategy or Workbox-based setup.
