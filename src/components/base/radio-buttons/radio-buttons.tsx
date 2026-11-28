import type { ReactNode } from "react";
import { Radio as AriaRadio, RadioGroup as AriaRadioGroup, type RadioGroupProps as AriaRadioGroupProps, type RadioProps as AriaRadioProps } from "react-aria-components";
import { cx } from "@/utils/cx";

export const RadioGroup = ({ className, ...props }: AriaRadioGroupProps) => (
    <AriaRadioGroup {...props} className={(state) => cx("flex flex-col gap-3", typeof className === "function" ? className(state) : className)} />
);

export interface RadioItemProps extends Omit<AriaRadioProps, "children"> {
    /** Primary label. */
    label: string;
    /** Secondary line under the label. */
    hint?: string;
    /** Content shown before the label, such as an icon or featured icon. */
    leading?: ReactNode;
}

/** Card-style radio: the whole surface is the target and the selected card gets a brand ring. */
export const RadioItem = ({ label, hint, leading, className, ...props }: RadioItemProps) => (
    <AriaRadio
        {...props}
        className={(state) =>
            cx(
                "flex cursor-pointer items-center gap-3.5 rounded-xl bg-primary px-4 py-3.5 ring-1 ring-primary outline-focus-ring transition duration-100 ease-linear ring-inset focus-visible:outline-2 focus-visible:outline-offset-2",
                "hover:ring-brand-300",
                state.isSelected && "ring-2 ring-brand",
                state.isDisabled && "cursor-not-allowed opacity-50",
                typeof className === "function" ? className(state) : className,
            )
        }
    >
        {({ isSelected }) => (
            <>
                {leading}
                <span className="min-w-0 flex-1">
                    <span className={cx("block text-sm font-semibold", isSelected ? "text-brand-secondary" : "text-secondary")}>{label}</span>
                    {hint && <span className="block text-sm text-tertiary">{hint}</span>}
                </span>
                <span
                    aria-hidden
                    className={cx(
                        "flex size-5 shrink-0 items-center justify-center rounded-full ring-1 ring-inset transition duration-100",
                        isSelected ? "bg-brand-solid ring-brand-solid" : "bg-primary ring-gray-300",
                    )}
                >
                    {isSelected && <span className="size-2 rounded-full bg-white" />}
                </span>
            </>
        )}
    </AriaRadio>
);
