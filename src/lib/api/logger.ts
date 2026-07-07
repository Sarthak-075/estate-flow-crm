import type { RequestContext } from "./context";

export interface ApiLogContext {
  requestId: string;
  method: string;
  path: string;
  userId?: string;
  organizationId?: string;
}

function timestamp(): string {
  return new Date().toISOString();
}

function buildContext(
  context: ApiLogContext,
): Record<string, string | undefined> {
  return {
    requestId: context.requestId,
    method: context.method,
    path: context.path,
    userId: context.userId,
    organizationId: context.organizationId,
  };
}

/**
 * Creates a logging context from the current request.
 */
export function createLogContext(
  request: Request,
  ctx: RequestContext,
): ApiLogContext {
  return {
    requestId: crypto.randomUUID(),
    method: request.method,
    path: new URL(request.url).pathname,
    userId: ctx.user?.id,
    organizationId: ctx.organizationId,
  };
}

/**
 * Logs the beginning of an API request.
 */
export function logRequest(context: ApiLogContext): number {
  const startedAt = performance.now();

  console.info("[API REQUEST]", {
    timestamp: timestamp(),
    ...buildContext(context),
  });

  return startedAt;
}

/**
 * Logs a completed API request.
 */
export function logResponse(
  context: ApiLogContext,
  status: number,
  startedAt: number,
): void {
  console.info("[API RESPONSE]", {
    timestamp: timestamp(),
    durationMs: Math.round(performance.now() - startedAt),
    status,
    ...buildContext(context),
  });
}

/**
 * Logs an API error.
 */
export function logError(
  context: ApiLogContext,
  error: unknown,
  startedAt: number,
): void {
  console.error("[API ERROR]", {
    timestamp: timestamp(),
    durationMs: Math.round(performance.now() - startedAt),
    ...buildContext(context),

    name: error instanceof Error ? error.name : "UnknownError",

    message: error instanceof Error ? error.message : "Unknown error occurred",

    stack: error instanceof Error ? error.stack : undefined,
  });
}
