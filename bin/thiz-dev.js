#!/usr/bin/env node

import { createWatcher } from "../src/watcher.js";

// Create watcher with env restart enabled
createWatcher({ 
  entry: "src/server.js",
  restartOnEnvChange: true, // Restart server when .env files change (default: true)
  verbose: false, // Set to true for more logging
}).start();