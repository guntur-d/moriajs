/**
 * Root middleware — runs on every request.
 */

    import { defineMiddleware } from '@moriajs/core';

    export default defineMiddleware(async (request) => {
        request.log.info(`→ ${request.method} ${request.url}`);
});
