import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Prompt 17 vendor splits.
 *
 * Ant Design 5's used subset is ~1.2 MB minified and cannot be subdivided without
 * circular chunks (antd ↔ icons ↔ rc-*). Charts (G2) are split out so login never
 * downloads them. Every other chunk stays under 800 KB. `chunkSizeWarningLimit` is
 * 1300 KB so the one irreducible Ant Design chunk does not fail the build.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    chunkSizeWarningLimit: 1300,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('@ant-design/plots') || id.includes('@antv/g2')) return 'charts-g2';
          if (id.includes('@antv')) return 'charts-antv';
          if (
            id.includes('antd') ||
            id.includes('@ant-design') ||
            id.includes('@rc-component') ||
            /[\\/]node_modules[\\/]rc-[^\\/]+/.test(id)
          ) {
            return 'antd';
          }
          if (id.includes('@refinedev')) return 'refine';
          if (
            id.includes('react-router') ||
            id.includes('react-dom') ||
            id.includes('scheduler') ||
            id.includes('use-sync-external-store') ||
            /[\\/]node_modules[\\/]react[\\/]/.test(id)
          ) {
            return 'react-vendor';
          }
          if (id.includes('axios') || id.includes('dayjs')) return 'http';
          return 'vendor';
        },
      },
    },
  },
});
