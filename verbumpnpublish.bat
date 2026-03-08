@echo off
set "version=%~1"
if "%version%"=="" (
    set /p "version=Enter version (e.g., 0.4.15): "
)

if "%version%"=="" (
    echo No version provided. Exiting...
    exit /b 1
)

node -e "const fs = require('fs'); const paths = ['package.json', 'packages/auth/package.json', 'packages/cli/package.json', 'packages/core/package.json', 'packages/create-moria/package.json', 'packages/db/package.json', 'packages/renderer/package.json', 'packages/ui/package.json', 'apps/playground/package.json']; paths.forEach(p => { if (fs.existsSync(p)) { const pkg = JSON.parse(fs.readFileSync(p, 'utf8')); pkg.version = '%version%'; fs.writeFileSync(p, JSON.stringify(pkg, null, 2) + '\n'); console.log('Updated ' + p + ' to ' + '%version%'); } });"

echo Installing dependencies...
call pnpm install

echo Building packages...
call pnpm build

echo Publishing packages...
call pnpm -r publish --access public --no-git-checks
echo Done!