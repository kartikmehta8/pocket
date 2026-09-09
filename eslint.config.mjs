// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Type-aware linting across the workspace.
 *
 * The rules that carry weight here are the ones a financial service cannot
 * afford to get wrong: floating promises, unsafe `any`, and unchecked
 * conditionals. Style is Prettier's job and is not duplicated as lint rules.
 */
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/node_modules/**',
      '**/*.config.js',
      '**/*.config.mjs',
      '**/*.config.ts',
      'apps/dashboard/**',
      'apps/docs/**',
      // AssemblyScript compiled by graph-cli, against types generated at
      // codegen time. It is not part of the TypeScript workspace.
      'subgraph/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      // One lint-only project spanning src and tests, so test files get the
      // same type-aware rules as production code without polluting the build
      // tsconfigs that decide what ends up in dist.
      parserOptions: { project: './tsconfig.lint.json', tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // A dropped promise in a payment path silently loses money.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      // `unknown` at boundaries is required; `any` defeats the point.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Noisy against Zod schemas and Drizzle builders without adding safety.
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true },
      ],
    },
  },
  {
    // Tests narrow untyped JSON responses on purpose; the `unsafe-*` family
    // fires on every `response.json() as X` without catching a real defect.
    files: ['**/tests/**/*.ts', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      // `response.json()` is `any`, so TS calls every shape assertion
      // redundant. In a test the assertion is the documentation of what the
      // endpoint returns, so it stays.
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
    },
  },
);
