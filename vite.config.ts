import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// A fixed dev port, and keep earlier terminal output visible.
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: { port: 5287, strictPort: true },
  build: { target: 'es2021', chunkSizeWarningLimit: 900 },
});
