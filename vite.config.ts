import react from "@vitejs/plugin-react-swc";
import path from "path";
import type { Plugin } from "vite";

import { visualizer } from "rollup-plugin-visualizer";
import { VitePWA } from "vite-plugin-pwa";

// Custom plugin to resolve @/ alias dynamically using Vite's resolved root
// This ensures the alias works both when running directly and through v0's proxy config
function aliasResolverPlugin(): Plugin {
  let srcDir = "";
  return {
    name: "dynamic-alias-resolver",
    configResolved(config) {
      srcDir = path.resolve(config.root, "src");
    },
    resolveId(source) {
      if (source.startsWith("@/")) {
        return path.resolve(srcDir, source.slice(2));
      }
      return null;
    },
  };
}

// https://vitejs.dev/config/
// Export as a plain object so v0 environment can spread it correctly
export default {
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    aliasResolverPlugin(),
    visualizer({ open: false, filename: "bundle-analysis.html" }),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB limit
      },
      manifest: {
        name: "MABDC Library",
        short_name: "MABDC",
        description: "Interactive 3D Flipbooks for K-12",
        theme_color: "#3b82f6",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),

};
