#!/usr/bin/env node

import { createWatcher } from "../src/watcher.js";

createWatcher({ entry: "src/server.js" }).start();
