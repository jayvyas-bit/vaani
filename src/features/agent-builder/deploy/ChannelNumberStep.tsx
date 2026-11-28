import { useId } from "react";
import { FieldError, FieldLabel, Input, Select } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { RadioCard } from "@/components/ui/RadioCard";
import {
  availablePool,
  defaultDeployConfig,
  ensureProvisioned,
  formatPhone,
  isValidAreaCode,
  PHONE_COUNTRIES,
  phoneCountryInfo,
  type DeployConfig,
  type NumberMethod,
  type PhoneCountry,
} from "@/lib/deploy";
import type { CallDirection } from "@/lib/types";
import { useControllable } from "@/lib/useControllable";

export function ChannelNumberStep({
  direction,
  currentNumber,
  takenNumbers = [],
  config: configProp,
  onConfigChange,
  showErrors = false,
}: {
  direction: CallDirection;
  /** The number the agent already holds, if any. */
  currentNumber?: string;
  /** Numbers held by other agents in the workspace — never handed out again. */
  takenNumbers?: string[];
  config?: DeployConfig;
  onConfigChange?: (next: DeployConfig) => void;
  /** Show validation even before the field is touched (after a Continue attempt). */
  showErrors?: boolean;
}) {
  const id = useId();
  const [config, setConfig] = useControllable(
    configProp ?? ensureProvisioned(defaultDeployConfig(direction, currentNumber), takenNumbers),
    onConfigChange,
  );
  const pool = availablePool(takenNumbers);
  const update = (patch: Partial<DeployConfig>) => setConfig(ensureProvisioned({ ...config, ...patch }, takenNumbers));
  const choose = (numberMethod: NumberMethod) =>
    update({
      numberMethod,
      poolNumber: numberMethod === "pool" ? (config.poolNumber && pool.includes(config.poolNumber) ? config.poolNumber : pool[0]) : config.poolNumber,
    });
  const chooseCountry = (country: PhoneCountry) => update({ country, areaCode: "", provisionedNumber: undefined });

  const countryInfo = phoneCountryInfo[config.country];
  const areaErr =
    config.numberMethod === "new" && !isValidAreaCode(config.country, config.areaCode)
      ? `Enter a valid ${countryInfo.label} code (numeric, up to ${countryInfo.areaCodeMaxLength} digits, can’t start with 0).`
      : null;
  const portErr =
    config.numberMethod === "port" && (showErrors || config.portNumber.trim()) && !formatPhone(config.country, config.portNumber)
      ? config.country === "US"
        ? "Enter the full 10-digit number, e.g. (503) 555-0123."
        : `Enter the full number including the country code, e.g. ${countryInfo.dialCode} 5551234567.`
      : null;

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="text-display-xs font-semibold tracking-[-0.02em] text-primary">Phone number</h1>
        <p className="mt-2 text-md text-tertiary">
          {direction === "inbound"
            ? "Callers reach this agent by dialing the number you pick here."
            : "Recipients will see this number on caller ID."}
        </p>
        <p className="mt-2 text-[12px] text-ink-500">
          Voice calls only. Chat and SMS aren’t enabled on this workspace.
        </p>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-gray-700">
          {direction === "inbound" ? "Which number should ring this agent?" : "Which number should this agent call from?"}
        </legend>
        <div className="mt-2 flex flex-col gap-2.5">
          {currentNumber && (
            <RadioCard
              selected={config.numberMethod === "keep"}
              onSelect={() => choose("keep")}
              icon={<Icon name="check" className="size-4" />}
              title={`Keep ${currentNumber}`}
              description="The number this agent already uses."
            />
          )}
          <RadioCard
            selected={config.numberMethod === "new"}
            onSelect={() => choose("new")}
            icon={<Icon name="plus" className="size-4" />}
            title="Get a new local number"
            description="We’ll reserve one in the area code you choose."
          />
          <RadioCard
            selected={config.numberMethod === "port"}
            onSelect={() => choose("port")}
            icon={<Icon name="phone-inbound" className="size-4" />}
            title="Port an existing number"
            description={
              direction === "inbound"
                ? "Keep a number your callers already know."
                : "Call from a number your customers already recognize."
            }
          />
          <RadioCard
            selected={config.numberMethod === "pool"}
            onSelect={() => pool.length > 0 && choose("pool")}
            icon={<Icon name="list" className="size-4" />}
            title="Use a number from your workspace pool"
            description={
              pool.length === 0
                ? "Every pooled number is already assigned to another agent."
                : `${pool.length} unused number${pool.length === 1 ? "" : "s"} available.`
            }
          />
        </div>
      </fieldset>

      {config.numberMethod === "new" && (
        <div className="flex flex-col gap-4">
          <div className="max-w-sm">
            <FieldLabel htmlFor={`${id}-country`}>Country</FieldLabel>
            <Select
              id={`${id}-country`}
              name="country"
              value={config.country}
              onChange={(e) => chooseCountry(e.target.value as PhoneCountry)}
              className="max-w-[280px]"
            >
              {PHONE_COUNTRIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label} ({c.dialCode})
                </option>
              ))}
            </Select>
          </div>
          <div className="max-w-sm">
            <FieldLabel htmlFor={`${id}-area`} hint={countryInfo.areaCodeHint}>
              {countryInfo.areaCodeLabel}
            </FieldLabel>
            <Input
              id={`${id}-area`}
              name="areaCode"
              inputMode="numeric"
              maxLength={countryInfo.areaCodeMaxLength}
              autoComplete="off"
              value={config.areaCode}
              onChange={(e) => update({ areaCode: e.target.value.replace(/\D/g, "").slice(0, countryInfo.areaCodeMaxLength) })}
              aria-invalid={!!areaErr || undefined}
              aria-describedby={areaErr ? `${id}-area-err` : `${id}-area-note`}
              className="w-32"
            />
            <FieldError id={`${id}-area-err`}>{areaErr}</FieldError>
            {!areaErr && config.provisionedNumber && (
              <p id={`${id}-area-note`} className="mt-2 text-sm text-secondary">
                <Icon name="check" className="mr-1.5 inline size-4 align-text-bottom text-success-600" />
                <span className="whitespace-nowrap font-medium tabular-nums">{config.provisionedNumber}</span> is reserved for this agent and
                becomes active once you go live.
              </p>
            )}
          </div>
          <p className="text-sm text-tertiary">
            Illustrative provisioning only: no carrier is actually reserving a number here. Going live would require
            connecting a real telephony provider.
          </p>
        </div>
      )}
      {config.numberMethod === "port" && (
        <div className="flex flex-col gap-4">
          <div>
            <FieldLabel htmlFor={`${id}-port-country`}>Country</FieldLabel>
            <Select
              id={`${id}-port-country`}
              name="country"
              value={config.country}
              onChange={(e) => update({ country: e.target.value as PhoneCountry })}
              className="max-w-[280px]"
            >
              {PHONE_COUNTRIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label} ({c.dialCode})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor={`${id}-port`} hint="We’ll start the carrier porting process after you continue">
              Existing number
            </FieldLabel>
            <Input
              id={`${id}-port`}
              name="portNumber"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              value={config.portNumber}
              onChange={(e) => update({ portNumber: e.target.value })}
              onBlur={() => {
                const formatted = formatPhone(config.country, config.portNumber);
                if (formatted && formatted !== config.portNumber) update({ portNumber: formatted });
              }}
              aria-invalid={!!portErr || undefined}
              aria-describedby={portErr ? `${id}-port-err` : undefined}
              placeholder={config.country === "US" ? "(xxx) xxx-xxxx" : `${countryInfo.dialCode} xxxxxxxxxx`}
            />
            <FieldError id={`${id}-port-err`}>{portErr}</FieldError>
          </div>
          <p className="text-[12px] text-ink-500">
            Illustrative only: no carrier porting request is actually filed here. A real port needs your current
            carrier account details and typically takes days to complete.
          </p>
        </div>
      )}
      {config.numberMethod === "pool" && pool.length > 0 && (
        <div>
          <FieldLabel htmlFor={`${id}-pool`}>Number</FieldLabel>
          <Select
            id={`${id}-pool`}
            name="poolNumber"
            value={config.poolNumber ?? pool[0]}
            onChange={(e) => update({ poolNumber: e.target.value })}
          >
            {pool.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </div>
      )}
    </div>
  );
}
