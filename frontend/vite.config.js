import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Keep rarely-changing vendor code in its own cacheable chunks instead
        // of one 2 MB entry bundle. Rolldown only accepts the function form.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('recharts') || id.includes('victory-vendor') || id.includes('d3-')) return 'charts';
          if (id.includes('framer-motion')) return 'motion';
          if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'react-vendor';
          return undefined;
        },
      },
    },
  },
  server: {
    port: process.env.VITE_PORT || 5173,
    host: process.env.VITE_HOST || 'localhost',
    open: true,
  },
  preview: {
    port: process.env.VITE_PORT || 5173,
    host: process.env.VITE_HOST || 'localhost',
  },
})
