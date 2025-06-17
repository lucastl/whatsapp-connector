const globals = require('globals');
const tseslint = require('typescript-eslint');
const pluginImport = require('eslint-plugin-import');
const simpleImportSort = require('eslint-plugin-simple-import-sort');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = tseslint.config(
  {
    ignores: ['dist/', 'node_modules/', 'coverage/'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommended],
    plugins: {
      'simple-import-sort': simpleImportSort,
      import: pluginImport,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'import/no-unresolved': 'error',
    },
    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts'],
      },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json',
        },
      },
    },
  },
  eslintConfigPrettier,
);
