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

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { glob } from 'glob';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { MoriaConfig } from './config.js';
import { scanMiddleware, getMiddlewareChain, type MoriaMiddleware } from './middleware.js';

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
 * Options for route registration.
 */
export interface RegisterRoutesOptions {
    /** Application mode */
    mode?: 'development' | 'production';
    /** MoriaJS config for renderer options */
    config?: Partial<MoriaConfig>;
}

/**
 * Convert a file path to a URL path.
 *
 * - Strips file extension
 * - Converts `[param]` → `:param`
 * - Converts `[...slug]` → `*`
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

    // Convert [param] → :param
    route = route.replace(/\[([^\].]+)\]/g, ':$1');

    // Convert [...slug] → *
    route = route.replace(/\[\.\.\.([^\]]+)\]/g, '*');

    // Handle pages prefix — strip "pages" and make root-relative
    if (route.startsWith('pages/')) {
        route = route.slice(5); // remove "pages"
    }
    // Handle api prefix — keep "api"
    // (no transformation needed)

    // Handle index files → parent path
    route = route.replace(/\/index$/, '');

    // Ensure leading slash
    if (!route.startsWith('/')) {
        route = '/' + route;
    }

    // Root case
    if (route === '') {
        route = '/';
    }

    return route;
}

/**
 * Scan a directory for route files and return discovered routes.
 *
 * @param routesDir - Absolute path to the routes directory (e.g., `<project>/src/routes`)
 */
export async function scanRoutes(routesDir: string): Promise<RouteEntry[]> {
    const pattern = '**/*.{ts,js,mts,mjs}';
    const files = await glob(pattern, {
        cwd: routesDir,
        posix: true,
        ignore: ['**/_*', '**/*.d.ts', '**/*.test.*', '**/*.spec.*'],
    });

    const routes: RouteEntry[] = [];

    for (const file of files) {
        const urlPath = filePathToUrlPath(file);
        const type: 'api' | 'page' = file.startsWith('api/') ? 'api' : 'page';

        const absolutePath = path.resolve(routesDir, file);
        const fileUrl = pathToFileURL(absolutePath).href;

        // Dynamically import the route module
        let mod: Record<string, unknown>;
        try {
            mod = await import(fileUrl);
        } catch (err) {
            console.warn(`[moria] Failed to load route: ${file}`, err);
            continue;
        }

        if (type === 'page') {
            // ─── Page route: expects default Mithril component ───────
            const component = mod.default;
            const getServerData = typeof mod.getServerData === 'function'
                ? mod.getServerData as GetServerData
                : undefined;

            // Page routes can also export raw HTTP handlers (backward compat)
            if (component && typeof component === 'object' && 'view' in component) {
                routes.push({
                    filePath: file,
                    urlPath,
                    type: 'page',
                    methods: {},
                    component,
                    getServerData,
                });
                continue;
            }

            // Fallback: if default export is a function, treat as API-style handler
            if (typeof component === 'function') {
                routes.push({
                    filePath: file,
                    urlPath,
                    type: 'page',
                    methods: { get: component as RouteHandler },
                });
                continue;
            }

            // Also check for named HTTP method exports
            const methods: Partial<Record<Lowercase<HttpMethod>, RouteHandler>> = {};
            for (const method of HTTP_METHODS) {
                const handler = mod[method] ?? mod[method.toLowerCase()];
                if (typeof handler === 'function') {
                    methods[method.toLowerCase() as Lowercase<HttpMethod>] = handler as RouteHandler;
                }
            }
            if (Object.keys(methods).length > 0) {
                routes.push({ filePath: file, urlPath, type: 'page', methods });
                continue;
            }

            console.warn(`[moria] Page route has no component or handlers: ${file}`);
        } else {
            // ─── API route: expects named HTTP method exports ────────
            const methods: Partial<Record<Lowercase<HttpMethod>, RouteHandler>> = {};
            for (const method of HTTP_METHODS) {
                const handler = mod[method] ?? mod[method.toLowerCase()];
                if (typeof handler === 'function') {
                    methods[method.toLowerCase() as Lowercase<HttpMethod>] = handler as RouteHandler;
                }
            }

            // Also support default export as GET handler
            if (typeof mod.default === 'function' && !methods.get) {
                methods.get = mod.default as RouteHandler;
            }

            if (Object.keys(methods).length === 0) {
                console.warn(`[moria] Route file has no handlers: ${file}`);
                continue;
            }

            routes.push({ filePath: file, urlPath, type: 'api', methods });
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
    const routes = await scanRoutes(routesDir);
    const mode = options.mode ?? 'development';
    const config = options.config ?? {};

    // ─── Scan file-based middleware ──────────────────────────
    const middlewareEntries = await scanMiddleware(routesDir);
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
            // Smarter default for client entry: check for .ts then .js
            const defaultEntry = fs.existsSync(path.join(config.rootDir || process.cwd(), 'src/entry-client.ts'))
                ? '/src/entry-client.ts'
                : '/src/entry-client.js';
            const clientEntry = config.vite?.clientEntry ?? defaultEntry;

            server.route({
                method: 'GET',
                url: route.urlPath,
                preHandler,
                handler: async (request: FastifyRequest, reply: FastifyReply) => {
                    // Load server data if available
                    let initialData: Record<string, unknown> = {};
                    if (getServerData) {
                        initialData = (await getServerData(request)) as Record<string, unknown> || {};
                    }

                    // Dynamic import of renderer (avoids circular deps)
                    const { renderToString } = await import('@moriajs/renderer');

                    const html = await renderToString(component, {
                        title: (component as { title?: string }).title ?? 'MoriaJS App',
                        initialData,
                        mode,
                        clientEntry,
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
                method: method.toUpperCase() as Uppercase<string>,
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
