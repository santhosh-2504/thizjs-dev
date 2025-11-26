import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, rmSync, chmodSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Clean dist folder
try {
  rmSync(join(__dirname, 'dist'), { recursive: true, force: true });
} catch (e) {
  // Ignore if doesn't exist
}

mkdirSync(join(__dirname, 'dist'), { recursive: true });

console.log('🔨 Building @thizjs/dev...');

// Build the watcher module first
await build({
  entryPoints: ['src/watcher.js'],
  bundle: true,
  platform: 'node',
  target: 'node14',
  format: 'esm',
  outfile: 'dist/watcher.js',
  external: ['chokidar', 'chalk'],
  minify: true,
  sourcemap: false,
});

console.log('✓ Built watcher.js');

// Build the CLI entry point
// Create a temporary entry that imports from the BUILT watcher
const cliEntry = `import { createWatcher } from "./dist/watcher.js";
createWatcher({ entry: "src/server.js" }).start();`;

const tempEntry = join(__dirname, '.build-entry.js');
writeFileSync(tempEntry, cliEntry);

await build({
  entryPoints: ['.build-entry.js'],
  bundle: true,
  platform: 'node',
  target: 'node14',
  format: 'esm',
  outfile: 'dist/thiz-dev.js',
  external: ['chokidar', 'chalk'],
  minify: true,
  sourcemap: false,
  banner: {
    js: '#!/usr/bin/env node',
  },
});

// Clean up temp file
rmSync(tempEntry, { force: true });

console.log('✓ Built thiz-dev.js');

// Build the routes inspector command if it exists
try {
  await build({
    entryPoints: ['bin/thiz-routes.js'],
    bundle: true,
    platform: 'node',
    target: 'node16', // Changed from node14 for top-level await support
    format: 'esm',
    outfile: 'dist/thiz-routes.js',
    external: ['@thizjs/express', 'express', 'chalk', 'open'],
    minify: true,
    sourcemap: false,
    banner: {
      js: '#!/usr/bin/env node',
    },
  });
  
  chmodSync(join(__dirname, 'dist/thiz-routes.js'), 0o755);
  console.log('✓ Built thiz-routes.js');
} catch (e) {
  console.log('⚠ Skipping thiz-routes.js (file not found)');
}

// Make the CLI executable
chmodSync(join(__dirname, 'dist/thiz-dev.js'), 0o755);

console.log('✅ Build complete!');
console.log('📦 Output: dist/');