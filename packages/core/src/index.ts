/**
 * @moriajs/core
 *
 * Framework core: Fastify server factory with sensible defaults,
 * plugin registration, Vite integration, file-based routing,
 * and middleware system.
 */

export { createApp } from './app.js';
export { defineConfig } from './config.js';
export { defineMoriaPlugin } from './plugins.js';
export { defineMiddleware } from './middleware.js';
export { createViteDevMiddleware, serveProductionAssets, getHtmlScripts } from './vite.js';
export { scanRoutes, registerRoutes, filePathToUrlPath } from './router.js';

export type { MoriaApp, MoriaAppOptions } from './app.js';
export type { MoriaConfig } from './config.js';
export type { MoriaPlugin, MoriaPluginContext } from './plugins.js';
export type { MoriaMiddleware, MiddlewareEntry } from './middleware.js';
export type { RouteEntry, RouteHandler } from './router.js';
