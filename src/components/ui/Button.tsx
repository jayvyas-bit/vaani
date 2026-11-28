import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "border border-brand-600 bg-brand-600 text-white hover:border-brand-700 hover:bg-brand-700 active:bg-brand-800 focus-visible:ring-brand-500/30 disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400",
  secondary:
    "border border-gray-200 bg-white text-gray-800 hover:bg-gray-50 hover:text-gray-800 active:bg-gray-100 active:text-gray-900 focus-visible:ring-gray-400/20 disabled:border-gray-200 disabled:bg-white disabled:text-gray-400",
  ghost:
    "border border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-700 active:bg-gray-100 active:text-gray-800 focus-visible:ring-gray-400/20 disabled:bg-transparent disabled:text-gray-400",
  destructive:
    "border border-error-600 bg-error-600 text-white shadow-xs hover:border-error-700 hover:bg-error-700 active:border-error-700 active:bg-error-700 active:brightness-90 focus-visible:ring-error-500/25 disabled:border-error-200 disabled:bg-error-50 disabled:text-error-300 disabled:shadow-none",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-9 px-3.5 text-[13px] gap-2",
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
      className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md font-medium outline-none transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-[var(--ease-out-quart)] focus-visible:ring-2 disabled:cursor-not-allowed disabled:active:scale-100 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
