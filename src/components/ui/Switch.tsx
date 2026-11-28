import { Toggle } from "@/components/base/toggle/toggle";

/** Thin wrapper over the Untitled UI Toggle, keeping the boolean onChange API. */
export function Switch({
  checked,
  onChange,
  disabled,
  label,
  id,
}: {
  checked: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  /** Accessible name — switches have no visible label of their own here. */
  label?: string;
  id?: string;
}) {
  return <Toggle id={id} aria-label={label} isSelected={checked} onChange={onChange} isDisabled={disabled} />;
}
