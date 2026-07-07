import { NextRequest, NextResponse } from "next/server";

import { getRequestContext } from "./context";
import { ApiError } from "./errors";
import { serverError } from "./responses";
import type { RequestContext } from "./context";

export type ApiHandler<T = unknown> = (
  ctx: RequestContext,
  request: NextRequest,
) => Promise<NextResponse<T>>;

export function withApiHandler<T = unknown>(handler: ApiHandler<T>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const ctx = await getRequestContext();

      return await handler(ctx, request);
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: error.message,
            },
          },
          {
            status: error.statusCode,
          },
        );
      }

      console.error("Unhandled API error:", error);

      return serverError();
    }
  };
}
