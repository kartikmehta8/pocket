/**
 * Typed error codes and the single error class used across Pocket.
 *
 * Every HTTP and MCP error response is derived from a {@link PocketError}, so
 * clients can branch on a stable `code` instead of parsing prose. Internal
 * details never cross the wire; see {@link PocketError.toPublicJSON}.
 */

/** Stable, documented error codes. Never renumber or reuse a retired code. */
export const ERROR_CODES = {
  VALIDATION_FAILED: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  IDEMPOTENCY_KEY_REUSED: 409,
  AGENT_INACTIVE: 409,
  WALLET_NOT_PROVISIONED: 409,
  TOKEN_NOT_ASSOCIATED: 409,
  APPROVAL_REQUIRED: 402,
  POLICY_VIOLATION: 403,
  ASSET_NOT_ALLOWED: 403,
  CHAIN_NOT_ALLOWED: 403,
  RECIPIENT_NOT_TRUSTED: 403,
  CATEGORY_NOT_ALLOWED: 403,
  PER_TX_LIMIT_EXCEEDED: 403,
  DAILY_BUDGET_EXCEEDED: 403,
  TASK_BUDGET_EXCEEDED: 403,
  INSUFFICIENT_BALANCE: 409,
  PAYMENT_FAILED: 502,
  SETTLEMENT_FAILED: 502,
  UPSTREAM_UNAVAILABLE: 503,
  AUDIT_WRITE_FAILED: 500,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
} as const;

/** Union of every error code Pocket can emit. */
export type ErrorCode = keyof typeof ERROR_CODES;

/** Shape of an error as it appears to an API or MCP client. */
export interface PublicErrorBody {
  error: { code: ErrorCode; message: string; details?: unknown };
}

/**
 * The only error type thrown intentionally by Pocket application code.
 *
 * @remarks
 * `details` is safe to expose. Anything sensitive belongs in `cause`, which is
 * logged but never serialized to a client.
 */
export class PocketError extends Error {
  /** Stable machine-readable code. */
  public readonly code: ErrorCode;
  /** HTTP status derived from {@link ERROR_CODES}. */
  public readonly httpStatus: number;
  /** Client-safe structured context, such as which limit was exceeded. */
  public readonly details: unknown;

  /**
   * @param code - Stable error code.
   * @param message - Human-readable, client-safe summary.
   * @param details - Client-safe structured context. Must contain no secrets.
   * @param cause - Underlying error, retained for logs only.
   */
  public constructor(code: ErrorCode, message: string, details?: unknown, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'PocketError';
    this.code = code;
    this.httpStatus = ERROR_CODES[code];
    this.details = details;
  }

  /** Serializes to the client-facing body. Never includes `cause`. */
  public toPublicJSON(): PublicErrorBody {
    return {
      error:
        this.details === undefined
          ? { code: this.code, message: this.message }
          : { code: this.code, message: this.message, details: this.details },
    };
  }

  /** Type guard for `unknown` values caught in handlers. */
  public static is(value: unknown): value is PocketError {
    return value instanceof PocketError;
  }
}
