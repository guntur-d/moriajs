/**
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
