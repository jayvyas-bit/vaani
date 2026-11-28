import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Button as UntitledButton } from "@/components/base/buttons/button";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

const colorMap = {
  primary: "primary",
  secondary: "secondary",
  ghost: "tertiary",
  destructive: "primary-destructive",
} as const;

/** Wrapper over the Untitled UI Button that keeps this app's variant/size API. */
export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  disabled,
  onClick,
  children,
  ...rest
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <UntitledButton
      {...(rest as object)}
      type={type}
      color={colorMap[variant]}
      size={size === "sm" ? "md" : size === "md" ? "md" : "lg"}
      isDisabled={disabled}
      onClick={onClick as never}
      className={`text-[14px] [&>span]:inline-flex [&>span]:items-center [&>span]:gap-1.5 ${className}`}
    >
      {children}
    </UntitledButton>
  );
}
