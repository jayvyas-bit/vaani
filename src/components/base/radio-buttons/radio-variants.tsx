import type { ReactNode } from "react";
import { Radio as AriaRadio, RadioGroup as AriaRadioGroup, type RadioGroupProps as AriaRadioGroupProps, type RadioProps as AriaRadioProps } from "react-aria-components";
import { Check } from "@untitledui/icons";
import { cx } from "@/utils/cx";

/** A single bordered surface that holds radio rows separated by hairlines. */
export const RadioList = ({ className, ...props }: AriaRadioGroupProps) => (
    <AriaRadioGroup
        {...props}
        className={(state) =>
            cx("flex flex-col divide-y divide-secondary overflow-hidden rounded-xl ring-1 ring-primary ring-inset", typeof className === "function" ? className(state) : className)
        }
    />
);

export interface RadioListItemProps extends Omit<AriaRadioProps, "children"> {
    label: string;
    hint?: string;
    leading?: ReactNode;
}

/** Row radio: the selected row gets a tinted surface and a check, no empty circles. */
export const RadioListItem = ({ label, hint, leading, className, ...props }: RadioListItemProps) => (
    <AriaRadio
        {...props}
        className={(state) =>
            cx(
                "flex cursor-pointer items-center gap-3 px-4 py-2 outline-focus-ring transition duration-100 ease-linear focus-visible:outline-2 focus-visible:-outline-offset-2",
                "hover:bg-primary_hover",
                state.isSelected && "bg-brand-25 hover:bg-brand-25",
                state.isDisabled && "cursor-not-allowed opacity-50",
                typeof className === "function" ? className(state) : className,
            )
        }
    >
        {({ isSelected }) => (
            <>
                {leading}
                <span className="min-w-0 flex-1">
                    <span className={cx("text-sm font-semibold", isSelected ? "text-brand-secondary" : "text-primary")}>{label}</span>
                    {hint && <span className="ml-2 text-sm text-tertiary">{hint}</span>}
                </span>
                <Check aria-hidden className={cx("size-5 shrink-0 text-brand-secondary transition-opacity", isSelected ? "opacity-100" : "opacity-0")} />
            </>
        )}
    </AriaRadio>
);

/** Segmented control: a tinted track with a raised selected segment. */
export const SegmentedGroup = ({ className, ...props }: AriaRadioGroupProps) => (
    <AriaRadioGroup
        {...props}
        orientation="horizontal"
        className={(state) => cx("inline-flex w-full gap-1 rounded-lg bg-secondary p-1 ring-1 ring-secondary ring-inset", typeof className === "function" ? className(state) : className)}
    />
);

export const SegmentedItem = ({ label, className, ...props }: Omit<AriaRadioProps, "children"> & { label: string }) => (
    <AriaRadio
        {...props}
        className={(state) =>
            cx(
                "flex flex-1 cursor-pointer items-center justify-center rounded-md px-3 py-2 text-sm font-semibold whitespace-nowrap outline-focus-ring transition duration-100 ease-linear focus-visible:outline-2",
                state.isSelected ? "bg-primary text-brand-secondary shadow-sm" : "text-tertiary hover:text-secondary",
                typeof className === "function" ? className(state) : className,
            )
        }
    >
        {label}
    </AriaRadio>
);

/** Grid of compact selectable tiles (no radio circle; a check badge marks the choice). */
export const RadioTileGroup = ({ className, ...props }: AriaRadioGroupProps) => (
    <AriaRadioGroup {...props} className={(state) => cx("grid grid-cols-2 gap-2", typeof className === "function" ? className(state) : className)} />
);

export const RadioTile = ({ label, hint, leading, className, ...props }: RadioListItemProps) => (
    <AriaRadio
        {...props}
        className={(state) =>
            cx(
                "relative flex cursor-pointer items-center gap-3 rounded-lg bg-primary px-3 py-2.5 ring-1 ring-primary outline-focus-ring transition duration-100 ease-linear ring-inset focus-visible:outline-2 focus-visible:outline-offset-2",
                "hover:bg-primary_hover",
                state.isSelected && "ring-2 ring-brand",
                state.isDisabled && "cursor-not-allowed opacity-50",
                typeof className === "function" ? className(state) : className,
            )
        }
    >
        {({ isSelected }) => (
            <>
                {leading}
                <span className="min-w-0 flex-1 leading-tight">
                    <span className={cx("block truncate text-sm font-semibold", isSelected ? "text-brand-secondary" : "text-primary")}>{label}</span>
                    {hint && <span className="block truncate text-sm text-tertiary">{hint}</span>}
                </span>
                {isSelected && <Check aria-hidden className="size-4 shrink-0 text-brand-secondary" />}
            </>
        )}
    </AriaRadio>
);
