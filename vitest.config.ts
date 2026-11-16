import { defineConfig } from 'vitest/config';

// One root run covers every workspace folder. A run that finds no tests is a failure.
export default defineConfig({
  test: {
    include: ['{apps,packages,games,content,tools}/**/*.test.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    passWithNoTests: false,
  },
});
