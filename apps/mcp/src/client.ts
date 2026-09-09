/**
 * Typed HTTP client for the Pocket API.
 *
 * One client is built per MCP request from the key that request carried, so
 * a key is never shared between callers and none is held between requests.
 */

/** Error carrying the API's stable error code. */
export class PocketApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details: unknown;

  /**
   * @param status - HTTP status returned by the API.
   * @param code - Stable Pocket error code.
   * @param message - Client-safe message.
   * @param details - Client-safe structured context.
   */
  public constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'PocketApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Options for {@link PocketClient}. */
export interface PocketClientOptions {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
}

/** Minimal client covering the routes the MCP tools need. */
export class PocketClient {
  readonly #baseUrl: string;
  readonly #apiKey: string;
  readonly #timeoutMs: number;

  /**
   * @param options - API base URL, organization key and request deadline.
   */
  public constructor(options: PocketClientOptions) {
    this.#baseUrl = options.baseUrl.replace(/\/$/, '');
    this.#apiKey = options.apiKey;
    this.#timeoutMs = options.timeoutMs ?? 30_000;
  }

  /**
   * Performs a request against the Pocket API.
   *
   * @param method - HTTP method.
   * @param path - Path beginning with `/v1`.
   * @param options - Optional JSON body and idempotency key.
   * @returns The parsed response body.
   * @throws {PocketApiError} When the API returns a non-2xx status, carrying the
   *   stable error code so a tool can explain the refusal to the agent.
   */
  async #request<T>(
    method: string,
    path: string,
    options: { body?: unknown; idempotencyKey?: string } = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      authorization: `Bearer ${this.#apiKey}`,
      accept: 'application/json',
    };
    if (options.body !== undefined) headers['content-type'] = 'application/json';
    if (options.idempotencyKey !== undefined) {
      headers['idempotency-key'] = options.idempotencyKey;
    }

    const response = await fetch(`${this.#baseUrl}${path}`, {
      method,
      headers,
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      signal: AbortSignal.timeout(this.#timeoutMs),
    });

    const text = await response.text();
    const parsed: unknown = text === '' ? {} : JSON.parse(text);

    if (!response.ok) {
      const envelope = parsed as { error?: { code?: string; message?: string; details?: unknown } };
      throw new PocketApiError(
        response.status,
        envelope.error?.code ?? 'INTERNAL_ERROR',
        envelope.error?.message ?? `Pocket API returned ${response.status}.`,
        envelope.error?.details,
      );
    }
    return parsed as T;
  }

  /** Lists the organization's agents with budgets and spend. */
  public listAgents(): Promise<{ agents: unknown[] }> {
    return this.#request('GET', '/v1/agents');
  }

  /** Loads one agent with its policy and task budgets. */
  public getAgent(agentId: string): Promise<Record<string, unknown>> {
    return this.#request('GET', `/v1/agents/${encodeURIComponent(agentId)}`);
  }

  /** Evaluates a payment without recording or settling it. */
  public preview(body: unknown): Promise<{ decision: Record<string, unknown> }> {
    return this.#request('POST', '/v1/payments/preview', { body });
  }

  /** Authorizes, records and settles a payment. */
  public pay(
    body: unknown,
    idempotencyKey: string,
  ): Promise<{ payment: Record<string, unknown>; decision: Record<string, unknown> }> {
    return this.#request('POST', '/v1/payments', { body, idempotencyKey });
  }

  /**
   * Buys a paid resource end to end.
   *
   * @param body - Agent, resource URL and spending context.
   * @returns What happened: served free, paid and served, blocked by policy,
   *   or failed. A block is a normal result, not an error.
   * @remarks The whole flow — fetch, authorise, sign, present, settle — runs
   *   inside the API. This server never holds a signed payload and never talks
   *   to the facilitator, so an agent cannot route around the policy engine
   *   even if it could reach the seller itself.
   */
  public purchase(body: unknown): Promise<Record<string, unknown>> {
    return this.#request('POST', '/v1/payments/x402/purchase', { body });
  }

  /** Lists payments, newest first. */
  public listPayments(query: string): Promise<{ payments: unknown[] }> {
    return this.#request('GET', `/v1/payments${query}`);
  }

  /** Opens a task-scoped budget. */
  public createTaskBudget(
    agentId: string,
    body: unknown,
  ): Promise<{ taskBudget: Record<string, unknown> }> {
    return this.#request('POST', `/v1/agents/${encodeURIComponent(agentId)}/task-budgets`, {
      body,
    });
  }

  /** Reads the spend summary with anomalies. */
  public spendSummary(query: string): Promise<Record<string, unknown>> {
    return this.#request('GET', `/v1/analytics/spend${query}`);
  }

  /** Reads the audit trail. */
  public audit(query: string): Promise<Record<string, unknown>> {
    return this.#request('GET', `/v1/audit${query}`);
  }
}
