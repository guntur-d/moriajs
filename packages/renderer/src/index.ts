/**
 * @moriajs/renderer
 *
 * Hybrid SSR/CSR rendering engine for Mithril.js.
 * Provides server-side rendering with mithril-node-render
 * and client-side hydration.
 */

/**
 * Options for rendering a page.
 */
export interface RenderOptions {
    /** Page title */
    title?: string;
    /** Meta tags for the page head */
    meta?: Record<string, string>;
    /** Initial data to hydrate on the client */
    initialData?: Record<string, unknown>;
    /** HTML lang attribute */
    lang?: string;
    /** Application mode — affects script injection */
    mode?: 'development' | 'production';
    /** Client entry point for dev mode (default: '/src/entry-client.ts') */
    clientEntry?: string;
    /** CSS stylesheet links to inject in the head */
    cssLinks?: string[];
}

/**
 * Render a Mithril component to an HTML string (server-side).
 *
 * Uses mithril-node-render to produce static HTML from Mithril vnodes.
 *
 * @example
 * ```ts
 * import { renderToString } from '@moriajs/renderer';
 * import MyPage from './pages/Home.js';
 *
 * const html = await renderToString(MyPage, {
 *   title: 'Home — My App',
 *   mode: 'development',
 *   initialData: { user: { name: 'Guntur' } },
 * });
 * ```
 */
export async function renderToString(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component: any,
    options: RenderOptions = {}
): Promise<string> {
    // mithril-node-render has no type declarations — use string import
    const renderModule = await (Function('return import("mithril-node-render")')() as Promise<{ default: (vnode: unknown) => Promise<string> }>);
    const mModule = await (Function('return import("mithril")')() as Promise<{ default: (tag: any, attrs?: any) => any }>);

    const render = renderModule.default;
    const m = mModule.default;

    const componentHtml = await render(m(component, { serverData: options.initialData ?? {} }));

    const metaTags = options.meta
        ? Object.entries(options.meta)
            .map(([name, content]) => `<meta name="${name}" content="${content}">`)
            .join('\n    ')
        : '';

    const cssLinkTags = options.cssLinks
        ? options.cssLinks
            .map((href) => `<link rel="stylesheet" href="${href}">`)
            .join('\n    ')
        : '';

    const hydrationScript = options.initialData
        ? `<script>window.__MORIA_DATA__ = ${JSON.stringify(options.initialData)};</script>`
        : '';

    // Dev vs production script tags
    const mode = options.mode ?? 'production';
    const clientEntry = options.clientEntry ?? '/src/entry-client.ts';

    let scriptTags: string;
    if (mode === 'development') {
        scriptTags = [
            `<script type="module" src="/@vite/client"></script>`,
            `<script type="module" src="${clientEntry}"></script>`,
        ].join('\n    ');
    } else {
        scriptTags = `<script type="module" src="/assets/entry-client.js"></script>`;
    }

    return `<!DOCTYPE html>
<html lang="${options.lang ?? 'en'}">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${metaTags}
    ${cssLinkTags}
    <title>${options.title ?? 'MoriaJS App'}</title>
  </head>
  <body>
    <div id="app">${componentHtml}</div>
    ${hydrationScript}
    ${scriptTags}
  </body>
</html>`;
}

/**
 * Hydrate a server-rendered Mithril component on the client.
 * Call this in your entry-client.ts.
 *
 * @example
 * ```ts
 * import { hydrate } from '@moriajs/renderer';
 * import App from './App.js';
 *
 * hydrate(App, document.getElementById('app')!);
 * ```
 */
export async function hydrate(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component: any,
    container: Element,
    data?: any
): Promise<void> {
    const mModule = await import('mithril');
    const m = mModule.default;
    // Wrap to pass data as attributes
    m.mount(container, {
        view: () => m(component, { serverData: data ?? {} })
    });
}

/**
 * Get hydration data injected by the server.
 */
export function getHydrationData<T = Record<string, unknown>>(): T | undefined {
    if (typeof window !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (window as any).__MORIA_DATA__ as T | undefined;
    }
    return undefined;
}
