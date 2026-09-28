/**
 * Pongo (Document Store on Postgres) adapter — connection lifecycle only.
 * CRUD lives in DocumentAdapter.
 */

import { pongoClient, type PongoClient } from '@event-driven-io/pongo';
import type { MoriaDBAdapter } from './types.js';
import type { DatabaseConfig } from './config.js';
import { DocumentAdapter, type DocumentCollection } from './document-adapter.js';

export class PongoAdapter extends DocumentAdapter implements MoriaDBAdapter {
    private client: PongoClient | null = null;

    constructor(private config: DatabaseConfig) {
        super();
    }

    async connect(): Promise<void> {
        if (!this.config.url) {
            throw new Error('@moriajs/db: PostgreSQL connection URL is required for Pongo');
        }
        // NOTE: Pongo 0.16.x currently hardcodes the JSONB column name to 'data'.
        this.client = pongoClient(this.config.url);
        await this.client.connect();
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.close();
        }
    }

    protected collection<T extends Record<string, unknown>>(name: string): DocumentCollection<T> {
        if (!this.client) throw new Error('@moriajs/db: not connected (call connect() first)');
        const raw = this.client.db().collection<T>(name);
        return raw as unknown as DocumentCollection<T>;
    }

    raw<T>(): T {
        return this.client as unknown as T;
    }
}
