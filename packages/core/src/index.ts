/**
 * @moriajs/core
 *
 * Framework core: Fastify server factory with sensible defaults,
 * plugin registration, and configuration system.
 */

export { createApp } from './app.js';
export { defineConfig } from './config.js';
export { defineMoriaPlugin } from './plugins.js';

export type { MoriaApp, MoriaAppOptions } from './app.js';
export type { MoriaConfig } from './config.js';
export type { MoriaPlugin, MoriaPluginContext } from './plugins.js';
