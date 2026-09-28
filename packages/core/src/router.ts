/**
 * File-based routing for MoriaJS.
 *
 * Scans `src/routes/` for route files and auto-registers them with Fastify.
 *
 * Convention:
 *   src/routes/api/hello.ts       → GET /api/hello       (API handler)
 *   src/routes/api/users/[id].ts  → GET /api/users/:id   (API handler)
 *   src/routes/pages/index.ts     → GET /                (SSR page)
 *   src/routes/pages/about.ts     → GET /about           (SSR page)
 *
 * API routes export named HTTP method functions:
 *   export function GET(request, reply) { ... }
 *
 * Page routes export a Mithril component + optional data loader:
 *   export default { view() { return m('h1', 'Hello') } }
 *   export async function getServerData(request) { return { user: ... } }
 */

import type { FastifyInstance, FastifyRequest, FastifyReply, HTTPMethods } from 'fastify';
import { glob } from 'glob';
import path from 'node:path';
import type { MoriaConfig } from './config.js';
import { scanMiddleware, getMiddlewareChain, loadRouteModule, type MoriaMiddleware } from './middleware.js';
import { resolveClientEntry } from './assets.js';
import type { ViteDevServer } from 'vite';

/** Supported HTTP methods in route files. */
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] as const;
type HttpMethod = (typeof HTTP_METHODS)[number];

/** Handler function exported from a route file. */
export type RouteHandler = (request: FastifyRequest, reply: FastifyReply) => unknown | Promise<unknown>;

/** Data loader for page routes — runs on server before render. */
export type GetServerData = (request: FastifyRequest) => unknown | Promise<unknown>;

/** Discovered route entry. */
export interface RouteEntry {
    /** File path relative to routes dir */
    filePath: string;
    /** URL path pattern (e.g., /api/users/:id) */
    urlPath: string;
    /** Route type: 'api' or 'page' */
    type: 'api' | 'page';
    /** HTTP method → handler map (API routes) */
    methods: Partial<Record<Lowercase<HttpMethod>, RouteHandler>>;
    /** Mithril component (page routes only) */
    component?: unknown;
    /** Server data loader (page routes only) */
    getServerData?: GetServerData;
}

/**
 * Extract HTTP method handlers from a loaded route module.
 * Supports both uppercase (`GET`) and lowercase (`get`) named exports.
 */
function extractMethods(mod: Record<string, unknown>): Partial<Record<Lowercase<HttpMethod>, RouteHandler>> {
    const methods: Partial<Record<Lowercase<HttpMethod>, RouteHandler>> = {};
    for (const method of HTTP_METHODS) {
        const handler = mod[method] ?? mod[method.toLowerCase()];
        if (typeof handler === 'function') {
            methods[method.toLowerCase() as Lowercase<HttpMethod>] = handler as RouteHandler;
        }
    }
    return methods;
}

type ClassifiedModule =
    | { kind: 'component'; component: unknown; getServerData?: GetServerData }
    | { kind: 'handlers'; methods: Partial<Record<Lowercase<HttpMethod>, RouteHandler>> }
    | { kind: 'empty' };

/**
 * Pure dispatcher: classify a loaded route module into one RouteKind.
 * Single owner for the page/API discrimination rules (unit-testable).
 */
export function classifyModule(mod: Record<string, unknown>, isApi: boolean): ClassifiedModule {
    const methods = extractMethods(mod);
    const hasMethods = Object.keys(methods).length > 0;

    if (isApi) {
        if (typeof mod.default === 'function' && !methods.get) {
            methods.get = mod.default as RouteHandler;
        }
        return hasMethods || methods.get ? { kind: 'handlers', methods } : { kind: 'empty' };
    }

    const component = mod.default;
    if (component && typeof component === 'object' && 'view' in (component as Record<string, unknown>)) {
        const getServerData =
            typeof mod.getServerData === 'function' ? (mod.getServerData as GetServerData) : undefined;
        return { kind: 'component', component, getServerData };
    }
    if (typeof component === 'function' && !hasMethods) {
        return { kind: 'handlers', methods: { get: component as RouteHandler } };
    }
    if (hasMethods) {
        return { kind: 'handlers', methods };
    }
    return { kind: 'empty' };
}

/**
 * Options for route registration.
 */
export interface RegisterRoutesOptions {
    /** Application mode */
    mode?: 'development' | 'production';
    /** MoriaJS config for renderer options */
    config?: Partial<MoriaConfig>;
    /** Vite instance (for ssrLoadModule in development) */
    vite?: ViteDevServer;
    /** Fail fast on broken route modules instead of skipping (default: true) */
    strict?: boolean;
}

/**
 * Convert a file path to a URL path.
 *
 * - Strips file extension
 * - Converts `[...slug]` → `*` (checked BEFORE single-param so catch-alls aren't shadowed)
 * - Converts `[param]` → `:param`
 * - Converts `index` → `/`
 *
 * @example
 * filePathToUrlPath('api/users/[id].ts') → '/api/users/:id'
 * filePathToUrlPath('pages/index.ts')    → '/'
 * filePathToUrlPath('pages/about.ts')    → '/about'
 */
export function filePathToUrlPath(filePath: string): string {
    // Remove extension
    let route = filePath.replace(/\.(ts|js|mts|mjs)$/, '');

    // Normalize separators
    route = route.replace(/\\/g, '/');

    // Convert [...slug] → * FIRST so the single-param rule can't shadow it
    route = route.replace(/\[\.\.\.([^\]]+)\]/g, '*');

    // Convert [param] → :param
    route = route.replace(/\[([^\]/]+)\]/g, ':$1');

    // Handle pages prefix — strip "pages" and make root-relative
    if (route.startsWith('pages/')) {
        route = route.slice('pages/'.length);
    } else if (route === 'pages') {
        route = '';
    }

    // Handle index files → parent path
    route = route.replace(/(^|\/)index$/, '');

    // Ensure leading slash
    if (!route.startsWith('/')) {
        route = `/${route}`;
    }

    // Root case (`/` + empty → `//` guard, empty → `/`)
    if (route === '' || route === '//') {
        route = '/';
    }

    return route;
}

