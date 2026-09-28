/**
 * create-moria - build/start script templates.
 */

export function scriptBuild(isTS: boolean): string {
    return `import fs from 'node:fs';
import { execSync } from 'node:child_process';

console.log('--- Building MoriaJS App ---');
${isTS ? `console.log('Compiling TypeScript...');
execSync('npx tsc', { stdio: 'inherit' });` : `console.log('Copying JavaScript files...');
if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
}
fs.cpSync('src', 'dist', {
    recursive: true,
    filter: (src) => !src.includes('entry-client') && !src.includes('vite.config')
});`}

console.log('Building client assets...');
execSync('npx vite build --outDir dist/client', { stdio: 'inherit' });
console.log('--- Build Complete ---');
`;
}

export function scriptStart(): string {
    return `import { execSync } from 'node:child_process';

console.log('Preparing production build...');
execSync('node scripts/build.js', { stdio: 'inherit' });

console.log('Starting server...');
execSync('node dist/index.js', { stdio: 'inherit' });
`;
}
