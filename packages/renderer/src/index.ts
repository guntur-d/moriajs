/**
 * @moriajs/renderer
 *
 * Hybrid SSR/CSR rendering engine for Mithril.js.
 * Provides server-side rendering with mithril-node-render
 * and client-side hydration.
 */

/**
 * HTML-escape a string for safe interpolation into an HTML context.
 */
function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Serialize a value into a JS literal that is safe to inline inside a
 * `<script>` element. Breaks out of the script context via `</script>`,
 * `<!--`, or `-->` and escapes U+2028/U+2029 which can terminate the script.
 */
function jsonForScript(value: unknown): string {
    return JSON.stringify(value)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
}

// Number of SSR renders currently in flight on the shared `mithril` singleton.
// Mirrors of the original functions so we can restore them exactly once.
let ssrRenderCount = 0;
let ssrOriginalRequest: unknown;
let ssrOriginalRedraw: unknown;

/**
 * Enter SSR mode on the shared mithril singleton. Only patches m.request /
 * m.redraw on the first concurrent render and records the originals.
 */
function beginSsr(m: any): void {
    if (ssrRenderCount === 0) {
        ssrOriginalRequest = m.request;
        ssrOriginalRedraw = m.redraw;
        m.request = () => Promise.resolve();
        m.redraw = () => { };
    }
    ssrRenderCount++;
}

/**
 * Leave SSR mode. Restores the original m.request / m.redraw once the last
 * concurrent render completes.
 */
function endSsr(m: any): void {
    ssrRenderCount--;
    if (ssrRenderCount === 0) {
        m.request = ssrOriginalRequest;
        m.redraw = ssrOriginalRedraw;
        ssrOriginalRequest = undefined;
        ssrOriginalRedraw = undefined;
    }
}

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
    /** Pre-generated script tags to inject before </body> */
    scriptTags?: string;
    /** Parsed Vite manifest for resolving hashed production assets */
    manifest?: Record<string, any>;
    /** Base URL path for assets (default: '/assets/') */
    basePath?: string;
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
    // mithril-node-render has no type declarations — use string import to hide from static analysis
    const renderModule = await (Function('return import("mithril-node-render")')() as Promise<{ default: (vnode: unknown) => Promise<string> }>);
    const mModule = await (Function('return import("mithril")')() as Promise<{ default: (tag: any, attrs?: any) => any }>);

    const render = renderModule.default;
    const m: any = mModule.default;

    let componentHtml: string;
    try {
        // SSR-safe patching of m.request/m.redraw. These use browser globals
        // (XMLHttpRequest, FormData) or scheduling that are unavailable on the
        // server. Because `m` is a shared singleton and renders run concurrently,
        // patch only when the first render starts and restore only when the last
        // one finishes, so interleaved renders cannot clobber each other's callbacks.
        beginSsr(m);
        componentHtml = await render(m(component, { serverData: options.initialData ?? {} }));
    } finally {
        endSsr(m);
    }

    const metaTags = options.meta
        ? Object.entries(options.meta)
            .map(([name, content]) => `<meta name="${escapeHtml(name)}" content="${escapeHtml(String(content))}">`)
            .join('\n    ')
        : '';

    const cssLinkTags = options.cssLinks
        ? options.cssLinks
            .map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}">`)
            .join('\n    ')
        : '';

    const hydrationScript = options.initialData
        ? `<script>window.__MORIA_DATA__ = ${jsonForScript(options.initialData)};</script>`
        : '';

    // Dev vs production script tags
    let scriptTags: string;
    if (options.scriptTags) {
        scriptTags = options.scriptTags;
    } else {
        const mode = options.mode ?? 'production';
        const clientEntry = options.clientEntry ?? '/src/entry-client.ts';
        const basePath = options.basePath ?? '/assets/';
        const cleanBasePath = basePath.endsWith('/') ? basePath : basePath + '/';

        if (mode === 'development') {
            scriptTags = [
                `<script type="module" src="/@vite/client"></script>`,
                `<script type="module" src="${clientEntry}"></script>`,
            ].join('\n    ');
        } else {
            // Remove leading slash for manifest lookup if present
            const manifestKey = clientEntry.startsWith('/') ? clientEntry.slice(1) : clientEntry;
            let assetFile = 'entry-client.js'; // Fallback

            if (options.manifest && options.manifest[manifestKey]) {
                assetFile = options.manifest[manifestKey].file;
            }

            scriptTags = `<script type="module" src="${cleanBasePath}${assetFile}"></script>`;
        }
    }

    return `<!DOCTYPE html>
<html lang="${escapeHtml(options.lang ?? 'en')}">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${metaTags}
    ${cssLinkTags}
    <title>${escapeHtml(options.title ?? 'MoriaJS App')}</title>
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

/**
 * Automatically boot the MoriaJS application on the client.
 * Discovers the correct component based on hydration data and performs hydration.
 *
 * @param pages A glob import object from `import.meta.glob`.
 */
export async function bootstrap(pages: Record<string, () => Promise<any>>): Promise<void> {
    const root = document.getElementById('app');
    if (!root) {
        console.error('[MoriaJS] #app root element not found');
        return;
    }

    const data = getHydrationData<{ _moria_page?: string }>();
    const pagePath = data?._moria_page;

    if (!pagePath) {
        console.warn('[MoriaJS] No _moria_page found in hydration data');
        return;
    }

    // Try to find the component in the glob map
    // The path usually starts with ./routes/ or similar in the app space
    // We try to match the tail of the key with the pagePath.
    // We sort the keys by length to ensure the shortest (most direct) match is evaluated first,
    // preventing hydration hijacking (e.g. distinguishing index.js from admin/index.js if pagePath is index.js).
    const matchingKey = Object.keys(pages)
        .sort((a, b) => a.length - b.length)
        .find(key => key.endsWith(pagePath));

    if (matchingKey) {
        try {
            const mod = await pages[matchingKey]();
            const component = mod.default;

            if (!component) {
                console.error(`[MoriaJS] Component for ${pagePath} has no default export`);
                return;
            }

            await hydrate(component, root, data);
            console.log(`[MoriaJS] Hydrated: ${pagePath} ✓`);
        } catch (err) {
            console.error(`[MoriaJS] Failed to hydrate ${pagePath}:`, err);
        }
    } else {
        console.error(`[MoriaJS] Could not find component for: ${pagePath}`);
        console.log('Available pages:', Object.keys(pages));
    }
}
