/**
 * @moriajs/core
 *
 * Framework core: Fastify server factory with sensible defaults,
 * plugin registration, Vite integration, file-based routing,
 * and middleware system.
 */

export { createApp, ensureBigIntJson, buildHelmetOptions } from './app.js';
export { defineConfig } from './config.js';
export { defineMoriaPlugin } from './plugins.js';
export { defineMiddleware, scanMiddleware, getMiddlewareChain, loadRouteModule, normalizeScope } from './middleware.js';
export { createViteDevMiddleware, serveProductionAssets, getHtmlScripts } from './vite.js';
export {
    scanRoutes,
    registerRoutes,
    filePathToUrlPath,
    classifyModule,
} from './router.js';
export {
    resolveClientEntry,
    buildScriptTags,
    resolveBuildInput,
    loadManifest,
    manifestAbsolutePath,
    ASSET_PREFIX,
    CLIENT_OUTDIR,
    MANIFEST_REL_PATH,
    DEFAULT_CLIENT_ENTRY,
} from './assets.js';

export type { MoriaApp, MoriaAppOptions } from './app.js';
export type { MoriaConfig, MoriaDatabaseAdapter, MoriaHelmetOptions } from './config.js';
export type { MoriaPlugin, MoriaPluginContext } from './plugins.js';
export type { MoriaMiddleware, MiddlewareEntry } from './middleware.js';
export type { RouteEntry, RouteHandler, GetServerData, RegisterRoutesOptions } from './router.js';
export type { ResolvedClientEntry } from './assets.js';
