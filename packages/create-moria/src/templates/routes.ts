/**
 * create-moria - API route templates parameterized by language.
 */

import type { TemplateLang } from './config.js';

const DB_GUARD_TS = `    // The MoriaJS Agnostic DB API
    // Works regardless of the underlying library (Kysely, Pongo, etc.)
    if (!request.server.db) {
        return reply.status(503).send({
            error: 'Database not configured',
            hint: 'Set up your database in moria.config.ts. See: https://github.com/guntur-d/moriajs#5-database',
        });
    }`;

const DB_GUARD_JS = `    // The MoriaJS Agnostic DB API
    if (!request.server.db) {
        return reply.status(503).send({
            error: 'Database not configured',
            hint: 'Set up your database in moria.config.ts. See: https://github.com/guntur-d/moriajs#5-database',
        });
    }`;

export function srcApiHello(lang: TemplateLang): string {
    if (lang === 'ts') {
        return `/**
 * GET /api/hello
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

export function GET(_request: FastifyRequest, _reply: FastifyReply) {
    return {
        message: 'Hello from MoriaJS! 🏔️',
        timestamp: new Date().toISOString(),
    };
}
`;
    }
    return `/**
 * GET /api/hello
 */

export function GET(_request, _reply) {
    return {
        message: 'Hello from MoriaJS! 🏔️',
        timestamp: new Date().toISOString(),
    };
}
`;
}

export function srcApiHealth(lang: TemplateLang): string {
    if (lang === 'ts') {
        return `/**
 * GET /api/health
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

export function GET(_request: FastifyRequest, _reply: FastifyReply) {
    return { status: 'ok', uptime: process.uptime() };
}
`;
    }
    return `/**
 * GET /api/health
 */

export function GET(_request, _reply) {
    return { status: 'ok', uptime: process.uptime() };
}
`;
}

export function srcApiUsers(lang: TemplateLang): string {
    if (lang === 'ts') {
        return `/**
 * GET /api/users/:id
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

export async function GET(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    
${DB_GUARD_TS}

    const user = await request.server.db.findOne<{ id: string, name: string, email: string }>('users', { id });
    return user ?? reply.status(404).send({ error: \`User \${id} not found\` });
}
`;
    }
    return `/**
 * GET /api/users/:id
 */

export async function GET(request, reply) {
    const { id } = request.params;
    
${DB_GUARD_JS}

    const user = await request.server.db.findOne('users', { id });
    return user ?? reply.status(404).send({ error: \`User \${id} not found\` });
}
`;
}

export function srcApiSearch(lang: TemplateLang): string {
    if (lang === 'ts') {
        return `/**
 * GET /api/search?q=...
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

export async function GET(request: FastifyRequest<{ Querystring: { q?: string } }>, reply: FastifyReply) {
    const { q = '' } = request.query;

    if (!request.server.db) {
        return reply.status(503).send({
            error: 'Database not configured',
            hint: 'Set up your database in moria.config.ts. See: https://github.com/guntur-d/moriajs#5-database',
        });
    }

    const results = await request.server.db.find('posts', { title: q });
    return { query: q, results };
}
`;
    }
    return `/**
 * GET /api/search?q=...
 */

export async function GET(request, reply) {
    const { q = '' } = request.query;

    if (!request.server.db) {
        return reply.status(503).send({
            error: 'Database not configured',
            hint: 'Set up your database in moria.config.ts. See: https://github.com/guntur-d/moriajs#5-database',
        });
    }

    const results = await request.server.db.find('posts', { title: q });
    return { query: q, results };
}
`;
}
