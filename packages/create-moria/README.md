# create-moria

Interactive project scaffolder for MoriaJS.

## Usage

```bash
pnpm create moria
# or
npm create moria@latest
# or
npx create-moria@latest my-app
npx create-moria my-app --template minimal
npx create-moria my-app --typescript
```

Follow the interactive prompts to set up your new MoriaJS application.

## Features

- **Templates**: `default` (SSR + API + UI) or `minimal` (API-only)
- **Language**: TypeScript or JavaScript
- **Database**: SQLite (easy local) or PostgreSQL (production)
- **Pongo**: Optional Document API on PostgreSQL
- **Dynamic version resolution**: Generated projects resolve actual installed `@moriajs/*` package versions instead of hardcoded values (v0.4.40+)

## Generated Project Structure

```
my-app/
├── src/
│   ├── routes/
│   │   ├── api/           # API routes (GET /api/hello, /api/health, etc.)
│   │   │   └── users/
│   │   │       └── [id].ts
│   │   ├── pages/         # SSR page routes
│   │   │   └── index.ts
│   │   └── _middleware.ts # Global middleware
│   ├── entry-client.ts    # Client hydration entry
│   ├── moria.config.ts    # Configuration
│   └── index.ts           # App entry point
├── scripts/
│   ├── build.js           # Production build
│   └── start.js           # Production start
├── package.json
├── tsconfig.json          # If TypeScript
├── vite.config.ts
├── .env
├── .gitignore
└── README.md
```
