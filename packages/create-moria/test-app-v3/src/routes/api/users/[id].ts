/**
 * GET /api/users/:id
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

export async function GET(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { id } = request.params;
    
    // The MoriaJS Agnostic DB API
    // Works regardless of the underlying library (Kysely, Pongo, etc.)
    if (!request.server.db) {
        return reply.status(503).send({
            error: 'Database not configured',
            hint: 'Set up your database in moria.config.ts. See: https://github.com/guntur-d/moriajs#5-database',
        });
    }

    const user = await request.server.db.findOne<{ id: string, name: string, email: string }>('users', { id });
    return user ?? reply.status(404).send({ error: `User ${id} not found` });
}
