## [0.0.5] - 2025-11-26
   ### Fixed
   - Crash loop prevention during rapid file changes
   - Smart crash recovery with adaptive debouncing
   - Better handling of TypeScript syntax errors while typing
   - Graceful restart tracking to prevent false crash detection

## [0.0.6] - 2025-11-26
   ### New 
   - Users can now see routes in UI
   - Added a new `routes` command

## [0.0.7] - 2025-11-26

### New

- **Hot-reload environment variables**  
  `thiz-dev` now automatically loads `.env` files and updates `process.env` when they change, without restarting the server.

- **Supported `.env` files**  
  `.env.local > .env.development > .env` (priority order)

- **Routes command**  
  Users can view all routes and middlewares in a clean UI using `npx thiz routes`.

- **Dynamic `process.env` access**  
  Code reading `process.env` dynamically (e.g., per request) will see updates immediately after `.env` changes.

- **Optional programmatic API**  
  Access loaded env variables or watch for changes via `loadEnv()`, `getLoadedEnv()`, and `watchEnv()` functions.

### Improved

- Automatic merging of environment variables into the child process spawned by `thiz-dev`.
- Debounced and safe restart logic ensures hot-reload works reliably alongside rapid file changes.
