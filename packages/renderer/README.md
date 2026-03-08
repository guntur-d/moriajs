# @moriajs/renderer

Isomorphic renderer for Mithril.js.

## Features

- **SSR**: Render Mithril components on the server.
- **Hydration**: Seamless hand-off from server to client.
- **Data Fetching**: Support for `getServerData`.

## Usage

```ts
import { renderToString } from '@moriajs/renderer';
const html = await renderToString(MyComponent, initialData);
```

## Isomorphic Components & SSR

When building components that run on both server and client, you must follow specific guidelines to avoid ReferenceErrors and state leaks:

> [!CAUTION]
> **Do not use top-level module variables for component state.** This can lead to server crashes (ReferenceError) during HMR and state bleeding across requests. Always use `vnode.state`.

See the full [SSR Guidelines](./SSR_GUIDELINES.md) for best practices and common pitfalls.
