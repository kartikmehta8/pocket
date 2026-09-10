/**
 * Stands in for the `server-only` package under Vitest.
 *
 * @remarks That package exists to throw when a server module is pulled into a
 * client bundle. Next enforces that at build time; the test runner has no
 * bundler and would trip the guard on any component that reaches a server
 * action. Empty on purpose.
 */
export {};
