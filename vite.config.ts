import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import type { Plugin } from "vite";

import { visualizer } from "rollup-plugin-visualizer";
import { VitePWA } from "vite-plugin-pwa";

const extensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".json", ""];

function tryResolve(basePath: string): string | null {
  // Check if the path already has an extension and exists
  if (fs.existsSync(basePath)) {
    const stat = fs.statSync(basePath);
    if (stat.isFile()) return basePath;
    // It's a directory — check for index files
    for (const ext of extensions) {
      const indexPath = path.join(basePath, `index${ext}`);
      if (fs.existsSync(indexPath)) return indexPath;
    }
  }
  // Try appending extensions
  for (const ext of extensions) {
    if (ext && fs.existsSync(basePath + ext)) return basePath + ext;
  }
  return null;
}

// Custom plugin to resolve @/ alias dynamically using Vite's resolved root
function aliasResolverPlugin(): Plugin {
  let srcDir = "";
  return {
    name: "dynamic-alias-resolver",
    enforce: "pre",
    configResolved(config) {
      srcDir = path.resolve(config.root, "src");
    },
    resolveId(source) {
      if (source.startsWith("@/")) {
        const basePath = path.resolve(srcDir, source.slice(2));
        const resolved = tryResolve(basePath);
        if (resolved) return resolved;
      }
      return null;
    },
  };
}

// https://vitejs.dev/config/
// Export as a plain object so v0 environment can spread it correctly
export default {
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
