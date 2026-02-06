import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

import { visualizer } from "rollup-plugin-visualizer";
import { VitePWA } from "vite-plugin-pwa";

// Find the project root by looking for src/ directory
// This handles both direct execution and v0 environment proxy configs
function findProjectRoot(): string {
  // First try CWD
  if (fs.existsSync(path.resolve(process.cwd(), "src"))) {
    return process.cwd();
  }
  // Then try relative to this file
  const configDir = path.dirname(new URL(import.meta.url).pathname);
  if (fs.existsSync(path.resolve(configDir, "src"))) {
    return configDir;
  }
  // Fallback to known project path
  return "/vercel/share/v0-project";
}

const projectRoot = findProjectRoot();

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
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "./src"),
    },
  },
};
