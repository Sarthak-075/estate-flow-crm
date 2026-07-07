import { NextRequest, NextResponse } from "next/server";

import type { RequestContext } from "./context";
import { getRequestContext } from "./context";
import { serializeError } from "./errorSerializer";

export type ApiHandler<T = unknown> = (
  ctx: RequestContext,
  request: NextRequest,
) => Promise<NextResponse<T>>;

/**
 * Wraps API route handlers with common request context creation
 * and centralized error handling.
 */
export function withApiHandler<T = unknown>(handler: ApiHandler<T>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const ctx = await getRequestContext();

      return await handler(ctx, request);
    } catch (error) {
      return serializeError(error);
    }
  };
}
