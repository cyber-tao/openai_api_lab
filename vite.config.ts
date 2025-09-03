import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve('./src'),
      '@components': resolve('./src/components'),
      '@services': resolve('./src/services'),
      '@stores': resolve('./src/stores'),
      '@types': resolve('./src/types'),
      '@hooks': resolve('./src/hooks'),
      '@workers': resolve('./src/workers'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  worker: {
    format: 'es',
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          antd: ['antd', '@ant-design/icons'],
        },
      },
    },
  },
})
