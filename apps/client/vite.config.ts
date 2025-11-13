/**
 * Vite Configuration
 *
 * Vite is the build tool and dev server for this React application.
 * This config defines how Vite bundles, serves, and optimizes your code.
 *
 * Key features:
 * - Fast HMR (Hot Module Replacement) for instant updates
 * - Optimized production builds
 * - Proxy API requests to backend during development
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  // Plugins extend Vite's functionality
  plugins: [
    // React plugin: enables JSX, Fast Refresh, and React optimizations
    react({
      babel: {
        // React Compiler: automatically optimizes React components
        // (memoization, re-render prevention, etc.)
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
    // Tailwind CSS plugin: processes Tailwind classes and JIT compilation
    tailwindcss(),
  ],

  // Module resolution configuration
  resolve: {
    // Path aliases: map @/ to src/ directory
    // Allows: import { Button } from "@/components/ui/button"
    // Instead of: import { Button } from "./components/ui/button"
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Development server configuration
  server: {
    // Proxy API requests to backend server during development
    // When you call /api/*, Vite forwards it to http://localhost:3000/api/*
    proxy: {
      "/api": {
        target: "http://localhost:3000", // Backend server URL
        changeOrigin: true, // Change origin header to target URL
      },
    },
    // Listen on all network interfaces (0.0.0.0) - allows access from other devices
    host: "0.0.0.0",
    // Port: use PORT env var or default to 5173
    port: Number(process.env.PORT) || 5173,
  },

  // Preview server configuration (for testing production builds locally)
  preview: {
    // Same host/port settings as dev server
    host: "0.0.0.0",
    port: Number(process.env.PORT) || 5173,
  },
});
