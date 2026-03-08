/**
 * Client-side entry point for MoriaJS Playground.
 *
 * This file is loaded in the browser after the server-rendered HTML.
 * It hydrates the Mithril component tree, making the page interactive.
 */

import '@hotwired/turbo';
import { bootstrap } from '@moriajs/renderer';

// Automatically discover and hydrate the correct component
document.addEventListener('turbo:load', () => {
    bootstrap(import.meta.glob('./routes/pages/**/*.{ts,js,tsx,jsx}')).catch(console.error);
});
