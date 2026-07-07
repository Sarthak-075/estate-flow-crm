import { NextResponse } from "next/server";

/**
 * Standard API success response.
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Standard API error response.
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
  };
}

/**
 * Returns a 200 OK response.
 */
export function success<T>(data: T): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    {
      status: 200,
    },
  );
}

/**
 * Returns a 201 Created response.
 */
export function created<T>(data: T): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    {
      status: 201,
    },
  );
}

/**
 * Returns a 400 Bad Request response.
 */
export function badRequest(
  message = "Bad request",
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
      },
    },
    {
      status: 400,
    },
  );
}

/**
 * Returns a 401 Unauthorized response.
 */
export function unauthorized(
  message = "Unauthenticated",
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
      },
    },
    {
      status: 401,
    },
  );
}

/**
 * Returns a 403 Forbidden response.
 */
export function forbidden(
  message = "Forbidden",
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
      },
    },
    {
      status: 403,
    },
  );
}

/**
 * Returns a 404 Not Found response.
 */
export function notFound(
  message = "Resource not found",
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
      },
    },
    {
      status: 404,
    },
  );
}

/**
 * Returns a 409 Conflict response.
 */
export function conflict(message = "Conflict"): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
      },
    },
    {
      status: 409,
    },
  );
}

/**
 * Returns a 500 Internal Server Error response.
 */
export function serverError(
  message = "Internal server error",
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
      },
    },
    {
      status: 500,
    },
  );
}
