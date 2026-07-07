import { z } from "zod";

/**
 * Generic Zod schema.
 */
export type Schema<T = unknown> = z.ZodType<T>;

/**
 * Infer schema output.
 */
export type InferSchema<T extends Schema> = z.infer<T>;
