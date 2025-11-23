#!/usr/bin/env node

import { spawn } from "child_process";
import chokidar from "chokidar";
import chalk from "chalk";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = process.cwd();
let serverProcess = null;

// --- Utility to start the server ---
function startServer() {
  const startTime = Date.now();

  serverProcess = spawn("node", ["src/server.js"], {
    cwd: projectRoot,
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stdout.on("data", (d) => {
    const line = d.toString().trim();

    // Avoid printing route-loader spam — swallow everything
    if (line.startsWith("Loaded route")) return;

    // Avoid duplicate server messages
    if (line.includes("Server running on")) return;

    process.stdout.write(chalk.gray(`[server] `) + line + "\n");
  });

  serverProcess.stderr.on("data", (d) =>
    process.stderr.write(chalk.red(`[server-err] ${d}`))
  );

  serverProcess.on("exit", () => {
    // ignore normal exits
  });

  const took = Date.now() - startTime;
  console.log(
    chalk.green(
      `✔ THIZ compiled in ${took} ms`
    )
  );
}

// --- Utility to restart server ---
function restartServer(reason) {
  console.log(chalk.yellow(`File changed: ${reason}`));

  if (serverProcess) {
    serverProcess.kill("SIGTERM");
  }

  startServer();
}

// --- Initial message ---
console.log(chalk.cyanBright("\n[THIZ-DEV] Starting development server...\n"));

// --- Watcher ---
const watcher = chokidar.watch("src", {
  ignored: ["node_modules"],
});

watcher.on("ready", () => {
  startServer();
});

watcher.on("change", (filePath) => {
  restartServer(filePath.replace(projectRoot + path.sep, ""));
});
