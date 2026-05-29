import { defineConfig } from 'vite';

// On GitHub Pages the site is served from a repo subpath
// (https://<user>.github.io/simple-3d-open-world/), so production assets must be
// referenced relative to that base. Local dev/preview stay at root.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/simple-3d-open-world/' : '/',
}));
