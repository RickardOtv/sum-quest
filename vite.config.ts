import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build` → normal multi-file build in dist/.
// `npm run build:single` → one self-contained HTML file (used for the shareable link).
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: mode === 'single' ? [viteSingleFile()] : [],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 2500,
    assetsInlineLimit: 32768, // the character sprite sheets are small PNGs: inline them so the single-file build stays one file
  },
}));
