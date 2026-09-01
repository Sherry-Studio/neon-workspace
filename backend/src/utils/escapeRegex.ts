/**
 * Escapes user input before it is used inside a MongoDB `$regex` filter.
 * Prevents both accidental matches and ReDoS from adversarial patterns.
 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Builds a safe case-insensitive "contains" regex filter. */
export function containsInsensitive(input: string) {
  return { $regex: escapeRegex(input), $options: "i" as const };
}
