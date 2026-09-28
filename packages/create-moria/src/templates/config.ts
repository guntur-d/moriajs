/**
 * create-moria - shared project template primitives.
 */

export type TemplateLang = 'ts' | 'js';

export function tsconfigContent(): string {
    return JSON.stringify(
        {
            compilerOptions: {
                target: 'ES2022',
                module: 'ESNext',
                moduleResolution: 'bundler',
                esModuleInterop: true,
                strict: true,
                skipLibCheck: true,
                outDir: 'dist',
                rootDir: 'src',
                declaration: true,
                declarationMap: true,
                sourceMap: true,
                types: ['node', 'vite/client'],
            },
            include: ['src'],
            exclude: ['node_modules', 'dist'],
        },
        null,
        4
    );
}

export function envContent(db: string): string {
    const lines = [
        '# MoriaJS Environment Variables',
        '',
        '# Server',
        'PORT=3000',
        '',
        '# Database',
    ];
    if (db === 'pg') {
        lines.push('DATABASE_URL=postgresql://user:password@localhost:5432/mydb');
    } else {
        lines.push('# SQLite uses a local file (configured in moria.config.ts)');
    }
    lines.push('', '# Auth', 'JWT_SECRET=change-me-to-a-random-secret', '');
    return lines.join('\n');
}

export function gitignoreContent(): string {
    return `node_modules/
dist/
.env
*.db
.turbo/
`;
}

function dbConfigSnippet(db: string, usePongo: boolean): string {
    if (db === 'sqlite') {
        return `    adapter: 'sqlite',\n    filename: './dev.db',`;
    }
    return `    adapter: 'pg',\n    url: process.env.DATABASE_URL,${usePongo ? '\n    usePongo: true,' : ''}`;
}

export function moriaConfig(lang: TemplateLang, db: string, usePongo: boolean = false): string {
    const dbConfig = dbConfigSnippet(db, usePongo);
    if (lang === 'ts') {
        return `import { defineConfig } from '@moriajs/core';

export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 3000,
  },
  database: {
${dbConfig}
  },
  vite: {
    clientEntry: '/src/entry-client.ts',
  },
});
`;
    }
    return `/** @type {import('@moriajs/core').MoriaConfig} */
export default {
  server: {
    port: Number(process.env.PORT) || 3000,
  },
  database: {
${dbConfig}
  },
  vite: {
    clientEntry: '/src/entry-client.js',
  },
};
`;
}

export function viteConfig(lang: TemplateLang): string {
    const entry = lang === 'ts' ? 'src/entry-client.ts' : 'src/entry-client.js';
    return `import { defineConfig } from 'vite';

export default defineConfig({
  base: '/assets/',
  build: {
    outDir: 'dist/client',
    assetsDir: '',
    rollupOptions: {
      input: '${entry}',
    },
    manifest: true,
  },
});
`;
}

export function srcEnvDTs(): string {
    return `/// <reference types="vite/client" />\n`;
}
