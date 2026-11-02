import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { serviceWorker } from './scripts/sw-plugin.ts';

// A name for this build (date + time, UTC), shown in Settings and used by the app to notice a newer version.
const BUILD_ID = new Date().toISOString().slice(0, 16).replace('T', ' ');

// `npm run build` → normal multi-file build in dist/ (this is what Cloudflare publishes), plus the offline worker.
// `npm run build:single` → one self-contained HTML file (used for the shareable claude.ai link).
export default defineConfig(({ mode }) => ({
  base: './',
  define: { __BUILD_ID__: JSON.stringify(mode === 'development' ? 'dev' : BUILD_ID) },
  plugins: mode === 'single' ? [viteSingleFile()] : [serviceWorker('dist', BUILD_ID)],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 2500,
    // the character sprite sheets are small PNGs: inline them so the single-file build stays one file.
    // Fonts stay separate files in the normal build (the browser only downloads the format it needs).
    assetsInlineLimit: mode === 'single' ? 32768 : (file: string) => (/\.woff2?$/.test(file) ? false : undefined),
  },
}));
