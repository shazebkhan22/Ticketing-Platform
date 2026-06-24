import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Official shadcn/ui components intentionally export variant helpers
    // (e.g. buttonVariants) alongside the component — this is shadcn's
    // standard generated structure, not a project convention to "fix".
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // Official shadcn-generated hook (installed via `shadcn add sidebar-08`),
    // not project-authored — leave its implementation as shadcn ships it.
    files: ['src/hooks/use-mobile.ts'],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
