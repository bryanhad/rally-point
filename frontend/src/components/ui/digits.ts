// Splits a number into one flip tile per digit: 21 -> ['2', '1'].
export function digits(n: number): string[] {
  return String(n).split('')
}
