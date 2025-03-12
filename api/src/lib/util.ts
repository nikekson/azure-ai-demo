export function parseIntSafe(input: string): number | null {
  if (!/^(-)?[0-9]+$/.test(input)) {
    return null;
  }
  const num = parseInt(input, 10);
  return isNaN(num) ? null : num;
}
