import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';
import rollupNodePolyFill from 'rollup-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      'lucide-react': 'lucide-react/dist/esm/lucide-react',
      buffer: 'buffer',
      process: 'rollup-plugin-node-polyfills/polyfills/process-es6',
      util: 'util',
      stream: 'stream-browserify',
      events: 'rollup-plugin-node-polyfills/polyfills/events',
      path: 'rollup-plugin-node-polyfills/polyfills/path',
      querystring: 'rollup-plugin-node-polyfills/polyfills/qs',
      punycode: 'rollup-plugin-node-polyfills/polyfills/punycode'
    }
  },
  optimizeDeps: {
    include: [
      'lucide-react',
      'buffer',
      'rollup-plugin-node-polyfills/polyfills/process-es6',
      'util',
      'stream-browserify'
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis'
      },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          process: true,
          buffer: true
        }),
        NodeModulesPolyfillPlugin()
      ]
    }
  },
  build: {
    rollupOptions: {
      plugins: [rollupNodePolyFill]
    }
  },
  define: {
    'process.env': {},
    'global': 'globalThis'
  }
});
