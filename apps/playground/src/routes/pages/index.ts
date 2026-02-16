/**
 * Home page — Mithril.js component rendered via SSR.
 *
 * Exports:
 *   default  — Mithril component (server-rendered + client-hydrated)
 *   getServerData — called on server before rendering
 */

import m from 'mithril';

// ─── Server Data Loader ─────────────────────────────────
/**
 * Fetches data on the server before rendering.
 * The returned object is serialized as `window.__MORIA_DATA__`
 * and available to the client via `getHydrationData()`.
 */
export async function getServerData() {
  return {
    framework: 'MoriaJS',
    version: '0.1.0',
    renderedAt: new Date().toISOString(),
    features: [
      { icon: '⚡', name: 'Fastify', desc: 'High-perf Node.js server' },
      { icon: '🔥', name: 'Vite + HMR', desc: 'Instant dev reloads' },
      { icon: '📁', name: 'File Routing', desc: 'Auto route discovery' },
      { icon: '🔄', name: 'SSR + Hydration', desc: 'Server render → client takeover' },
      { icon: '🗄️', name: 'Database', desc: 'Kysely PG + SQLite' },
      { icon: '🔐', name: 'Auth', desc: 'JWT + httpOnly cookies' },
    ],
  };
}

// ─── Types ───────────────────────────────────────────────
interface ServerData {
  framework: string;
  version: string;
  renderedAt: string;
  features: { icon: string; name: string; desc: string }[];
}

// ─── Component ───────────────────────────────────────────
let clickCount = 0;

const HomePage: m.Component = {
  view() {
    // Read hydration data from server
    const data: ServerData | undefined =
      typeof window !== 'undefined'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (window as any).__MORIA_DATA__ as ServerData
        : undefined;

    return m('div', { style: styles.page }, [
      m('div', { style: styles.container }, [
        m('h1', { style: styles.title }, '🏔️ MoriaJS'),
        m('p', { style: styles.subtitle }, 'The full-stack meta-framework for Mithril.js'),

        // Interactive element — proves hydration works
        m('button', {
          style: styles.button,
          onclick: () => { clickCount++; },
        }, `Clicks: ${clickCount} (proves hydration works!)`),

        // Features grid
        data
          ? m('div', { style: styles.grid },
            data.features.map((f) =>
              m('div', { key: f.name, style: styles.card }, [
                m('span', { style: styles.icon }, f.icon),
                m('strong', f.name),
                m('p', { style: styles.cardDesc }, f.desc),
              ])
            )
          )
          : null,

        // Routes
        m('div', { style: styles.routes }, [
          m('h3', { style: styles.routesTitle }, 'Try these routes:'),
          m('a', { href: '/health', style: styles.link }, 'GET /health — Health check'),
          m('a', { href: '/api/hello', style: styles.link }, 'GET /api/hello — API example'),
          m('a', { href: '/api/users/42', style: styles.link }, 'GET /api/users/42 — Dynamic params'),
        ]),

        // SSR timestamp
        data
          ? m('p', { style: styles.footer }, `Server-rendered at ${data.renderedAt}`)
          : null,
      ]),
    ]);
  },
};

// ─── Styles ──────────────────────────────────────────────
const styles = {
  page: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    color: '#e0e0ff',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    textAlign: 'center' as const,
    padding: '2rem',
    maxWidth: '700px',
  },
  title: { fontSize: '3rem', marginBottom: '0.5rem' },
  subtitle: { color: '#a0a0cc', fontSize: '1.2rem', marginBottom: '2rem' },
  button: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    fontSize: '1rem',
    cursor: 'pointer',
    marginBottom: '2rem',
    transition: 'transform 0.15s',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  card: {
    background: 'rgba(255,255,255,0.05)',
    padding: '1.25rem',
    borderRadius: '12px',
    textAlign: 'left' as const,
  },
  icon: { fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' },
  cardDesc: { color: '#a0a0cc', fontSize: '0.85rem', margin: '0.5rem 0 0' },
  routes: {
    textAlign: 'left' as const,
    background: 'rgba(255,255,255,0.05)',
    padding: '1.5rem 2rem',
    borderRadius: '12px',
    marginBottom: '1.5rem',
  },
  routesTitle: { marginBottom: '0.75rem', color: '#80c0ff' },
  link: { color: '#a0d0ff', textDecoration: 'none', display: 'block', padding: '0.25rem 0' },
  footer: { color: '#6060a0', fontSize: '0.8rem' },
};

export default HomePage;
