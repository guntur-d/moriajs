import fs from 'node:fs';
import { execSync } from 'node:child_process';

console.log('--- Building MoriaJS App ---');
console.log('Compiling TypeScript...');
execSync('npx tsc', { stdio: 'inherit' });

console.log('Building client assets...');
execSync('npx vite build --outDir dist/client', { stdio: 'inherit' });
console.log('--- Build Complete ---');
