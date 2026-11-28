import { useId, useRef, useState, type ReactNode } from "react";
import { FieldError, FieldLabel, Input, Select } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Switch } from "@/components/ui/Switch";
import {
  contactCountLabel,
  contactListErrors,
  csvHasConsentColumn,
  DAY_KEYS,
  dayHoursFor,
  dayLabel,
  defaultDeployConfig,
  hoursErrors,
  hoursSummary,
  WORKSPACE_CONTACT_LISTS,
  type ContactList,
  type DayKey,
  type DeployConfig,
  type DncList,
} from "@/lib/deploy";
import type { CallDirection } from "@/lib/types";
import { useControllable } from "@/lib/useControllable";

/**
 * One settings panel with divided rows, rather than a stack of identical
 * bordered cards — each row is a single decision, so they share one surface.
 */
function SettingRow({
  title,
  labelFor,
  hint,
  control,
  children,
}: {
  title: string;
  /** When the row holds a single field, its title labels that field. */
  labelFor?: string;
  hint?: ReactNode;
  control?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="px-4 py-4 sm:px-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          {labelFor ? (
            <label htmlFor={labelFor} className="block text-[13px] font-semibold text-ink-900">
              {title}
            </label>
          ) : (
            <p className="text-[13px] font-semibold text-ink-900">{title}</p>
          )}
          {hint && <div className="mt-0.5 text-[12px] text-ink-500">{hint}</div>}
        </div>
        {control}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

function TimeRange({
  startLabel,
  endLabel,
  start,
  end,
  startName,
  endName,
  errors,
  onChange,
}: {
  startLabel: string;
  endLabel: string;
  start: string;
  end: string;
  startName: string;
  endName: string;
  errors: { start?: string; end?: string };
  onChange: (next: { start?: string; end?: string }) => void;
}) {
  const id = useId();
  return (
    <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
      <div>
        <FieldLabel htmlFor={`${id}-start`}>{startLabel}</FieldLabel>
        <Input
          id={`${id}-start`}
          name={startName}
          type="time"
          step={900}
          required
          value={start}
          onChange={(e) => onChange({ start: e.target.value })}
          aria-invalid={!!errors.start || undefined}
          aria-describedby={errors.start ? `${id}-start-err` : undefined}
        />
        <FieldError id={`${id}-start-err`}>{errors.start}</FieldError>
      </div>
      <div>
        <FieldLabel htmlFor={`${id}-end`}>{endLabel}</FieldLabel>
        <Input
          id={`${id}-end`}
          name={endName}
          type="time"
          step={900}
          required
          value={end}
          onChange={(e) => onChange({ end: e.target.value })}
          aria-invalid={!!errors.end || undefined}
          aria-describedby={errors.end ? `${id}-end-err` : undefined}
        />
        <FieldError id={`${id}-end-err`}>{errors.end}</FieldError>
      </div>
    </div>
  );
}

