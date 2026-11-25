import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "border border-brand-600 bg-brand-600 text-white shadow-xs hover:border-brand-700 hover:bg-brand-700 focus-visible:ring-brand-500/25 disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none",
  secondary:
    "border border-gray-300 bg-white text-gray-700 shadow-xs hover:bg-gray-50 hover:text-gray-800 focus-visible:ring-gray-400/20 disabled:border-gray-200 disabled:bg-white disabled:text-gray-400",
  ghost:
    "border border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-700 focus-visible:ring-gray-400/20 disabled:bg-transparent disabled:text-gray-400",
  destructive:
    "border border-error-600 bg-error-600 text-white shadow-xs hover:border-error-700 hover:bg-error-700 focus-visible:ring-error-500/25 disabled:border-error-200 disabled:bg-error-50 disabled:text-error-300 disabled:shadow-none",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5",
  md: "h-10 px-3.5 text-sm gap-2",
  lg: "h-11 px-4 text-md gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  children,
  ...rest
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg font-semibold transition-colors outline-none focus-visible:ring-4 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
