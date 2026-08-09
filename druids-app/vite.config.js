import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Split the vendors out of the app chunk. Served `immutable` by
        // vercel.json, these then survive ordinary app-code deploys instead of
        // being re-downloaded inside the app bundle on every release.
        manualChunks: {
          react: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/firestore'],
        },
      },
    },
  },
});
