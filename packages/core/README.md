# @moriajs/core

The engine of the MoriaJS framework.

## Features

- **File-Based Routing**: Auto-discovery of routes in `src/routes`.
- **SSR & Hydration**: Server-side rendering with Mithril.js.
- **Fastify under the hood**: High-performance HTTP server.
- **Vite Integration**: Blazing fast development server and production builds.
- **Middleware**: Intuitive middleware system.

## Usage

```ts
import { createApp } from '@moriajs/core';

const app = await createApp();
await app.listen({ port: 3000 });
```

## SSR Performance

Route registration resolves `renderToString` and `getHtmlScripts` once at startup (during `app.listen()`), not per-request. This avoids dynamic import overhead on every SSR page render (v0.4.40+).

## Auto-Registration

When `config.database` or `config.auth` is provided in `moria.config.ts`, the corresponding plugin (`@moriajs/db` or `@moriajs/auth`) is auto-registered. If the plugin package is not installed, `createApp()` throws an error (v0.4.40+, was silent warning before).
