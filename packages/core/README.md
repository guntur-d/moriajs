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
