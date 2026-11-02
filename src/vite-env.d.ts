/// <reference types="vite/client" />

/** Set at build time in vite.config.ts: when this build was made ('dev' in npm run dev). */
declare const __BUILD_ID__: string;
/** The game's version number from package.json, e.g. "0.31". */
declare const __VERSION__: string;
/** The day this build was made, e.g. "2026-11-02". */
declare const __BUILT__: string;
