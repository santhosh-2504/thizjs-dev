import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, rmSync, chmodSync, readFileSync, writeFileSync } from 'fs';

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

// Build the watcher module
await build({
  entryPoints: ['src/watcher.js'],
  bundle: true,
  platform: 'node',
  target: 'node14',
  format: 'esm',
  outfile: 'dist/watcher.js',
  external: ['chokidar', 'chalk'], // Keep dependencies external
  minify: true,
  sourcemap: false,
});

console.log('✓ Built watcher.js');

// Create a temporary CLI file WITHOUT shebang for bundling
const cliSource = readFileSync('bin/thiz-dev.js', 'utf-8');
const cliWithoutShebang = cliSource.replace(/^#!\/usr\/bin\/env node\s*\n/m, '');
const tempCliPath = join(__dirname, 'bin', '.thiz-dev.temp.js');
writeFileSync(tempCliPath, cliWithoutShebang);

// Build the CLI entry point
await build({
  entryPoints: ['bin/.thiz-dev.temp.js'],
  bundle: true,
  platform: 'node',
  target: 'node14',
  format: 'esm',
  outfile: 'dist/thiz-dev.js',
  external: ['chokidar', 'chalk'],
  minify: true,
  sourcemap: false,
  banner: {
    js: '#!/usr/bin/env node\n',
  },
});

// Clean up temp file
rmSync(tempCliPath, { force: true });

console.log('✓ Built thiz-dev.js');

// Make the CLI executable
chmodSync(join(__dirname, 'dist/thiz-dev.js'), 0o755);

console.log('✅ Build complete!');
console.log('📦 Output: dist/');