/**
 * GET /api/hello
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

export function GET(_request: FastifyRequest, _reply: FastifyReply) {
    return {
        message: 'Hello from MoriaJS! 🏔️',
        timestamp: new Date().toISOString(),
    };
}
