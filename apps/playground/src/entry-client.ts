/**
 * Client-side entry point for MoriaJS Playground.
 *
 * This file is loaded in the browser after the server-rendered HTML.
 * It hydrates the Mithril component tree, making the page interactive.
 */

import m from 'mithril';
import HomePage from './routes/pages/index.js';

// Mount the app — Mithril takes over the server-rendered HTML
const root = document.getElementById('app');

if (root) {
    m.mount(root, HomePage);
    console.log('[MoriaJS] Client hydration complete ✓');
} else {
    console.error('[MoriaJS] #app root element not found');
}
