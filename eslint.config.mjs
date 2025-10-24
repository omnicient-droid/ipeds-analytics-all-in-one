// Minimal flat config to make ESLint v9 happy and parse TS/TSX
// You can expand with plugins/rules later or migrate to Next's recommended set.

import tsParser from '@typescript-eslint/parser'
import nextPlugin from '@next/eslint-plugin-next'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  {
    ignores: ['**/node_modules/**', '.next/**', 'dist/**', 'coverage/**', 'data/demo/**'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx,cjs,mjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        project: false,
      },
    },
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    plugins: {
      '@next/next': nextPlugin,
      'react-hooks': reactHooks,
    },
    rules: {
      // Keep rules minimal; rely on inline disables in code
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'off',
      '@next/next/no-img-element': 'off',
    },
  },
]
