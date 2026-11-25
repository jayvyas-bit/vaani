export function formatUsd(value: number, opts: { cents?: boolean } = {}): string {
  if (opts.cents) {
    return `$${value.toFixed(3)}`;
  }
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}
