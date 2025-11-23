// src/watcher.js
import { spawn } from "child_process";
import chokidar from "chokidar";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";

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
 *  - debounce: number ms (default 150)
 *  - verbose: boolean
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
    debounce = 150,
    verbose = false,
  } = opts;

  let child = null;
  let restartTimer = null;
  let shuttingDown = false;

  function spawnChild() {
    const entryPath = path.resolve(process.cwd(), entry);
    if (verbose) console.log(chalk.gray(`Spawning node ${entryPath}`));

    const args = [...nodeArgs, entryPath];
    child = spawn(process.execPath, args, {
      stdio: ["inherit", "inherit", "inherit"],
      env: { ...process.env, ...env },
    });

    child.on("exit", (code, signal) => {
      if (shuttingDown) return;
      const reason = signal ? `signal ${signal}` : `code ${code}`;
      console.log(chalk.yellow(`[THIZ-DEV] server exited (${reason})`));
      // if it exited unexpectedly, keep watcher running — restart on next change
    });

    child.on("error", (err) => {
      console.error(chalk.red("[THIZ-DEV] child process error:"), err);
    });

    console.log(chalk.green(`[THIZ-DEV] started server (pid: ${child.pid})`));
  }

  function killChild() {
    return new Promise((resolve) => {
      if (!child || child.killed) return resolve();
      // Try graceful SIGTERM first
      try {
        child.kill("SIGTERM");
      } catch (e) {
        // ignore
      }

      // Wait up to 1s for exit, then force
      const timeout = setTimeout(() => {
        try {
          child.kill("SIGKILL");
        } catch (e) {}
      }, 1000);

      child.once("exit", () => {
        clearTimeout(timeout);
        resolve();
      });

      // In case child already exited synchronously
      if (child.killed) resolve();
    });
  }

  async function restart(reason = "file change") {
    if (restartTimer) clearTimeout(restartTimer);

    restartTimer = setTimeout(async () => {
      console.log(chalk.cyan(`[THIZ-DEV] restarting — ${reason}`));
      await killChild();
      if (!shuttingDown) spawnChild();
    }, debounce);
  }

  let watcher = null;

  function start() {
    if (watcher) return;

    spawnChild();

    watcher = chokidar.watch(watch, {
      ignored: ignore,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 10,
      },
    });

    watcher.on("all", (ev, filePath) => {
      // ignore changes inside node_modules or hidden tmp files
      const relative = path.relative(process.cwd(), filePath);
      if (relative.startsWith("node_modules") || relative.startsWith(".git")) return;

      if (verbose) console.log(chalk.gray(`[THIZ-DEV] ${ev} — ${relative}`));
      restart(`${ev} ${relative}`);
    });

    watcher.on("error", (err) => {
      console.error(chalk.red("[THIZ-DEV] watcher error:"), err);
    });

    process.once("SIGINT", async () => {
      console.log(chalk.yellow("\n[THIZ-DEV] SIGINT received — shutting down..."));
      await stop();
      process.exit(0);
    });

    process.once("SIGTERM", async () => {
      console.log(chalk.yellow("\n[THIZ-DEV] SIGTERM received — shutting down..."));
      await stop();
      process.exit(0);
    });

    console.log(chalk.blue(`[THIZ-DEV] watching ${Array.isArray(watch) ? watch.join(", ") : watch}`));
  }

  async function stop() {
    shuttingDown = true;
    if (watcher) {
      await watcher.close();
      watcher = null;
    }
    await killChild();
    console.log(chalk.yellow("[THIZ-DEV] stopped"));
  }

  return { start, stop, restart: () => restart("manual") };
}
