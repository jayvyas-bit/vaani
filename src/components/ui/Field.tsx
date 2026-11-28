import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { twMerge } from "tailwind-merge";

export function FieldLabel({
  children,
  hint,
  required,
  htmlFor,
  id,
}: {
  children: ReactNode;
  hint?: string;
  required?: boolean;
  /** id of the control this labels — always pass it so the label is announced. */
  htmlFor?: string;
  id?: string;
}) {
  return (
    <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
      <label htmlFor={htmlFor} id={id} className="text-[13px] font-medium text-ink-900">
        {children}
        {required && <span className="ml-0.5 text-brand-600">*</span>}
      </label>
      {hint && <span className="text-xs text-ink-500">{hint}</span>}
    </div>
  );
}

/**
 * Settings row: label and help on the left, control on the right, hairline
 * between rows. The standard layout for configuration screens.
 */
export function SettingRow({
  label,
  help,
  htmlFor,
  required,
  children,
}: {
  label: ReactNode;
  help?: ReactNode;
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-2 border-t border-ink-950/8 py-4 first:border-t-0 md:grid-cols-[200px_minmax(0,1fr)]">
      <div className="min-w-0">
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-900">
          {label}
          {required && <span className="ml-0.5 text-brand-600">*</span>}
        </label>
        {help && <p className="mt-0.5 text-[12px] leading-snug text-ink-500">{help}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Inline validation message, linked to its control via aria-describedby. */
export function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs font-medium text-error-600">
      {children}
    </p>
  );
}

const fieldClasses =
  "w-full rounded-md border border-ink-950/45 bg-paper-0 px-3 py-2 text-[13px] text-ink-950 placeholder:text-ink-500 outline-none transition-[border-color,box-shadow] hover:border-ink-950/60 focus:border-brand-600 focus:ring-2 focus:ring-ink-950/10 disabled:cursor-not-allowed disabled:border-paper-200 disabled:bg-paper-50 disabled:text-ink-500 aria-invalid:border-error-300 aria-invalid:focus:ring-error-500/25";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={twMerge(fieldClasses, props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={twMerge(fieldClasses, "resize-none", props.className)} />;
}

export function Select({
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select
      {...props}
      className={twMerge(
        fieldClasses,
        "cursor-pointer appearance-none bg-[length:16px] bg-[right_0.875rem_center] bg-no-repeat pr-10",
        props.className,
      )}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23667085' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        ...props.style,
      }}
    >
      {children}
    </select>
  );
}
