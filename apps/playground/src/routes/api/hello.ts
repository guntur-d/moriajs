import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * GET /api/hello
 * Example API route.
 */
export function GET(_request: FastifyRequest, _reply: FastifyReply) {
    return {
        message: '🏔️ Hello from MoriaJS!',
        framework: 'MoriaJS',
        version: '0.1.1',
    };
}
