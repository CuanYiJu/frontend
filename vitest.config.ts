import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// Unit and component tests run in Node with jsdom: no browser, no backend.
// `fetch` is stubbed per test; the real API contract is covered by the
// backend's own tests.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      restoreMocks: true,
    },
  }),
);
