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
- 🔄 **Hybrid rendering** — Server-side rendering + client-side hydration via `mithril-node-render`
- 🗄️ **Database-agnostic** — Kysely ORM with PostgreSQL (production) and SQLite (development) adapters
- 🔐 **Auth built-in** — JWT + httpOnly cookies with pluggable auth providers
- 🧩 **Plugin system** — Extend the framework with `defineMoriaPlugin()`
- 🎨 **UI components** — Toaster notifications, modals, and layout primitives
- 📦 **Monorepo** — pnpm workspaces + Turborepo for fast, organized development

## Status

> ⚠️ **Early Development** — MoriaJS is not yet published to npm. To try it out, clone the repository and work within the monorepo. Packages will be published to npm once the framework is stable.

## Quick Start

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

The playground app at `apps/playground/` is a working example that imports `@moriajs/core` and starts a Fastify server. Use it as a reference or starting point.

## Usage

### 1. Create your app

```ts
// src/index.ts
import { createApp, defineConfig } from '@moriajs/core';

const config = defineConfig({
  server: { port: 3000 },
  database: {
    adapter: 'sqlite',
    filename: './dev.db',
  },
});

const app = await createApp({ config });

app.server.get('/', async () => {
  return { message: 'Hello from MoriaJS!' };
});

await app.listen();
```

### 2. Configuration

Create a `moria.config.ts` in your project root:

```ts
// moria.config.ts
import { defineConfig } from '@moriajs/core';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    logLevel: 'info',
    cors: {
      origin: true,
      credentials: true,
    },
  },
  database: {
    adapter: 'pg',       // 'pg' | 'sqlite'
    url: process.env.DATABASE_URL,
  },
  auth: {
    secret: process.env.JWT_SECRET,
    expiresIn: '7d',
    cookieName: 'moria_token',
  },
});
```

### 3. Database

MoriaJS uses [Kysely](https://kysely.dev) for type-safe database queries with [kysely-schema](https://github.com/guntur-d/kysely-schema) for schema-first development.

```ts
import { createDatabase } from '@moriajs/db';

// SQLite for development
const db = await createDatabase({
  adapter: 'sqlite',
  filename: './dev.db',
});

// PostgreSQL for production
const db = await createDatabase({
  adapter: 'pg',
  url: process.env.DATABASE_URL,
});

// Use as a plugin
import { createDatabasePlugin } from '@moriajs/db';

const app = await createApp();
await app.use(createDatabasePlugin({
  adapter: 'sqlite',
  filename: './dev.db',
}));
```

### 4. Authentication

JWT-based auth with httpOnly cookies — secure by default.

```ts
import { createAuthPlugin, requireAuth } from '@moriajs/auth';

const app = await createApp();

// Register the auth plugin
await app.use(createAuthPlugin({
  secret: process.env.JWT_SECRET!,
  expiresIn: '24h',
}));

// Public route
app.server.post('/api/login', async (request, reply) => {
  // Validate credentials...
  const token = await app.server.signIn({ id: user.id, email: user.email }, reply);
  return { token };
});

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

### 5. Server-Side Rendering

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

### 6. UI Components

Built-in Mithril.js components — CSS-framework agnostic.

```ts
import m from 'mithril';
import { toast, Toaster, Modal } from '@moriajs/ui';

// Toast notifications
toast.success('Saved successfully!');
toast.error('Something went wrong');
toast.warning('Check your input');
toast.info('New update available');

// In your root layout — mount the Toaster once
const Layout = {
  view(vnode) {
    return m('div', [
      m(Toaster),           // Toast container
      vnode.children,        // Page content
    ]);
  },
};

// Modal dialog
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

### 7. Plugins

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
| `@moriajs/core` | Fastify server, config, plugin system |
| `@moriajs/renderer` | SSR/CSR hybrid rendering engine |
| `@moriajs/db` | Kysely database adapters (PG + SQLite) |
| `@moriajs/auth` | JWT + httpOnly cookie authentication |
| `@moriajs/cli` | Dev, build, and generate commands |
| `@moriajs/ui` | Toaster, Modal, and UI primitives |
| `create-moria` | Project scaffolder (coming soon) |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js ≥ 20 |
| Backend | [Fastify](https://fastify.dev) |
| Frontend | [Mithril.js](https://mithril.js.org) |
| ORM | [Kysely](https://kysely.dev) + [kysely-schema](https://github.com/guntur-d/kysely-schema) |
| Bundler | [Vite](https://vite.dev) |
| Monorepo | pnpm workspaces + [Turborepo](https://turbo.build) |
| Language | TypeScript |

## Development

See [Quick Start](#quick-start) to get the repo running. The monorepo is managed with pnpm workspaces + Turborepo:

```bash
pnpm build          # Build all packages
pnpm turbo typecheck # Type-check all packages
pnpm turbo dev       # Run all dev servers
```

## Documentation

> 📝 Full documentation is coming soon. For now, each package's source code is well-documented with JSDoc comments and TypeScript types.

- [Configuration](./packages/core/src/config.ts) — All config options
- [Plugin API](./packages/core/src/plugins.ts) — Creating plugins
- [Database](./packages/db/src/index.ts) — Database adapters
- [Auth](./packages/auth/src/index.ts) — Authentication system
- [Renderer](./packages/renderer/src/index.ts) — SSR/CSR rendering
- [UI Components](./packages/ui/src/index.ts) — Toaster, Modal

## Roadmap

- [x] Monorepo scaffold (pnpm + Turborepo)
- [x] Core server with Fastify
- [x] Database adapters (PostgreSQL + SQLite)
- [x] JWT authentication
- [x] SSR renderer
- [x] UI component library
- [x] CLI with commands
- [x] Project scaffolder
- [ ] Vite integration with HMR
- [ ] File-based routing
- [ ] Full SSR/CSR hydration
- [ ] kysely-schema integration
- [ ] OAuth providers
- [ ] Middleware system
- [ ] Starter templates

## Contributing

MoriaJS is currently in early development. Contributions, issues, and feature requests are welcome!

1. Fork the repository
2. Create your branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT © [Guntur D](https://github.com/guntur-d)
