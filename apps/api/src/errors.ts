/**
 * The single error boundary for the HTTP surface.
 *
 * Clients receive a stable code and a safe message. Stack traces, vendor
 * responses and anything else that might carry a secret stay in the logs.
 */

import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { PocketError } from '@pocket/core';

/**
 * Registers the error and not-found handlers.
 *
 * @param app - Fastify instance.
 */
export function registerErrorHandler(app: FastifyInstance): void {
  app.setNotFoundHandler((request, reply) => {
    void reply.status(404).send({
      error: { code: 'NOT_FOUND', message: `No route for ${request.method} ${request.url}.` },
    });
  });

  app.setErrorHandler((error, request, reply) => {
    if (PocketError.is(error)) {
      if (error.httpStatus >= 500) {
        request.log.error({ code: error.code, cause: error.cause }, error.message);
      }
      void reply.status(error.httpStatus).send(error.toPublicJSON());
      return;
    }

    if (error instanceof ZodError) {
      void reply.status(400).send({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Request failed schema validation.',
          details: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
      });
      return;
    }

    const statusCode = (error as { statusCode?: unknown }).statusCode;
    if (statusCode === 429) {
      void reply
        .status(429)
        .send({ error: { code: 'RATE_LIMITED', message: 'Too many requests.' } });
      return;
    }

    request.log.error({ err: error }, 'Unhandled error');
    void reply
      .status(500)
      .send({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } });
  });
}
