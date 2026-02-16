/**
 * API middleware — applies to /api/* routes only.
 *
 * Adds X-Powered-By header and sets JSON content type.
 */

import { defineMiddleware } from '@moriajs/core';

export default defineMiddleware(async (_request, reply) => {
    reply.header('X-Powered-By', 'MoriaJS');
    reply.header('X-API-Version', '0.2.0');
});
