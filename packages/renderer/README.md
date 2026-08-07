# @moriajs/renderer

Isomorphic renderer for Mithril.js.

## Features

- **SSR**: Render Mithril components on the server.
- **Hydration**: Seamless hand-off from server to client.
- **Data Fetching**: Support for `getServerData`.
- **XSS Protection**: Built-in `escapeHtml()` for HTML contexts and `jsonForScript()` for safe script-tag data injection (v0.4.40+).

## Usage

```ts
import { renderToString } from '@moriajs/renderer';
const html = await renderToString(MyComponent, initialData);
```

## XSS Protection (v0.4.40+)

All HTML interpolation in `renderToString` output is now escaped:

- Page title → `escapeHtml()`
- Meta tag names/values → `escapeHtml()`
- CSS link hrefs → `escapeHtml()`
- `lang` attribute → `escapeHtml()`
- Hydration data in `<script>` → `jsonForScript()` (escapes `</script>`, `<!--`, `-->`, U+2028, U+2029)

```ts
const html = await renderToString(Component, {
  title: '<script>alert(1)</script>', // Safely escaped
  meta: { description: 'Safe & <escaped>' },
  initialData: { userInput: '</script>alert(1)' }, // Safely encoded for script context
});
```

## Isomorphic Components & SSR

When building components that run on both server and client, you must follow specific guidelines to avoid ReferenceErrors and state leaks:

> [!CAUTION]
> **Do not use top-level module variables for component state.** This can lead to server crashes (ReferenceError) during HMR and state bleeding across requests. Always use `vnode.state`.

See the full [SSR Guidelines](./SSR_GUIDELINES.md) for best practices and common pitfalls.

## Concurrent SSR Safety (v0.4.40+)

The renderer now uses a reference-counted singleton patch for `m.request`/`m.redraw` on the shared Mithril instance. This isolates concurrent `renderToString` calls — each render patches on entry and restores on exit, with a refcount ensuring the original functions are restored only after the last concurrent render completes. This prevents race conditions where interleaved renders could clobber each other's `m.request`/`m.redraw` patches.
