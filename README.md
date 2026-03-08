<p align="center">
  <h1 align="center">🏔️ MoriaJS</h1>
  <p align="center">The full-stack meta-framework for <a href="https://mithril.js.org">Mithril.js</a></p>
  <p align="center">
    <a href="#quick-start">Quick Start</a> ·
    <a href="#packages">Packages</a> ·
    <a href="#documentation">Docs</a> ·
    <a href="#contributing">Contributing</a>
  </p>
</p>

---

MoriaJS is a batteries-included full-stack framework built on **[Fastify](https://fastify.dev)** (backend) and **[Mithril.js](https://mithril.js.org)** (frontend), with hybrid SSR/CSR rendering. It provides the structure, tooling, and conventions that Mithril.js has been missing — think Next.js, but for Mithril.

## Features

- ⚡ **Fastify-powered** — High performance Node.js server with plugin architecture
- 🎯 **Type-safe** — Written in TypeScript, supports both TS and JS projects
- 🔥 **Vite + HMR** — Vite dev server with Hot Module Replacement built-in
- 📁 **File-based routing** — Automatic route discovery from `src/routes/`
- 🔄 **Hybrid rendering** — Server-side rendering + client-side hydration via `mithril-node-render`
- 🗄️ **Database-agnostic** — Standardized CRUD API with support for Kysely (SQL) and Pongo (Postgres Document Store)
- 🔐 **Auth built-in** — JWT + httpOnly cookies with pluggable auth providers
- 🧩 **Plugin system** — Extend the framework with `defineMoriaPlugin()`
- 🎨 **UI components** — Toaster notifications, modals, and centralized confirmation dialogs
- 📦 **Monorepo** — pnpm workspaces + Turborepo for fast, organized development

## Status

> ⚠️ **Development Status**
> This package is in early development and undergoing active testing. Expect breaking changes between minor versions. Not recommended for production use yet.



## Quick Start

Create a new MoriaJS project using the interactive scaffolder:

```bash
# Create a new project
npx create-moria@latest my-app

# Start developing
cd my-app
npm install
npm run dev
# → Server running at http://localhost:3000
```

### Deployment

To run your app in production:

```bash
# Set production environment
export NODE_ENV=production

# Build the project (for TypeScript projects)
npm run build

# Start the production server
npm start
```

For JavaScript projects, `npm start` runs the source directly. For TypeScript projects, it runs from the `dist` directory.

## Development

To contribute to MoriaJS or work on the framework itself:

```bash
# Clone the repo
git clone https://github.com/guntur-d/moriajs.git
cd moriajs

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run the playground app
cd apps/playground
pnpm dev
# → Server running at http://localhost:3000
```

The monorepo is managed with pnpm workspaces + Turborepo:

```bash
pnpm build          # Build all packages
pnpm turbo typecheck # Type-check all packages
pnpm turbo dev       # Run all dev servers
```

The playground app at `apps/playground/` is a working example that imports `@moriajs/core` and starts a Fastify server. Use it as a reference or starting point.

## Usage

### 1. Create your app

```ts
// src/index.ts
import { createApp, defineConfig } from '@moriajs/core';

const config = defineConfig({
  mode: process.env.NODE_ENV || 'production',
  server: { port: 3000 },
});

const app = await createApp({ config });
await app.listen();
// → Fastify + Vite dev server with HMR
// → Routes auto-discovered from src/routes/
```

### 2. Configuration

Create a `moria.config.ts` in your project root:

```ts
// moria.config.ts
import { defineConfig } from '@moriajs/core';

export default defineConfig({
  mode: process.env.NODE_ENV || 'production', // 'development' | 'production'
  server: {
    port: 3000,
    host: '0.0.0.0',
    logLevel: 'info',
    cors: {
      origin: true,
      credentials: true,
    },
  },
  vite: {
    clientEntry: '/src/entry-client.ts',  // Client bundle entry
  },
  routes: {
    dir: 'src/routes',      // Route directory (default)
  },
  database: {
    adapter: 'pg',           // 'pg' | 'sqlite'
    url: process.env.DATABASE_URL,
    usePongo: true,          // Optional: use Pongo (Document API) for Postgres
  },
  auth: {
    secret: process.env.JWT_SECRET,
    expiresIn: '7d',
    cookieName: 'moria_token',
  },
});
```

### 3. File-Based Routing

Drop route files in `src/routes/` and they're automatically registered:

```
src/routes/
├── api/
│   ├── hello.ts            → GET /api/hello
│   └── users/
│       └── [id].ts         → GET /api/users/:id
└── pages/
    ├── index.ts            → GET /
    └── about.ts            → GET /about
```

Each route file exports named HTTP method handlers:

```ts
// src/routes/api/hello.ts
import type { FastifyRequest, FastifyReply } from 'fastify';

export function GET(request: FastifyRequest, reply: FastifyReply) {
  return { message: 'Hello from MoriaJS!' };
}

export function POST(request: FastifyRequest, reply: FastifyReply) {
  return { created: true };
}
```

Dynamic segments use brackets — `[param]` becomes `:param`:

```ts
// src/routes/api/users/[id].ts
export function GET(request: FastifyRequest<{ Params: { id: string } }>) {
  return { userId: request.params.id };
}
```

### 4. Middleware

Place `_middleware.ts` files in route directories — they're automatically scoped to sibling and child routes:

```
src/routes/
├── _middleware.ts           → runs on ALL routes
├── api/
│   ├── _middleware.ts       → runs on /api/* routes only
│   └── hello.ts
└── pages/
    └── index.ts
```

```ts
// src/routes/_middleware.ts
import { defineMiddleware } from '@moriajs/core';

export default defineMiddleware(async (request, reply) => {
    request.log.info(`→ ${request.method} ${request.url}`);
});
```

Export an array for multiple middleware per scope:

```ts
export default [
    defineMiddleware(async (req) => { /* logger */ }),
    defineMiddleware(async (req, reply) => { /* auth guard */ }),
];
```

Global middleware (via config, runs on every request including `/health`):

```ts
const app = await createApp({
    config: defineConfig({
        middleware: [
            defineMiddleware(async (req) => { req.log.info('global'); }),
        ],
    }),
});
```

### 5. Database

MoriaJS provides a **standardized, agnostic DB API** that works across different underlying libraries (Kysely, Pongo, etc.).

```ts
// src/routes/api/users.ts
export async function GET(request) {
  // Same API works regardless of adapter/library!
  const users = await request.server.db.find('users', { active: true });
  return users;
}
```

#### Configuration

```ts
import { createDatabase } from '@moriajs/db';

// 1. Kysely Adapter (SQL)
const db = await createDatabase({
  adapter: 'sqlite',
  filename: './dev.db',
});

// 2. Pongo Adapter (Document Store on Postgres)
const db = await createDatabase({
  adapter: 'pg',
  url: process.env.DATABASE_URL,
  usePongo: true,
});
```

### 6. Authentication

JWT-based auth with httpOnly cookies — secure by default. Includes built-in **Google** and **GitHub** OAuth providers.

```ts
import { createAuthPlugin, requireAuth, googleProvider, githubProvider } from '@moriajs/auth';

const app = await createApp();

// Register auth with OAuth providers
await app.use(createAuthPlugin({
  secret: process.env.JWT_SECRET!,
  expiresIn: '24h',
  providers: [
    googleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    githubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
}));
// Auto-registers:
//   GET /auth/google          → redirect to Google
//   GET /auth/google/callback  → handle callback, set JWT cookie
//   GET /auth/github          → redirect to GitHub
//   GET /auth/github/callback  → handle callback, set JWT cookie

// Protected route
app.server.get('/api/profile',
  { preHandler: [requireAuth()] },
  async (request) => {
    return { user: request.user };
  }
);

// Role-based protection
app.server.delete('/api/users/:id',
  { preHandler: [requireAuth({ role: 'admin' })] },
  async (request) => {
    // Only admins can access this
  }
);
```

### 7. Server-Side Rendering

Render Mithril.js components on the server with automatic hydration.

```ts
import { renderToString } from '@moriajs/renderer';

app.server.get('/', async (request, reply) => {
  const html = await renderToString(HomePage, {
    title: 'My App — Home',
    meta: { description: 'Welcome to my MoriaJS app' },
    initialData: { user: request.user },
  });

  reply.type('text/html').send(html);
});
```

On the client side, hydrate the server-rendered page:

```ts
// entry-client.ts
import { hydrate, getHydrationData } from '@moriajs/renderer';
import App from './App.js';

const data = getHydrationData();
await hydrate(App, document.getElementById('app')!);
```

### 8. UI Components

Built-in Mithril.js components — CSS-framework agnostic. Includes imperative utilities for notifications and confirmations.

```ts
import m from 'mithril';
import { toast, Toaster, confirm, ConfirmationRegistry, Modal } from '@moriajs/ui';

// 1. Toast notifications
toast.success('Saved successfully!');

// 2. Centralized Confirmations (Imperative)
const deleteUser = async () => {
  const confirmed = await confirm({
    title: 'Delete User',
    message: 'Are you sure? This action cannot be undone.',
    confirmText: 'Delete',
    type: 'danger',
  });

  if (confirmed) {
    // Proceed...
  }
};

// 3. Root Layout Setup
// Mount Toaster and ConfirmationRegistry once in your layout
const Layout = {
  view(vnode) {
    return m('div', [
      m(Toaster),
      m(ConfirmationRegistry),
      vnode.children,
    ]);
  },
};

// 4. Modal component (declarative)
let showModal = false;

const Page = {
  view() {
    return m('div', [
      m('button', { onclick: () => { showModal = true; } }, 'Open Modal'),
      m(Modal, {
        isOpen: showModal,
        onClose: () => { showModal = false; },
        title: 'Confirm Action',
      }, [
        m('p', 'Are you sure you want to proceed?'),
        m('button', { onclick: () => { showModal = false; } }, 'Yes'),
      ]),
    ]);
  },
};
```

### 9. Plugins

Extend MoriaJS with custom plugins.

```ts
import { defineMoriaPlugin } from '@moriajs/core';

const myPlugin = defineMoriaPlugin({
  name: 'my-plugin',
  async register({ server, config }) {
    // Add routes
    server.get('/api/custom', async () => ({ custom: true }));

    // Add decorators
    server.decorate('myUtil', () => 'hello');

    // Add hooks
    server.addHook('onRequest', async (request) => {
      request.log.info('Custom plugin hook');
    });
  },
});

// Register in your app
const app = await createApp();
await app.use(myPlugin);
```

## CLI

```bash
moria dev          # Start development server with HMR
moria build        # Build for production
moria start        # Start production server
moria generate     # Generate routes, components, models
```

## Packages

| Package | Description |
|---------|-------------|
| `@moriajs/core` | Fastify server, Vite integration, file-based routing, config, plugin system |
| `@moriajs/renderer` | SSR/CSR hybrid rendering engine with dev/prod mode |
| `@moriajs/db` | Agnostic database adapters (Kysely + Pongo) |
| `@moriajs/auth` | JWT + httpOnly cookie authentication |
| `@moriajs/cli` | Dev server, production build, and generate commands |
| `@moriajs/ui` | Toaster, Modal, and UI primitives |
| `create-moria` | Project scaffolder (coming soon) |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js ≥ 20 |
| Backend | [Fastify](https://fastify.dev) |
| Frontend | [Mithril.js](https://mithril.js.org) |
| DB / ORM | [Kysely](https://kysely.dev) (SQL) or [Pongo](https://github.com/event-driven-io/pongo) (Document) |
| Bundler | [Vite](https://vite.dev) |
| Monorepo | pnpm workspaces + [Turborepo](https://turbo.build) |
| Language | TypeScript |



## Documentation

> 📝 Full documentation is coming soon. For now, each package's source code is well-documented with JSDoc comments and TypeScript types.

- [Configuration](./packages/core/src/config.ts) — All config options
- [Vite Integration](./packages/core/src/vite.ts) — Dev server + HMR
- [File-Based Routing](./packages/core/src/router.ts) — Route conventions
- [Middleware](./packages/core/src/middleware.ts) — Middleware system
- [Plugin API](./packages/core/src/plugins.ts) — Creating plugins
- [Database](./packages/db/src/index.ts) — Database adapters
- [Auth](./packages/auth/src/index.ts) — Authentication system
- [Renderer](./packages/renderer/src/index.ts) — SSR/CSR rendering
- [SSR Guidelines](./packages/renderer/SSR_GUIDELINES.md) — Isomorphic component best practices
- [UI Components](./packages/ui/src/index.ts) — Toaster, Modal

## Roadmap

- [x] Monorepo scaffold (pnpm + Turborepo)
- [x] Core server with Fastify
- [x] Database Agnostic Architecture (Kysely + Pongo)
- [x] JWT authentication
- [x] SSR renderer
- [x] UI component library
- [x] CLI with commands
- [x] Project scaffolder
- [x] Vite integration with HMR
- [x] File-based routing
- [x] Full SSR/CSR hydration
- [x] Middleware system
- [x] Starter templates
- [x] DB Agnostic & Pongo integration
- [x] OAuth providers (Google, GitHub)

## Contributing

MoriaJS is currently in early development. Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT © [Guntur D](https://github.com/guntur-d)
