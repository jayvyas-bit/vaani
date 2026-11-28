import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { Children, isValidElement } from "react";
import { twMerge } from "tailwind-merge";
import { HelpCircle } from "@untitledui/icons";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { InputBase } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { TextAreaBase } from "@/components/base/textarea/textarea";

export function FieldLabel({
  children,
  hint,
  required,
  htmlFor,
  id,
  tip,
}: {
  children: ReactNode;
  hint?: string;
  /** Helper text shown in a tooltip on a help icon beside the label. */
  tip?: string;
  required?: boolean;
  /** id of the control this labels — always pass it so the label is announced. */
  htmlFor?: string;
  id?: string;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
      <label htmlFor={htmlFor} id={id} className="text-sm font-medium text-secondary">
        {children}
        {required && <span className="ml-0.5 text-brand-600">*</span>}
        {tip && (
          <Tooltip title={tip} placement="top">
            <TooltipTrigger aria-label="More info" className="-m-1.5 ml-0 inline-flex translate-y-0.5 cursor-pointer rounded-full p-1.5 text-fg-quaternary outline-focus-ring hover:text-fg-quaternary_hover focus-visible:outline-2">
              <HelpCircle className="size-4" />
            </TooltipTrigger>
          </Tooltip>
        )}
      </label>
      {hint && <span className="text-sm text-tertiary">{hint}</span>}
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
        <label htmlFor={htmlFor} className="text-[14px] font-medium text-ink-900">
          {label}
          {required && <span className="ml-0.5 text-brand-600">*</span>}
        </label>
        {help && <p className="mt-0.5 text-sm leading-snug text-tertiary">{help}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Inline validation message, linked to its control via aria-describedby. */
export function FieldError({ id, children }: { id: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm font-medium text-error-600">
      {children}
    </p>
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <InputBase
      {...(props as object)}
      isInvalid={props["aria-invalid"] === true || props["aria-invalid"] === "true"}
      isDisabled={props.disabled}
      inputClassName="px-[14px] py-[10px] text-left text-[14px]"
      wrapperClassName={className}
    />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <TextAreaBase
      {...(props as object)}
      className={twMerge("px-[14px] py-[10px] text-[14px] resize-none aria-invalid:ring-error_subtle aria-invalid:focus:ring-error", className)}
    />
  );
}

export function Select({
  children,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  const options = Children.toArray(children)
    .filter(isValidElement)
    .map((el) => {
      const o = el.props as { value?: string; children?: ReactNode; disabled?: boolean };
      return { value: String(o.value ?? o.children), label: Children.toArray(o.children).join(""), disabled: o.disabled };
    });
  return (
    <NativeSelect
      {...(props as object)}
      options={options}
      className={className}
      selectClassName="px-[14px] py-[10px] text-[14px] font-normal"
    />
  );
}
