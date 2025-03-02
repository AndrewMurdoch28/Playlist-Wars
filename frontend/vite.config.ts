// Plugins
import vue from "@vitejs/plugin-vue";
import vuetify, { transformAssetUrls } from "vite-plugin-vuetify";

// Utilities
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: { transformAssetUrls },
    }),
    vuetify(),
  ],
  envPrefix: "VITE_",
  define: {
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false, // Disable Vue hydration warnings
  },
  resolve: {
    alias: {
    },
    extensions: [".js", ".json", ".jsx", ".mjs", ".ts", ".tsx", ".vue"],
  },
  server: {
    cors: true,
    port: 3000,
    watch: {
      usePolling: true,
    },
  },
  build: {
    minify: "terser", // Use Terser for aggressive minification
    sourcemap: false, // Completely remove source maps
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log and debugging output
        drop_debugger: true, // Remove debugger statements
        passes: 2, // Optimize further
      },
      output: {
        comments: false, // Remove comments
      },
      mangle: {
        properties: false, // Mangle object properties
        toplevel: true, // Minify top-level variables
      },
    },
    target: "esnext", // Set the JavaScript target to 'esnext' (latest ECMAScript version)
    rollupOptions: {
      output: {
        manualChunks(id) {
          // This function decides how to split the code into separate chunks
          if (id.includes("node_modules")) {
            // If the module is from 'node_modules', assign it to a separate chunk named 'vendor'
            return "vendor";
          }
        },
      },
    },
  },
});
