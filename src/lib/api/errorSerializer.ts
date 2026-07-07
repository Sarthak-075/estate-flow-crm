import { NextResponse } from "next/server";

import { ApiError } from "./errors";

interface ErrorBody {
  success: false;
  error: {
    message: string;
    code?: string;
    stack?: string;
  };
}

/**
 * Converts any thrown error into a standardized API response.
 */
export function serializeError(error: unknown): NextResponse<ErrorBody> {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error.message,
          code: error.code,
        },
      },
      {
        status: error.statusCode,
      },
    );
  }

  const isDevelopment = process.env.NODE_ENV !== "production";

  return NextResponse.json(
    {
      success: false,
      error: {
        message: isDevelopment
          ? error instanceof Error
            ? error.message
            : "Unknown error"
          : "Internal server error",

        ...(isDevelopment &&
          error instanceof Error && {
            stack: error.stack,
          }),
      },
    },
    {
      status: 500,
    },
  );
}