function DayHoursRow({
  day,
  config,
  error,
  onChange,
}: {
  day: DayKey;
  config: DeployConfig;
  error?: string;
  onChange: (patch: { closed?: boolean; open?: string; close?: string }) => void;
}) {
  const hours = dayHoursFor(config, day);
  return (
    <div className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 min-[480px]:flex-row min-[480px]:items-start min-[480px]:gap-4">
      <div className="flex w-[120px] shrink-0 items-center gap-2 min-[480px]:pt-2">
        <span className="text-[13px] font-medium text-ink-800">{dayLabel[day]}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <label className="flex items-center gap-2 text-[12px] text-ink-600">
          <input
            type="checkbox"
            checked={hours.closed}
            onChange={(e) => onChange({ closed: e.target.checked })}
            className="size-3.5 rounded border-ink-300"
          />
          Closed
        </label>
        {!hours.closed && (
          <div>
            <TimeRange
              startLabel="Open"
              endLabel="Close"
              startName={`hoursByDay.${day}.open`}
              endName={`hoursByDay.${day}.close`}
              start={hours.open}
              end={hours.close}
              errors={{ start: error, end: error }}
              onChange={({ start, end }) =>
                onChange({ ...(start !== undefined && { open: start }), ...(end !== undefined && { close: end }) })
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

function InboundCompliance({
  config,
  update,
  canBook,
}: {
  config: DeployConfig;
  update: (p: Partial<DeployConfig>) => void;
  canBook: boolean;
}) {
  const errors = hoursErrors(config, "inbound");
  const setDayHours = (day: DayKey, patch: { closed?: boolean; open?: string; close?: string }) => {
    const current = dayHoursFor(config, day);
    update({
      hoursByDay: {
        ...config.hoursByDay,
        [day]: { ...current, ...patch },
      },
    });
  };
  return (
    <div className="divide-y divide-ink-950/8 rounded-lg border border-ink-950/10 bg-paper-0">
      <SettingRow
        title="Business hours"
        hint={`${hoursSummary(config)}. Starting default; confirm or change.`}
        control={
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-ink-600">Different hours per day</span>
            <Switch
              checked={!!config.customHoursByDay}
              onChange={(customHoursByDay) => update({ customHoursByDay })}
              label="Set different hours for each day"
            />
          </div>
        }
      >
        {config.customHoursByDay ? (
          <div className="divide-y divide-ink-950/8">
            {DAY_KEYS.map((day) => (
              <DayHoursRow key={day} day={day} config={config} error={errors.byDay?.[day]} onChange={(p) => setDayHours(day, p)} />
            ))}
          </div>
        ) : (
          <TimeRange
            startLabel="Open"
            endLabel="Close"
            startName="hoursOpen"
            endName="hoursClose"
            start={config.hoursOpen}
            end={config.hoursClose}
            errors={errors}
            onChange={({ start, end }) =>
              update({ ...(start !== undefined && { hoursOpen: start }), ...(end !== undefined && { hoursClose: end }) })
            }
          />
        )}
      </SettingRow>
      <SettingRow
        title="Answer after hours"
        hint={
          !config.afterHours
            ? "After hours, calls go to your voicemail instead of the agent."
            : canBook
              ? "Takes a message, and can book callers into the next open slot on your calendar."
              : "Takes a message and sends it to you. Add a booking tool in Build → Tools to let it book too."
        }
        control={
          <Switch
            checked={config.afterHours}
            onChange={(afterHours) => update({ afterHours })}
            label="Answer after hours"
          />
        }
      />
    </div>
  );
}

function OutboundCompliance({ config, update }: { config: DeployConfig; update: (p: Partial<DeployConfig>) => void }) {
  const id = useId();
  const errors = hoursErrors(config, "outbound");
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Lists uploaded this session, in addition to the workspace’s predefined ones.
  const [uploadedLists, setUploadedLists] = useState<ContactList[]>([]);
  const knownLists = [...WORKSPACE_CONTACT_LISTS, ...uploadedLists];
  // A previously-uploaded list survives in `config` (localStorage) even after
  // `uploadedLists` resets on remount — re-synthesize it from the persisted
  // fields so the dropdown and consent message don’t silently go blank.
  const lists =
    config.contactListName && !knownLists.some((l) => l.name === config.contactListName)
      ? [
          ...knownLists,
          {
            name: config.contactListName,
            count: config.contactCount,
            consentTracked: config.contactListConsentTracked ?? false,
          },
        ]
      : knownLists;
  const selectedList = lists.find((l) => l.name === config.contactListName);
  // Only show the error once someone has interacted with the picker, not on first view.
  const [touched, setTouched] = useState(false);
  const listErrors = touched ? contactListErrors(config) : {};

  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const rows = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
      // First row is assumed to be a header.
      const count = Math.max(0, rows.length - 1);
      const consentTracked = csvHasConsentColumn(rows[0] ?? "");
      const name = file.name.replace(/\.csv$/i, "");
      setUploadedLists((ls) => [...ls, { name, count, consentTracked }]);
      update({ contactListName: name, contactCount: count, contactListConsentTracked: consentTracked });
      setTouched(true);
    };
    reader.readAsText(file);
  };

  return (
    <div className="divide-y divide-ink-950/8 rounded-lg border border-ink-950/10 bg-paper-0">
      <SettingRow title="Who to call" hint="The contact list this agent works through once it’s live.">
        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor={`${id}-list`} required>
            Contact list
          </FieldLabel>
          <Select
            id={`${id}-list`}
            name="contactListName"
            value={config.contactListName}
            onChange={(e) => {
              const list = lists.find((l) => l.name === e.target.value);
              update({
                contactListName: e.target.value,
                contactCount: list?.count ?? 0,
                contactListConsentTracked: list?.consentTracked ?? false,
              });
            }}
            onBlur={() => setTouched(true)}
            aria-invalid={!!listErrors.name || undefined}
            aria-describedby={listErrors.name ? `${id}-list-err` : undefined}
          >
            <option value="">Choose a contact list…</option>
            {lists.map((l) => (
              <option key={l.name} value={l.name}>
                {l.name}, {contactCountLabel(l.count)}
                {WORKSPACE_CONTACT_LISTS.some((w) => w.name === l.name) ? " (sample)" : ""}
              </option>
            ))}
          </Select>
          <FieldError id={`${id}-list-err`}>{listErrors.name}</FieldError>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] text-ink-500">
              {selectedList
                ? `${contactCountLabel(selectedList.count)} on this list.${WORKSPACE_CONTACT_LISTS.some((w) => w.name === selectedList.name) ? " Sample data for this demo, not your real contacts." : ""}`
                : "Required: pick a list, or upload your own to continue."}
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 text-[12px] font-semibold text-brand-700 underline-offset-[0.2em] hover:underline"
            >
              Upload a CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                e.target.value = "";
              }}
            />
          </div>
          {selectedList && (
            <p
              className={`flex items-start gap-1.5 text-[12px] ${selectedList.consentTracked ? "text-success-700" : "text-amber-700"}`}
            >
              <Icon
                name={selectedList.consentTracked ? "check" : "alert"}
                className="mt-0.5 size-3.5 shrink-0"
              />
              {selectedList.consentTracked
                ? "This list has a consent/opt-in column. This only checks that the column exists, not that each record is current or legally sufficient to call on."
                : "No consent/opt-in column found on this list. Confirm you have a legal basis to call these numbers before going live."}
            </p>
          )}
        </div>
      </SettingRow>
      <SettingRow
        title="Calling window"
        hint={
          <span className="flex items-center gap-1.5">
            <Icon name="shield" className="size-3.5 shrink-0 text-ink-400" />
            Applied in each recipient’s local time. Many regions restrict unsolicited calls outside 8:00 AM – 9:00 PM. Check the rules where you’re calling.
          </span>
        }
      >
        <TimeRange
          startLabel="Earliest"
          endLabel="Latest"
          startName="windowStart"
          endName="windowEnd"
          start={config.windowStart}
          end={config.windowEnd}
          errors={errors}
          onChange={({ start, end }) =>
            update({ ...(start !== undefined && { windowStart: start }), ...(end !== undefined && { windowEnd: end }) })
          }
        />
      </SettingRow>
      <SettingRow title="Do-not-call list" labelFor={`${id}-dnc`} hint="Your choice is recorded for the dialing setup. This demo does not dial or check any list itself.">
        <Select
          id={`${id}-dnc`}
          name="dncList"
          value={config.dncList}
          onChange={(e) => update({ dncList: e.target.value as DncList })}
        >
          <option value="internal">Workspace DNC list (you supply the numbers)</option>
          <option value="federal">National and regional registries</option>
          <option value="both">Both: workspace list and registries</option>
        </Select>
        {config.dncList !== "internal" && (
          <p className="mt-2 text-[12px] text-ink-500">
            This demo doesn’t connect to any live registry, so there’s no real lookup here. Before going live, check numbers against the registry that applies where you call (for example the US Do Not Call Registry, or India’s NDNC preference register) and any local rules.
          </p>
        )}
      </SettingRow>
      <SettingRow
        title="Voicemail detection"
        hint={
          config.voicemailDetect
            ? "Leaves your name and callback number only, with no account details."
            : "The agent will run its live-call script even when it reaches voicemail."
        }
        control={
          <Switch
            checked={config.voicemailDetect}
            onChange={(voicemailDetect) => update({ voicemailDetect })}
            label="Voicemail detection"
          />
        }
      />
    </div>
  );
}

export function ComplianceStep({
  direction,
  config: configProp,
  onConfigChange,
  canBook = false,
}: {
  direction: CallDirection;
  config?: DeployConfig;
  onConfigChange?: (next: DeployConfig) => void;
  /** True when a booking tool is enabled — only then may after-hours copy promise booking. */
  canBook?: boolean;
}) {
  const [config, setConfig] = useControllable(configProp ?? defaultDeployConfig(direction), onConfigChange);
  const update = (patch: Partial<DeployConfig>) => setConfig({ ...config, ...patch });

  return (
    <div className="flex flex-col gap-7">
      <div>
        <h1 className="text-display-xs font-semibold tracking-[-0.02em] text-primary">
          {direction === "inbound" ? "Hours" : "Calling rules"}
        </h1>
        <p className="mt-2 text-md text-tertiary">
          {direction === "inbound"
            ? "When this agent answers, and what callers get outside those hours."
            : "Who this agent calls, when it may dial, and which numbers it must never call."}
        </p>
      </div>
      {direction === "inbound" ? (
        <InboundCompliance config={config} update={update} canBook={canBook} />
      ) : (
        <OutboundCompliance config={config} update={update} />
      )}
    </div>
  );
}
