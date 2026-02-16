/**
 * Root middleware — applies to ALL routes under src/routes/.
 *
 * Logs incoming requests with timing information.
 */

import { defineMiddleware } from '@moriajs/core';

export default defineMiddleware(async (request) => {
    const start = Date.now();

    // Attach timing for downstream use
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (request as any)._startTime = start;

    request.log.info(`→ ${request.method} ${request.url}`);
});
