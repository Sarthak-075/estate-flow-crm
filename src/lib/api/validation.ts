import { z, ZodError } from "zod";
import { ValidationError } from "./errors";
import type { InferSchema, Schema } from "./types";

/**
 * Parse and validate a JSON request body.
 */
export async function parseBody<T extends Schema>(
  request: Request,
  schema: T,
): Promise<InferSchema<T>> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new ValidationError({
      body: ["Invalid JSON body"],
    });
  }

  return parse(schema, body);
}

/**
 * Parse arbitrary input with a Zod schema.
 */
export function parse<T extends Schema>(
  schema: T,
  input: unknown,
): InferSchema<T> {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError(z.treeifyError(error));
    }

    throw error;
  }
}

/**
 * Parse route parameters.
 */
export function parseParams<T extends Schema>(
  params: unknown,
  schema: T,
): InferSchema<T> {
  return parse(schema, params);
}

/**
 * Parse URL query parameters.
 */
export function parseQuery<T extends Schema>(
  searchParams: URLSearchParams,
  schema: T,
): InferSchema<T> {
  const query = Object.fromEntries(searchParams.entries());

  return parse(schema, query);
}
