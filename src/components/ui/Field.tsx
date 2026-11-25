import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

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
      <label htmlFor={htmlFor} id={id} className="text-sm font-medium text-gray-700">
        {children}
        {required && <span className="ml-0.5 text-brand-600">*</span>}
      </label>
      {hint && <span className="text-xs text-gray-500">{hint}</span>}
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
  "w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-xs placeholder:text-gray-500 outline-none transition-[border-color,box-shadow] hover:border-gray-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-500/25 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-500 aria-invalid:border-error-300 aria-invalid:focus:ring-error-500/25";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldClasses} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldClasses} resize-none ${props.className ?? ""}`} />;
}

export function Select({
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select
      {...props}
      className={`${fieldClasses} cursor-pointer appearance-none bg-[length:16px] bg-[right_0.875rem_center] bg-no-repeat pr-10 ${props.className ?? ""}`}
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
