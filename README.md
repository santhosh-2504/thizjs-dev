# @thizjs/dev

> A blazingly fast, lightweight development server for [THIZ.js](https://github.com/santhosh-2504/create-thiz-app) — because you deserve better than slow, bloated watchers.

[![npm version](https://img.shields.io/npm/v/@thizjs/dev.svg)](https://www.npmjs.com/package/@thizjs/dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## What is thiz?

`@thizjs/dev` is the official development runtime for **THIZ.js** — a clean, fast backend framework with file-based routing for Express. Thiz package provides hot-reloading for your server without the overhead of nodemon or other heavy watchers.

**Features:**
- ⚡ **Lightning fast** — restarts your server in milliseconds
- 🪶 **Lightweight** — minimal dependencies, maximum speed
- 🎨 **Beautiful output** — clean, colorful console logs
- 🔥 **Smart watching** — debounced restarts with intelligent file filtering
- 🛠️ **Zero config** — works out of the box with sensible defaults

## Quick Start

If you're starting a new THIZ.js project:
```bash
npx create-thiz-app my-app
cd my-app
npm run dev
```

That's it. You now have a production-ready MEN stack with file-based routing and hot-reloading.

👉 **Learn more:** [create-thiz-app](https://www.npmjs.com/package/create-thiz-app)

## Installation

For existing projects:
```bash
npm install --save-dev @thizjs/dev
```

Add to your `package.json`:
```json
{
  "scripts": {
    "dev": "thiz-dev"
  }
}
```

Run:
```bash
npm run dev
```

## Usage

### Command Line

The simplest way to use `@thizjs/dev`:
```bash
npx thiz-dev
```

By default, it watches the `src` directory and runs `src/server.js`.

### Programmatic API

Need more control? Use the programmatic API:
```javascript
import { createWatcher } from '@thizjs/dev';

const watcher = createWatcher({
  entry: 'src/server.js',      // Entry point for your server
  watch: 'src',                 // Directory/glob to watch
  ignore: ['**/node_modules/**'], // Patterns to ignore
  nodeArgs: ['--enable-source-maps'], // Node.js arguments
  env: { PORT: 3000 },          // Environment variables
  debounce: 150,                // Restart debounce (ms)
  verbose: false,               // Detailed logging
});

watcher.start();

// Later...
// await watcher.stop();
// watcher.restart(); // Manual restart
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entry` | `string` | `"src/server.js"` | Path to your server entry file |
| `watch` | `string \| string[]` | `"src"` | Paths or globs to watch for changes |
| `ignore` | `string[]` | `["**/node_modules/**", "**/.git/**"]` | Patterns to ignore |
| `nodeArgs` | `string[]` | `[]` | Arguments to pass to Node.js (e.g., `--inspect`) |
| `env` | `object` | `{}` | Environment variables for the child process |
| `debounce` | `number` | `150` | Milliseconds to wait before restarting |
| `verbose` | `boolean` | `false` | Enable detailed logging |

## Why Not Nodemon?

We love nodemon, but:
- **Size matters:** nodemon has many dependencies and features you might not need. `@thizjs/dev` is just 6.9KB.
- **Speed matters:** Smart debouncing and minimal overhead mean faster restarts.
- **Simplicity matters:** Built specifically for THIZ.js workflows — no feature bloat.

## How It Works

1. **Watches** your source files using [chokidar](https://github.com/paulmillr/chokidar)
2. **Detects** changes with intelligent filtering (ignores `node_modules`, `.git`, etc.)
3. **Restarts** your server gracefully with SIGTERM → SIGKILL fallback
4. **Debounces** rapid changes to avoid restart spam
5. **Logs** everything beautifully with [chalk](https://github.com/chalk/chalk)

## Examples

### Watch Multiple Directories
```javascript
createWatcher({
  watch: ['src', 'config', 'lib'],
}).start();
```

### Debug Mode
```javascript
createWatcher({
  nodeArgs: ['--inspect'],
  verbose: true,
}).start();
```

### Custom Environment
```javascript
createWatcher({
  env: {
    NODE_ENV: 'development',
    DEBUG: 'app:*',
  },
}).start();
```

## Contributing

We welcome contributions! If you find a bug or want to add a feature:

1. Fork the repo: [https://github.com/santhosh-2504/thizjs-dev](https://github.com/santhosh-2504/thizjs-dev)
2. Create a branch: `git checkout -b feature/amazing-thing`
3. Commit your changes: `git commit -m 'Add amazing thing'`
4. Push and open a PR

## About THIZ.js

THIZ.js is an opinionated MEN (MongoDB, Express, Node.js) stack generator that gives you:
- 📁 **File-based routing** — no more route boilerplate
- 🚀 **Zero config** — sensible defaults that just work
- 🛠️ **Production ready** — built for scale from day one

Start building backends that don't suck:
```bash
npx create-thiz-app my-awesome-api
```

## License

MIT © [Santhosh Kumar Anantha](https://github.com/santhosh-2504)

---

**Made with ❤️ for developers who value speed and simplicity.**