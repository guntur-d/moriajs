/**
 * @moriajs/db - barrel + factory + Fastify plugin.
 */

import type { FastifyInstance } from 'fastify';
import { MoriaDB, type MoriaDBAdapter } from './types.js';
import type { DatabaseConfig } from './config.js';
import { KyselyAdapter } from './kysely-adapter.js';
import { PongoAdapter } from './pongo-adapter.js';
import { MongoAdapter } from './mongo-adapter.js';

export * from './types.js';
export * from './config.js';
export { KyselyAdapter } from './kysely-adapter.js';
export { PongoAdapter } from './pongo-adapter.js';
export { MongoAdapter } from './mongo-adapter.js';
export { mapIdFilter, mapIdResult, DocumentAdapter } from './document-adapter.js';
export type { DocumentFilter, DocumentData, DocumentCollection } from './document-adapter.js';

/**
 * Factory to create a MoriaDB instance.
 */
export async function createDatabase(config: DatabaseConfig): Promise<MoriaDB> {
    let adapter: MoriaDBAdapter;

    if (config.adapter === 'mongo') {
        adapter = new MongoAdapter(config);
    } else if (config.usePongo && config.adapter === 'pg') {
        adapter = new PongoAdapter(config);
    } else {
        adapter = new KyselyAdapter(config);
    }

    const db = new MoriaDB(adapter);
    await db.connect();
    return db;
}

/**
 * Alias for createDatabase
 */
export const createDb = createDatabase;

/**
 * MoriaJS database plugin for Fastify integration.
 */
export function createDatabasePlugin(config: DatabaseConfig) {
    return {
        name: '@moriajs/db',
        async register({ server }: { server: FastifyInstance }) {
            const db = await createDatabase(config);
            if (!server.hasDecorator('db')) {
                server.decorate('db', db);
            }

            server.addHook('onClose', async () => {
                await db.disconnect();
            });
        },
    };
}
