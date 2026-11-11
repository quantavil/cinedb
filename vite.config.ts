import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite-plus';

/** Emit /sw.js with the list of built files to precache. ~10 lines instead of a PWA plugin. */
const serviceWorker = () => ({
  name: 'precache-sw',
  generateBundle(_: unknown, bundle: Record<string, unknown>) {
    const files = [
      '/',
      '/manifest.webmanifest',
      '/icon.svg',
      '/icon-192.png',
      '/fonts/barlow-condensed-500.woff2',
      '/fonts/barlow-condensed-600.woff2',
      ...Object.keys(bundle).map((f) => `/${f}`),
    ];
    const version = Buffer.from(files.join()).toString('base64url').slice(-12) + files.length;
    const src = readFileSync(new URL('./src/sw.js', import.meta.url), 'utf8');
    (this as any).emitFile({
      type: 'asset',
      fileName: 'sw.js',
      source: src.replace('__FILES__', JSON.stringify(files)).replace('__VERSION__', version),
    });
  },
});

export default defineConfig({
  oxc: { jsx: { importSource: 'preact' } },
  plugins: [serviceWorker()],
  fmt: {
    singleQuote: true,
    printWidth: 120,
    ignorePatterns: ['data/**', 'AGENTS.md', 'README.md', 'dist/**', 'test-results/**', 'playwright-report/**'],
  },
});
