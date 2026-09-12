// @ts-check

/**
 * Type-aware linting across the workspace.
 *
 * The rules that carry weight are the ones a financial service cannot afford to
 * get wrong: a dropped promise in a payment path silently loses money, and
 * `any` at a boundary defeats the point of having types there at all. Style is
 * Prettier's job and is not duplicated here.
 *
 * `no-unnecessary-condition` is off because it is noisy against Zod schemas and
 * Drizzle builders without adding safety.
 *
 * The dashboard and the docs site are skipped: each brings its own Next
 * configuration, including the accessibility and image rules that only make
 * sense there. The subgraph is skipped because it is AssemblyScript compiled by
 * graph-cli against generated types, and is not part of this TypeScript
 * workspace.
 *
 * Parsing uses one lint-only project spanning both src and tests, so test files
 * get the same type-aware rules as production code without polluting the build
 * tsconfigs that decide what ends up in dist. Tests then relax the `unsafe-*`
 * family: they narrow untyped JSON responses on purpose, and the rule fires on
 * every `response.json() as X` without catching a real defect. The assertion in
 * a test is the documentation of what an endpoint returns, so it stays.
 */
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/*.config.js',
      '**/*.config.mjs',
      '**/*.config.ts',
      'apps/dashboard/**',
      'apps/docs/**',
      'temp/**',
      'subgraph/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { project: './tsconfig.lint.json', tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        { allowNumber: true, allowBoolean: true },
      ],
    },
  },
  {
    files: ['**/tests/**/*.ts', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
    },
  },
);
