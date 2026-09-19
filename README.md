# burn-app

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines Next.js, Self, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **Next.js** - Full-stack React framework
- **React Native** - Build mobile apps using React
- **Expo** - Tools for React Native development
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **shadcn/ui** - Reusable UI components
- **Drizzle** - TypeScript-first ORM
- **PostgreSQL** - Database engine
- **Authentication** - Better-Auth
- **Turborepo** - Optimized monorepo build system
- **BullMQ + Redis** - Background jobs and scheduled tasks ([docs](docs/BACKGROUND_JOBS.md))

## Getting Started

First, install the dependencies:

```bash
npm install
```

## Environment Variables

For the web app (`apps/web/.env`), configure:

- **Database**: `DATABASE_URL` – PostgreSQL connection string
- **Auth**: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGIN`
- **Email (verification & password reset)**: `NODEMAILER_HOST`, `NODEMAILER_USER`, `NODEMAILER_APP_PASSWORD`; optionally `NODEMAILER_PORT` (default 465). Required for email verification and forgot-password flows.

- **Background jobs**: `REDIS_URL` – optional locally (jobs run inline), required in production. See [docs/BACKGROUND_JOBS.md](docs/BACKGROUND_JOBS.md).

For the native app (`apps/native/.env`), set `EXPO_PUBLIC_SERVER_URL` to your web API URL.

## Database Setup

This project uses PostgreSQL with Drizzle ORM.

1. Make sure you have a PostgreSQL database set up.
2. Update your `apps/web/.env` file with your PostgreSQL connection details.

3. Apply the schema to your database:

```bash
npm run db:push
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the fullstack application.
Use the Expo Go app to run the mobile application.

## Project Structure

```
burn-app/
├── apps/
│   ├── web/         # Fullstack application (Next.js)
│   ├── native/      # Mobile application (React Native, Expo)
│   └── worker/      # Background job process (BullMQ)
├── packages/
│   ├── auth/        # Authentication configuration & logic
│   ├── db/          # Database schema & queries
│   ├── email/       # Transactional email templates & transport
│   ├── env/         # Environment variable access
│   └── queue/       # Job definitions, producers & worker runtime
```

## Available Scripts

- `npm run dev`: Start all applications in development mode
- `npm run build`: Build all applications
- `npm run check-types`: Check TypeScript types across all apps
- `npm run dev:native`: Start the React Native/Expo development server
- `npm run dev:worker`: Start the background job worker (needs Redis: `docker compose up -d`)
- `npm run db:push`: Push schema changes to database
- `npm run db:studio`: Open database studio UI
