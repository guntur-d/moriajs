import type { FastifyInstance } from 'fastify';
import type { MoriaConfig } from './config.js';

/**
 * Context provided to MoriaJS plugins during registration.
 */
export interface MoriaPluginContext {
    /** The Fastify server instance */
    server: FastifyInstance;
    /** The MoriaJS configuration */
    config: Partial<MoriaConfig>;
}

/**
 * A MoriaJS plugin.
 * Plugins extend the framework with additional functionality.
 */
export interface MoriaPlugin {
    /** Unique plugin name */
    name: string;
    /** Plugin registration function */
    register: (context: MoriaPluginContext) => Promise<void>;
}

/**
 * Helper to define a type-safe MoriaJS plugin.
 *
 * @example
 * ```ts
 * import { defineMoriaPlugin } from '@moriajs/core';
 *
 * export default defineMoriaPlugin({
 *   name: 'my-plugin',
 *   async register({ server, config }) {
 *     server.get('/my-route', async () => ({ hello: 'plugin' }));
 *   },
 * });
 * ```
 */
export function defineMoriaPlugin(plugin: MoriaPlugin): MoriaPlugin {
    return plugin;
}
