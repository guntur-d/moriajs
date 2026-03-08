/**
 * GET /api/health
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

export function GET(_request: FastifyRequest, _reply: FastifyReply) {
    return { status: 'ok', uptime: process.uptime() };
}
