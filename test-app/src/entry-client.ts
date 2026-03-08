/**
 * Client-side entry point.
 * Hydrates the server-rendered page to make it interactive.
 */

import '@hotwired/turbo';
import { bootstrap } from '@moriajs/renderer';

// Automatically discover and hydrate the correct page component.
// We only include pages, not API routes.
document.addEventListener('turbo:load', () => {
    bootstrap(import.meta.glob('./routes/pages/**/*.{ts,js,tsx,jsx}')).catch(console.error);
});
