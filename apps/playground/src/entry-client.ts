/**
 * Client-side entry point for MoriaJS Playground.
 *
 * This file is loaded in the browser after the server-rendered HTML.
 * It hydrates the Mithril component tree, making the page interactive.
 */

import { bootstrap } from '@moriajs/renderer';

// Automatically discover and hydrate the correct component
bootstrap(import.meta.glob('./routes/**/*.{ts,js,tsx,jsx}')).catch(console.error);
