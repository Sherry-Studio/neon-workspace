/**
 * Tiny duration parser: "15m", "30d", "1h", "45s", or a raw millisecond number.
 * Avoids pulling in the `ms` package for a single use.
 */
export default function ms(value: string | number): number {
  if (typeof value === 'number') return value;
  const match = /^(\d+)\s*(ms|s|m|h|d)?$/.exec(value.trim());
  if (!match) return 0;
  const n = parseInt(match[1], 10);
  switch (match[2]) {
    case 'ms':
      return n;
    case 's':
      return n * 1000;
    case 'm':
      return n * 60_000;
    case 'h':
      return n * 3_600_000;
    case 'd':
      return n * 86_400_000;
    default:
      return n;
  }
}
