// src/env-loader.js
import fs from "fs";
import path from "path";
import chalk from "chalk";

/**
 * Supported env files in priority order (highest to lowest)
 * Higher priority files override lower priority ones
 */
const ENV_FILES = [
  ".env.local",
  ".env.development",
  ".env"
];

let initialLoadComplete = false;

/**
 * Parse a single .env file and return key-value pairs
 * @param {string} filePath - Path to the .env file
 * @returns {object} - Parsed environment variables
 */
function parseEnvFile(filePath) {
  const env = {};
  
  if (!fs.existsSync(filePath)) {
    return env;
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split(/\r?\n/);

    for (let line of lines) {
      line = line.trim();
      
      // Skip empty lines and comments
      if (!line || line.startsWith("#")) continue;

      // Handle export prefix (export VAR=value)
      if (line.startsWith("export ")) {
        line = line.substring(7);
      }

      const equalIndex = line.indexOf("=");
      if (equalIndex === -1) continue;

      const key = line.substring(0, equalIndex).trim();
      if (!key) continue;

      let value = line.substring(equalIndex + 1).trim();

      // Remove surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      // Handle escaped characters
      value = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t");

      env[key] = value;
    }
  } catch (err) {
    console.error(chalk.red(`[THIZ-DEV] Error parsing ${filePath}:`), err.message);
  }

  return env;
}

/**
 * Load environment variables from all .env files
 * Files are loaded in reverse priority order, so higher priority files override
 * @param {boolean} silent - Don't log to console
 * @returns {object} - All loaded env vars (for reference)
 */
export function loadEnv(silent = false) {
  const loadedFiles = [];
  const allVars = {};

  // Load in reverse order so higher priority files override
  for (let i = ENV_FILES.length - 1; i >= 0; i--) {
    const file = ENV_FILES[i];
    const filePath = path.resolve(process.cwd(), file);
    
    if (!fs.existsSync(filePath)) continue;

    const envVars = parseEnvFile(filePath);
    
    // Merge into process.env and track what we loaded
    Object.entries(envVars).forEach(([key, value]) => {
      process.env[key] = value;
      allVars[key] = value;
    });

    loadedFiles.push(file);
  }

  if (!silent && loadedFiles.length > 0) {
    if (!initialLoadComplete) {
      console.log(chalk.green(`[THIZ-DEV] Loaded env from: ${loadedFiles.reverse().join(", ")}`));
      initialLoadComplete = true;
    } 
  }

  return allVars;
}

/**
 * Hot-reload environment variables when .env files change
 * This updates process.env and triggers a restart callback
 * @param {function} onChangeCallback - Callback when env changes (receives newEnv, event, fileName)
 * @returns {Promise<object>} - Watcher instance with close() method
 */
export function watchEnv(onChangeCallback) {
  // Dynamic import to avoid requiring chokidar if not watching
  return import("chokidar").then(({ default: chokidar }) => {
    const envPaths = ENV_FILES.map(f => path.resolve(process.cwd(), f));
    
    const watcher = chokidar.watch(envPaths, {
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100,
      },
    });

    watcher.on("all", (event, filePath) => {
      const fileName = path.basename(filePath);
      
      if (event === "add" || event === "change") {
        console.log(chalk.cyan(`[THIZ-DEV] ${fileName} ${event === "add" ? "created" : "changed"} - reloading env...`));
        
        const newEnv = loadEnv(true); // Silent load to avoid duplicate log
        
        if (onChangeCallback) {
          try {
            onChangeCallback(newEnv, event, fileName);
          } catch (err) {
            console.error(chalk.red("[THIZ-DEV] Error in env watch callback:"), err);
          }
        }
      } else if (event === "unlink") {
        console.log(chalk.yellow(`[THIZ-DEV] ${fileName} deleted - keeping existing env vars`));
      }
    });

    watcher.on("error", (err) => {
      console.error(chalk.red("[THIZ-DEV] Env watcher error:"), err);
    });

    return watcher;
  }).catch(err => {
    console.error(chalk.red("[THIZ-DEV] Failed to start env watcher:"), err);
    return null;
  });
}

/**
 * Get the current state of all env variables loaded from files
 * @returns {object}
 */
export function getLoadedEnv() {
  const env = {};
  
  for (let i = ENV_FILES.length - 1; i >= 0; i--) {
    const file = ENV_FILES[i];
    const filePath = path.resolve(process.cwd(), file);
    const parsed = parseEnvFile(filePath);
    Object.assign(env, parsed);
  }
  
  return env;
}

// Auto-load on import
loadEnv();