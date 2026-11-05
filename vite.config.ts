import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { serviceWorker } from './scripts/sw-plugin.ts';

import pkg from './package.json' with { type: 'json' };

// The version people see (from package.json: bump it for each release) and a unique id for this exact
// build (version + build time, UTC). The app compares build ids to notice a newer version, see src/pwa.ts.
const VERSION = pkg.version.replace(/\.0$/, ''); // "0.31.0" → "0.31"
const BUILT = new Date().toISOString().slice(0, 16).replace('T', ' ');
const BUILD_ID = `${VERSION} (${BUILT})`;

// `npm run build` → normal multi-file build in dist/ (this is what Cloudflare publishes), plus the offline worker.
// `npm run build:single` → one self-contained HTML file (used for the shareable claude.ai link).
export default defineConfig(({ mode }) => ({
  base: './',
  define: {
    __BUILD_ID__: JSON.stringify(mode === 'development' ? 'dev' : BUILD_ID),
    __VERSION__: JSON.stringify(VERSION),
    __BUILT__: JSON.stringify(BUILT.slice(0, 10)),
  },
  plugins: mode === 'single' ? [viteSingleFile()] : [serviceWorker('dist', BUILD_ID)],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 2500,
    // the character sprite sheets are small PNGs: inline them so the single-file build stays one file.
    // Fonts stay separate files in the normal build (the browser only downloads the format it needs).
    assetsInlineLimit: mode === 'single' ? 32768 : (file: string) => (/\.woff2?$/.test(file) ? false : undefined),
  },
  // agents work in git worktrees under .worktrees/: their copies of the tests aren't ours
  test: { exclude: ['**/node_modules/**', '.worktrees/**'] },
}));
