import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/unit/**/*.test.ts', 'test/components/**/*.test.tsx'],
    coverage: { reporter: ['text', 'html'], include: ['shared/**', 'src/**', 'aws-blocks/ai/**'] },
  },
});
