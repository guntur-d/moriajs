import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * GET /api/users/:id
 * Example dynamic route with URL parameter.
 */
export function GET(request: FastifyRequest<{ Params: { id: string } }>, _reply: FastifyReply) {
    const { id } = request.params;

    return {
        user: {
            id,
            name: `User ${id}`,
            email: `user${id}@example.com`,
        },
    };
}
