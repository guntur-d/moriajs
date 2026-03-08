import { execSync } from 'node:child_process';

console.log('Preparing production build...');
execSync('node scripts/build.js', { stdio: 'inherit' });

console.log('Starting server...');
execSync('node dist/index.js', { stdio: 'inherit' });
