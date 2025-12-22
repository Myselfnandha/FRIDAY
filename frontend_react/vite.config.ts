import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@livekit/components-react':
        '@livekit/components-react/dist/index.mjs',
    },
    dedupe: ['react', 'react-dom'],
  },
  build: {
    target: 'esnext',
  },
});
