import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setupTests.js'
  },
  server: {
    port: 5173,
    host: true
  }
});