/**
 * Scan a directory for route files and return discovered routes.
 * Import failures throw (fail-loud); files with no handlers are skipped
 * with a warning so stray non-route files don't break the boot.
 *
 * @param routesDir - Absolute path to the routes directory (e.g., `<project>/src/routes`)
 * @param mode - Application mode
 * @param vite - Vite instance (optional)
 */
export async function scanRoutes(
    routesDir: string,
    mode: 'development' | 'production' = 'development',
    vite?: ViteDevServer
): Promise<RouteEntry[]> {
    const pattern = '**/*.{ts,js,mts,mjs}';
    const files = await glob(pattern, {
        cwd: routesDir,
        posix: true,
        ignore: ['**/_*', '**/*.d.ts', '**/*.test.*', '**/*.spec.*'],
    });

    const routes: RouteEntry[] = [];

    for (const file of files) {
        const urlPath = filePathToUrlPath(file);
        const isApi = file.startsWith('api/');
        const type: 'api' | 'page' = isApi ? 'api' : 'page';

        const absolutePath = path.resolve(routesDir, file);

        // Dynamically import the route module (fail-loud on broken code)
        let mod: Record<string, unknown>;
        try {
            mod = await loadRouteModule(absolutePath, mode === 'development' ? vite : undefined);
        } catch (err) {
            throw new Error(`[moria] Failed to load route: ${file}: ${(err as Error).message}`);
        }

        const classified = classifyModule(mod, isApi);
        if (classified.kind === 'empty') {
            console.warn(`[moria] Route file has no handlers: ${file}`);
            continue;
        }

        if (classified.kind === 'component') {
            routes.push({
                filePath: file,
                urlPath,
                type: 'page',
                methods: {},
                component: classified.component,
                getServerData: classified.getServerData,
            });
        } else {
            routes.push({ filePath: file, urlPath, type, methods: classified.methods });
        }
    }

    return routes;
}

/**
 * Register discovered routes with a Fastify server.
 *
 * Page routes with Mithril components are auto-wrapped with SSR rendering.
 * API routes are registered directly as Fastify handlers.
 * Middleware from `_middleware.ts` files is attached as `preHandler` hooks.
 */
export async function registerRoutes(
    server: FastifyInstance,
    routesDir: string,
    options: RegisterRoutesOptions = {}
): Promise<RouteEntry[]> {
    const mode = options.mode ?? 'development';
    const vite = options.vite;
    const routes = await scanRoutes(routesDir, mode, vite);
    const config = options.config ?? {};

    // Resolve renderer + vite-scripts at registration time (not per-request)
    // Dynamic imports avoid circular dependency at compile time.
    const { renderToString } = await import('@moriajs/renderer');
    const { getHtmlScripts } = await import('./vite.js');

    // Resolve client entry ONCE (not per-route fs.existsSync)
    const rootDir = config.rootDir ?? process.cwd();
    const clientEntry = config.vite?.clientEntry ?? resolveClientEntry(undefined, rootDir).urlPath;

    // ─── Scan file-based middleware ──────────────────────────
    const middlewareEntries = await scanMiddleware(routesDir, mode === 'development' ? vite : undefined);
    if (middlewareEntries.length > 0) {
        server.log.info(
            `Found ${middlewareEntries.length} middleware file(s): ${middlewareEntries.map((m) => m.scope || '/').join(', ')}`
        );
    }

    for (const route of routes) {
        // Resolve middleware chain for this route
        const chain: MoriaMiddleware[] = getMiddlewareChain(route.filePath, middlewareEntries);
        const preHandler = chain.length > 0 ? chain : undefined;

        // ─── Page route with Mithril component → SSR handler ─────
        if (route.component) {
            const component = route.component;
            const getServerData = route.getServerData;

            server.route({
                method: 'GET',
                url: route.urlPath,
                preHandler,
                handler: async (request: FastifyRequest, reply: FastifyReply) => {
                    // Load server data if available
                    const initialData: Record<string, unknown> = {
                        _moria_page: route.filePath,
                    };
                    if (getServerData) {
                        const serverData = (await getServerData(request)) as Record<string, unknown>;
                        // Prevent user data from overwriting internal routing metadata
                        const { _moria_page: _ignored, ...safeServerData } = serverData ?? {};
                        Object.assign(initialData, safeServerData);
                    }

                    const scriptTags = await getHtmlScripts(mode, config);

                    const html = await renderToString(
                        component as import('@moriajs/renderer').MithrilComponent,
                        {
                        title: (component as { title?: string }).title ?? 'MoriaJS App',
                        initialData,
                        mode,
                        clientEntry,
                        scriptTags,
                    });

                    reply.type('text/html');
                    return html;
                },
            });

            server.log.info(`Page:  GET ${route.urlPath} → ${route.filePath} (SSR)`);
            continue;
        }

        // ─── API / raw handler routes ────────────────────────────
        for (const [method, handler] of Object.entries(route.methods)) {
            server.route({
                method: method.toUpperCase() as HTTPMethods,
                url: route.urlPath,
                preHandler,
                handler: handler as RouteHandler,
            });
            server.log.info(`Route: ${method.toUpperCase()} ${route.urlPath} → ${route.filePath}`);
        }
    }

    server.log.info(`Registered ${routes.length} file-based route(s)`);
    return routes;
}
