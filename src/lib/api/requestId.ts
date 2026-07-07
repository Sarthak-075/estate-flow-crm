/**
 * Returns the request ID from the incoming request if present,
 * otherwise generates a new UUID.
 */
export function getRequestId(request: Request): string {
  return (
    request.headers.get("x-request-id") ??
    request.headers.get("x-correlation-id") ??
    crypto.randomUUID()
  );
}
