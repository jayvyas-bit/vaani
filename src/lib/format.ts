export function formatUsd(value: number, opts: { cents?: boolean } = {}): string {
  if (opts.cents) {
    return `$${value.toFixed(3)}`;
  }
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export type DisplayCurrency = "USD" | "INR";

/**
 * Illustrative only, not a live or verified exchange rate. Every provider in
 * this app bills in USD — picking INR here only changes how the figure is
 * displayed, never what's actually charged.
 */
export const ILLUSTRATIVE_USD_TO_INR_RATE = 83;

export const displayCurrencyLabel: Record<DisplayCurrency, string> = {
  USD: "US dollars (USD)",
  INR: "Indian rupees (INR, illustrative)",
};

/** Same cost figure formatUsd would show, converted for on-screen display only when `currency` isn't USD. */
export function formatMoney(valueUsd: number, currency: DisplayCurrency, opts: { cents?: boolean } = {}): string {
  if (currency === "USD") return formatUsd(valueUsd, opts);
  const inr = valueUsd * ILLUSTRATIVE_USD_TO_INR_RATE;
  if (opts.cents) return `≈₹${inr.toFixed(3)}`;
  return `≈${inr.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}`;
}

export const currencySymbol: Record<DisplayCurrency, string> = {
  USD: "$",
  INR: "₹",
};

/** A USD amount (as stored) converted into the units the display currency's input should show. */
export function toDisplayAmount(valueUsd: number, currency: DisplayCurrency): number {
  return currency === "USD" ? valueUsd : Math.round(valueUsd * ILLUSTRATIVE_USD_TO_INR_RATE);
}

/** The reverse of `toDisplayAmount` — what a value typed in the display currency means in stored USD. */
export function fromDisplayAmount(displayValue: number, currency: DisplayCurrency): number {
  return currency === "USD" ? displayValue : displayValue / ILLUSTRATIVE_USD_TO_INR_RATE;
}
