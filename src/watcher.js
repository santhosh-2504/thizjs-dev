// src/watcher.js
import { spawn } from "child_process";
import chokidar from "chokidar";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import { loadEnv, watchEnv } from "./env-loader.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * createWatcher(options)
 *
 * options:
 *  - entry: string (path to server entry, relative to cwd) — default: "src/server.js"
 *  - watch: string|array (paths/globs) — default: "src"
 *  - ignore: array of globs to ignore
 *  - nodeArgs: array of node args (e.g. ["--enable-source-maps"])
 *  - env: object with env vars to merge into process.env for child
 *  - debounce: number ms (default 600)
 *  - verbose: boolean
 *  - restartOnEnvChange: boolean (default true) - restart server when .env files change
 *
 * Returns an object with start() and stop()
 */

export function createWatcher(opts = {}) {
  const {
    entry = "src/server.js",
    watch = "src",
    ignore = ["**/node_modules/**", "**/.git/**", "**/.cache/**"],
    nodeArgs = [],
    env = {},
    debounce = 600,
    verbose = false,
    restartOnEnvChange = true,
  } = opts;

  let child = null;
  let restartTimer = null;
  let shuttingDown = false;
  let isRestarting = false;
  let isGracefulKill = false;
  let consecutiveCrashes = 0;
  let pendingRestartReason = null;
  let envWatcher = null;
  
  const STARTUP_TIMEOUT = 3000;

  // Load env vars on startup
  loadEnv();

  function spawnChild() {
    if (shuttingDown) {
      if (verbose) console.log(chalk.gray("[THIZ-DEV] Spawn blocked - shutting down"));
      return;
    }

    const entryPath = path.resolve(process.cwd(), entry);
    if (verbose) console.log(chalk.gray(`Spawning node ${entryPath}`));

    const args = [...nodeArgs, entryPath];
    
    // Merge loaded env vars with custom env and process.env
    const childEnv = { 
      ...process.env,
      ...env,
      // Add flag so child process knows it's running under thiz-dev
      THIZ_DEV: "true"
    };

    child = spawn(process.execPath, args, {
      stdio: ["inherit", "inherit", "inherit"],
      env: childEnv,
    });

    const startTime = Date.now();
    let successTimer = null;

    const handleExit = (code, signal) => {
      if (successTimer) clearTimeout(successTimer);
      
      if (shuttingDown) return;

      const uptime = Date.now() - startTime;
      const reason = signal ? `signal ${signal}` : `code ${code}`;

      // If this was a graceful kill (restart), don't treat as crash
      if (isGracefulKill) {
        if (verbose) console.log(chalk.gray(`[THIZ-DEV] Server stopped for restart (${reason})`));
        isGracefulKill = false;
        child = null;
        return;
      }

      // Crashed quickly = likely syntax error or startup issue
      if (uptime < STARTUP_TIMEOUT && code !== 0) {
        consecutiveCrashes++;
        
        console.log(chalk.red(`[THIZ-DEV] Server crashed (${consecutiveCrashes}x) after ${uptime}ms - ${reason}`));
        
        if (consecutiveCrashes >= 3) {
          console.log(chalk.yellow("[THIZ-DEV] Multiple crashes detected. Waiting for file to stabilize..."));
        } else {
          console.log(chalk.yellow("[THIZ-DEV] Waiting for next valid file change..."));
        }
        
        child = null;
        return;
      }

      // Normal unexpected exit
      consecutiveCrashes = 0;
      console.log(chalk.yellow(`[THIZ-DEV] Server exited unexpectedly (${reason})`));
      child = null;
    };

    // Track successful startup
    successTimer = setTimeout(() => {
      consecutiveCrashes = 0;
      if (verbose) console.log(chalk.gray("[THIZ-DEV] Server running stably"));
    }, STARTUP_TIMEOUT);

    child.on("exit", handleExit);

    child.on("error", (err) => {
      if (successTimer) clearTimeout(successTimer);
      console.error(chalk.red("[THIZ-DEV] Child process error:"), err);
      consecutiveCrashes++;
      child = null;
    });

    console.log(chalk.green(`[THIZ-DEV] Started server (pid: ${child.pid})`));
  }

  async function killChild() {
    if (!child || child.killed) {
      child = null;
      return;
    }

    isGracefulKill = true;

    return new Promise((resolve) => {
      const killTimeout = setTimeout(() => {
        try {
          if (child && !child.killed) {
            if (verbose) console.log(chalk.gray("[THIZ-DEV] Force killing server"));
            child.kill("SIGKILL");
          }
        } catch (e) {
          // Ignore
        }
        resolve();
      }, 2000);

      const cleanup = () => {
        clearTimeout(killTimeout);
        child = null;
        resolve();
      };

      child.once("exit", cleanup);

      try {
        child.kill("SIGTERM");
      } catch (e) {
        cleanup();
      }

      if (child && child.killed) {
        cleanup();
      }
    });
  }

  async function performRestart(reason) {
    if (shuttingDown) return;

    try {
      await killChild();
      await new Promise(resolve => setTimeout(resolve, 150));
      
      if (!shuttingDown) {
        spawnChild();
      }
    } catch (err) {
      console.error(chalk.red("[THIZ-DEV] Restart error:"), err);
      isGracefulKill = false;
    }
  }

  async function restart(reason = "file change") {
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }

    if (isRestarting) {
      pendingRestartReason = reason;
      if (verbose) console.log(chalk.gray(`[THIZ-DEV] Restart pending - ${reason}`));
      return;
    }

    // Increase debounce after consecutive crashes
    const effectiveDebounce = consecutiveCrashes >= 3 ? debounce * 2 : debounce;

    restartTimer = setTimeout(async () => {
      restartTimer = null;
      
      if (isRestarting) {
        pendingRestartReason = reason;
        return;
      }

      isRestarting = true;
      pendingRestartReason = null;

      await performRestart(reason);

      isRestarting = false;

      if (pendingRestartReason && !shuttingDown) {
        const nextReason = pendingRestartReason;
        pendingRestartReason = null;
        setTimeout(() => restart(nextReason), 100);
      }
    }, effectiveDebounce);
  }

  let watcher = null;
  let recentChanges = new Map();

  function start() {
    if (watcher) return;

    spawnChild();

    // Setup env hot-reloading if enabled
if (restartOnEnvChange) {
  watchEnv((newEnv, event, fileName) => {
    if (verbose) {
      const keys = Object.keys(newEnv);
      console.log(chalk.gray(`[THIZ-DEV] Loaded ${keys.length} env vars from ${fileName}`));
    }
    // Trigger restart so child process gets new env vars
    restart(`env change: ${fileName}`);
  }).then(w => {
        envWatcher = w;
      });
    }

    // Add .env files to ignore list
    const envIgnorePatterns = [
      "**/.env",
      "**/.env.local",
      "**/.env.development",
      "**/.env.production",
      "**/.env.*",
    ];

    watcher = chokidar.watch(watch, {
      ignored: [...ignore, ...envIgnorePatterns],
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
      },
    });

    watcher.on("all", (ev, filePath) => {
      const relative = path.relative(process.cwd(), filePath);
      
      if (relative.startsWith("node_modules") || relative.startsWith(".git")) {
        return;
      }

      if (relative.includes("~") || relative.endsWith(".swp") || relative.endsWith(".tmp")) {
        return;
      }

      // Skip .env files (handled separately)
      if (relative.startsWith(".env")) {
        return;
      }

      if (verbose) console.log(chalk.gray(`[THIZ-DEV] ${ev} — ${relative}`));

      const changeKey = `${relative}`;
      const now = Date.now();
      
      if (recentChanges.has(changeKey)) {
        const lastTime = recentChanges.get(changeKey);
        if (now - lastTime < 100) {
          return;
        }
      }
      
      recentChanges.set(changeKey, now);

      if (recentChanges.size > 100) {
        const cutoff = now - 10000;
        for (const [key, time] of recentChanges.entries()) {
          if (time < cutoff) recentChanges.delete(key);
        }
      }

      restart(`${ev} ${relative}`);
    });

    watcher.on("error", (err) => {
      console.error(chalk.red("[THIZ-DEV] Watcher error:"), err);
    });

    const handleShutdown = async (signal) => {
      console.log(chalk.yellow(`\n[THIZ-DEV] ${signal} received — shutting down...`));
      await stop();
      process.exit(0);
    };

    process.once("SIGINT", () => handleShutdown("SIGINT"));
    process.once("SIGTERM", () => handleShutdown("SIGTERM"));

    console.log(chalk.blue(`[THIZ-DEV] Watching ${Array.isArray(watch) ? watch.join(", ") : watch}`));
    
if (restartOnEnvChange) {
  console.log(chalk.blue("[THIZ-DEV] Server will restart on .env file changes"));
  }
}

  async function stop() {
    shuttingDown = true;
    
    if (restartTimer) {
      clearTimeout(restartTimer);
      restartTimer = null;
    }
    
    if (watcher) {
      await watcher.close();
      watcher = null;
    }

    if (envWatcher) {
      await envWatcher.close();
      envWatcher = null;
    }
    
    isGracefulKill = true;
    await killChild();
    
    console.log(chalk.yellow("[THIZ-DEV] Stopped"));
  }

  return { start, stop, restart: () => restart("manual") };
}