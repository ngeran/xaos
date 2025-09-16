/**
 * @filepath: vite.config.js
 * @version: 1.1.3
 * @description: Vite configuration for React app with plugin system
 * 
 * Key Features:
 * - React plugin
 * - Hot module replacement
 * - Path resolution for plugins
 * - Enhanced HMR stability
 * - Plain CSS processing
 * 
 * Dependencies:
 * - @vitejs/plugin-react
 * 
 * How to Use:
 * This configuration enables HMR and sets up basic React development environment.
 * 
 * Change Log:
 * v1.1.3 - Removed jsxInject to fix duplicate React import error, disabled css.modules for plain CSS
 * v1.1.2 - Added CSS processing and ensured stable HMR and React imports
 * v1.1.1 - Added esbuild.jsxInject and server.hmr for stable React and HMR behavior
 * v1.1.0 - Added plugin path resolution
 * v1.0.0 - Initial Vite configuration
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@plugins': resolve(__dirname, './src/plugins')
    }
  },
  server: {
    port: 5173,
    open: true,
    hmr: {
      overlay: true, // Show error overlay in browser
      clientPort: 5173 // Ensure consistent HMR port
    }
  },
  css: {
    // Disable CSS modules to use plain CSS
    modules: false,
    preprocessorOptions: {
      // Add support for SCSS/LESS if needed
    }
  }
  // Optional: Uncomment to disable Fast Refresh for debugging
  // optimizeDeps: {
  //   esbuildOptions: {
  //     plugins: [
  //       {
  //         name: 'disable-fast-refresh',
  //         setup(build) {
  //           build.onLoad({ filter: /\.jsx?$/ }, () => ({
  //             loader: 'jsx',
  //             contents: undefined,
  //           }));
  //         },
  //       },
  //     ],
  //   },
  // }
});
