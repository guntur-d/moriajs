# MoriaJS SSR Guidelines: Isomorphic Mithril Components

MoriaJS uses Server-Side Rendering (SSR) with client-side hydration to provide fast initial page loads and SEO benefits. However, building isomorphic applications (code that runs on both server and client) requires careful consideration of state management and environment differences.

## The Pitfall: Top-level Module Variables

One of the most common issues in Vite-based SSR is the use of top-level module variables for component state.

### Why it fails

1.  **Vite SSR Closure Scope**: During development, Vite transforms SSR dependencies and handles Hot Module Replacement (HMR). Top-level variables in your component files can lose their declaration context or become undefined during HMR cycles, leading to `ReferenceError: [var] is not defined`.
2.  **State Leaks**: Top-level variables persist for the lifetime of the server process. If multiple requests share the same server process, state stored in module-scope variables will "bleed" across requests, leading to data leaks and inconsistent behavior.

### ❌ Incorrect (Anti-pattern)

```ts
// src/routes/pages/Profile.ts
let userId; // ERROR: This is shared across ALL server requests and may fail during HMR

export default {
    oninit(vnode) {
        userId = vnode.attrs.id;
    },
    view() {
        return m('div', `User ID: ${userId}`);
    }
}
```

### ✅ Correct (Recommended)

Always use `vnode.state` for local component state. This ensures the state is encapsulated within the component instance and cleared when the component is destroyed.

```ts
// src/routes/pages/Profile.ts
export default {
    oninit(vnode) {
        vnode.state.userId = vnode.attrs.id;
    },
    view(vnode) {
        return m('div', `User ID: ${vnode.state.userId}`);
    }
}
```

## Browser-Only Globals

The server-side environment (Node.js) does not have access to browser globals like `window`, `document`, `localStorage`, or `navigator`.

### Safe Access

Wrap access to browser globals in checks or use them only in lifecycle hooks that run ONLY on the client (like `oncreate` or `onupdate`).

> [!NOTE]
> MoriaJS's `renderToString` does **not** execute `oncreate` or `onupdate` hooks. These hooks are safe for browser-specific logic.

```ts
export default {
    oninit() {
        // SSR SAFE: Check if window exists
        if (typeof window !== 'undefined') {
            console.log(window.location.href);
        }
    },
    oncreate() {
        // BROWSER ONLY: Safe to use window/document here
        document.title = 'New Title';
    },
    view() {
        return m('div', 'Hello World');
    }
}
```

## Handling Side Effects

### `m.request` and `m.redraw`

MoriaJS automatically patches `m.request` and `m.redraw` during SSR to prevent server crashes caused by lack of browser APIs (like `XMLHttpRequest`).

- `m.request` returns an immediately resolving promise on the server.
- `m.redraw` becomes a no-op on the server.

If you need data for SSR, use the `getServerData` pattern (if available in your route) or hydrate data via `initialData` in `renderToString`.

## Summary Checklist

- [ ] Use `vnode.state` instead of top-level variables.
- [ ] Check `typeof window !== 'undefined'` before using browser globals.
- [ ] Keep DOM-heavy logic in `oncreate`.
- [ ] Use `initialData` to pass state from server to client.
