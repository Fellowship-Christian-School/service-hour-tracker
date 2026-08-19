# Service Hour Tracker

A web app for Fellowship Christian School clubs to record and review student service hours. It uses Google sign-in and only accepts `@fcsweb.org` accounts.

## Core features

- Create a club and share its invite link with students.
- Join a club from an invite link.
- Log service hours and track their approval status.
- Approve or reject submitted hours as a club admin.
- Create and manage service opportunities.
- Promote members, remove members, and assign member flags.
- Export club service-hour records.
- Archive or delete clubs.

Club creators have full control. Admins manage members, opportunities, and submitted hours. Students join clubs, log hours, and view their records.

## Development setup

Requirements:

- [Bun](https://bun.sh/)
- PostgreSQL
- A Google OAuth client

Install dependencies:

```sh
bun install
```

Create `.env.local`:

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
AUTH_SECRET="REPLACE_WITH_A_RANDOM_SECRET"
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"
NEXTAUTH_URL="http://localhost:3000"
```

Set the Google OAuth redirect URI to:

```text
http://localhost:3000/api/auth/callback/google
```

Create the database schema and generate the Prisma client:

```sh
bunx prisma migrate dev
bunx prisma generate
```

Start the development server:

```sh
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production setup

Provide the same environment variables as development, using the production database and public HTTPS URL. Set the Google OAuth redirect URI to:

```text
https://YOUR_DOMAIN/api/auth/callback/google
```

Install dependencies, apply migrations, generate the Prisma client, and build:

```sh
bun install --frozen-lockfile
bunx prisma migrate deploy
bunx prisma generate
bun run build
```

Start the production server:

```sh
bun run start
```

Run database migrations once for each release before starting the new application version. Keep `AUTH_SECRET`, Google credentials, and `DATABASE_URL` outside the repository.
