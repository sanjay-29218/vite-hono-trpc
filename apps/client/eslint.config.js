/**
 * ESLint Configuration
 *
 * This file configures ESLint for code quality and consistency checks.
 * ESLint analyzes your code for potential errors, enforces coding standards,
 * and helps maintain code quality across the project.
 */

import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  // Ignore the dist folder - we don't need to lint compiled/bundled output
  globalIgnores(["dist"]),
  {
    // Apply linting rules to all TypeScript and TSX files
    files: ["**/*.{ts,tsx}"],

    // Extend recommended rule sets from various plugins:
    extends: [
      js.configs.recommended, // Base JavaScript recommended rules
      tseslint.configs.recommended, // TypeScript-specific rules
      reactHooks.configs["recommended-latest"], // React Hooks best practices
      reactRefresh.configs.vite, // React Refresh rules for Vite
    ],

    // Language and environment configuration
    languageOptions: {
      ecmaVersion: 2020, // Use ES2020 syntax features
      globals: globals.browser, // Provide browser globals (window, document, etc.)
    },

    // Custom rule overrides - set to "warn" instead of "error" for less strict enforcement
    rules: {
      // Warn if non-component exports are mixed with component exports (React Refresh requirement)
      "react-refresh/only-export-components": "warn",
      // Warn about missing dependencies in useEffect, useMemo, useCallback hooks
      "react-hooks/exhaustive-deps": "warn",
      // Warn about incorrect usage of React Hooks (e.g., calling hooks conditionally)
      "react-hooks/rules-of-hooks": "warn",
      // Warn about unused variables (helps keep code clean)
      "@typescript-eslint/no-unused-vars": "warn",
      // Warn about using 'any' type (encourages proper typing)
      "@typescript-eslint/no-explicit-any": "warn",
      // Warn about empty object types (encourages explicit types)
      "@typescript-eslint/no-empty-object-type": "warn",
    },
  },
]);
