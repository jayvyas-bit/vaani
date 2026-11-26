import { useId, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FieldError, FieldLabel, Input, Select, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { SectionCard } from "@/components/ui/SectionCard";
import { Switch } from "@/components/ui/Switch";
import { parseCurl } from "@/lib/simulate";
import { isBookingTool, isTransferTool } from "@/lib/tools";
import { newId } from "@/lib/useControllable";
import type { CalendarProvider, ToolDef } from "@/lib/types";

const TRANSFER_PLACEHOLDER = "(503) 555-0100";
const TRANSFER_HELP = "Callers who ask for a person go here.";

const calendarProviderLabel: Record<CalendarProvider, string> = {
  google: "Google Calendar",
  outlook: "Outlook Calendar",
  other: "Other / custom calendar",
};

/** Inline calendar config editor for a booking tool — provider is real config; connection is simulated, never faked as a live OAuth link. */
function CalendarConfigEditor({
  toolName,
  initialProvider,
  initialConnected,
  onCancel,
  onSave,
}: {
  toolName: string;
  initialProvider: CalendarProvider;
  initialConnected: boolean;
  onCancel?: () => void;
  onSave: (patch: { calendarProvider: CalendarProvider; calendarConnected: boolean }) => void;
}) {
  const id = useId();
  const [provider, setProvider] = useState<CalendarProvider>(initialProvider);
  const [connected, setConnected] = useState(initialConnected);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSave({ calendarProvider: provider, calendarConnected: connected });
  };
  return (
    <form onSubmit={submit} aria-label={`Calendar configuration for ${toolName}`} className="mt-2.5 flex flex-col gap-3">
      <div>
        <FieldLabel htmlFor={`${id}-provider`}>Calendar</FieldLabel>
        <Select id={`${id}-provider`} name="calendarProvider" value={provider} onChange={(e) => setProvider(e.target.value as CalendarProvider)}>
          <option value="google">Google Calendar</option>
          <option value="outlook">Outlook Calendar</option>
          <option value="other">Other / custom calendar</option>
        </Select>
      </div>
      <div className="flex items-start gap-3 rounded-lg border border-ink-950/10 bg-paper-50 p-3">
        <Switch checked={connected} onChange={setConnected} label={`Simulate ${toolName} as connected`} />
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-ink-800">Simulate as connected (test only)</p>
          <p className="mt-0.5 text-[12px] text-ink-500">
            This demo has no live calendar backend — there's no real OAuth or account to link. This switch only
            marks the tool as connected for test scenarios; it doesn't read or write a real calendar.
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm">
          Save
        </Button>
      </div>
    </form>
  );
}

/** Inline "Transfer to" editor for a transfer tool that's already on the list. */
function DestinationEditor({
  toolName,
  initial,
  onCancel,
  onSave,
}: {
  toolName: string;
  initial: string;
  onCancel?: () => void;
  onSave: (destination: string) => void;
}) {
  const id = useId();
  const [value, setValue] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const err = submitted && !value.trim() ? "Enter a number, extension or queue to transfer to." : null;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (value.trim()) onSave(value.trim());
  };
  return (
    <form onSubmit={submit} noValidate aria-label={`Transfer destination for ${toolName}`} className="mt-2.5">
      <FieldLabel htmlFor={`${id}-dest`} required>
        Transfer to
      </FieldLabel>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <Input
            id={`${id}-dest`}
            name="transferDestination"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={TRANSFER_PLACEHOLDER}
            aria-invalid={!!err || undefined}
            aria-describedby={err ? `${id}-dest-err` : `${id}-dest-help`}
          />
          {err ? (
            <FieldError id={`${id}-dest-err`}>{err}</FieldError>
          ) : (
            <p id={`${id}-dest-help`} className="mt-1.5 text-[12.5px] text-ink-500">
              {TRANSFER_HELP}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" size="sm">
            Save
          </Button>
        </div>
      </div>
    </form>
  );
}

function ToolRow({
  tool,
  onToggle,
  onChange,
}: {
  tool: ToolDef;
  onToggle: (enabled: boolean) => void;
  onChange: (patch: Partial<ToolDef>) => void;
}) {
  const transfer = isTransferTool(tool);
  const booking = isBookingTool(tool);
  const destination = tool.destination?.trim();
  const [editing, setEditing] = useState(false);
  return (
    <div className="px-6 py-3.5">
      <div className="flex items-center gap-4">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-paper-100 text-ink-500">
          <Icon name="wrench" className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px] font-medium text-ink-950">
            {tool.name}
            {tool.kind === "custom" && !transfer && <Badge tone="neutral">Custom webhook</Badge>}
            {booking && <Badge tone="neutral">{calendarProviderLabel[tool.calendarProvider ?? "google"]}</Badge>}
          </p>
          {transfer ? (
            destination ? (
              <p className="text-[12.5px] text-ink-500">
                Transfers to <span className="font-medium text-ink-800">{destination}</span>
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-warning-700">
                <Icon name="alert" className="size-3.5 shrink-0" />
                No destination set — calls can't be transferred yet
              </p>
            )
          ) : booking ? (
            tool.calendarConnected ? (
              <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-success-700">
                <Icon name="check" className="size-3.5 shrink-0" />
                Connected (simulated — no live calendar backend)
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-warning-700">
                <Icon name="alert" className="size-3.5 shrink-0" />
                Not connected — configure a calendar before relying on this
              </p>
            )
          ) : (
            <p className="text-[12.5px] text-ink-500 sm:truncate">
              {tool.method && tool.url ? (
                <span className="font-mono text-[12px]">
                  {tool.method} {tool.url}
                </span>
              ) : (
                tool.description
              )}
            </p>
          )}
        </div>
        {transfer && !editing && (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)} aria-label={`Edit transfer destination for ${tool.name}`}>
            {destination ? "Edit" : "Set destination"}
          </Button>
        )}
        {booking && !editing && (
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)} aria-label={`Configure calendar for ${tool.name}`}>
            Configure
          </Button>
        )}
        <Switch checked={tool.enabled} onChange={onToggle} label={`Tool on: ${tool.name}`} />
      </div>
      {transfer && editing && (
        <div className="pl-12">
          <DestinationEditor
            toolName={tool.name}
            initial={tool.destination ?? ""}
            onCancel={() => setEditing(false)}
            onSave={(next) => {
              onChange({ destination: next });
              setEditing(false);
            }}
          />
        </div>
      )}
      {booking && editing && (
        <div className="pl-12">
          <CalendarConfigEditor
            toolName={tool.name}
            initialProvider={tool.calendarProvider ?? "google"}
            initialConnected={!!tool.calendarConnected}
            onCancel={() => setEditing(false)}
            onSave={(patch) => {
              onChange(patch);
              setEditing(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

/** Common actions a voice agent needs, so "Add a tool" isn't a blank form. */
const builtinPresets: Pick<ToolDef, "name" | "description">[] = [
  { name: "Transfer call", description: "Sends the live call to a teammate." },
  { name: "Book / reschedule appointment", description: "Reads and writes your scheduling calendar." },
  { name: "Send text confirmation", description: "Texts the caller a summary or confirmation after the call." },
  { name: "Add to do-not-call list", description: "Immediately suppresses the number for all future outbound calls." },
];

function AddToolForm({
  existing,
  onCancel,
  onSave,
}: {
  existing: ToolDef[];
  onCancel: () => void;
  onSave: (tool: ToolDef) => void;
}) {
  const id = useId();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [destination, setDestination] = useState("");
  // Only jump to "Transfer to" when the preset was clicked, never mid-typing a name.
  const [focusDestination, setFocusDestination] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const available = builtinPresets.filter((p) => !existing.some((t) => t.name === p.name));
  const preset = builtinPresets.find((p) => p.name.toLowerCase() === name.trim().toLowerCase());
  // Any transfer tool — the built-in or a custom one — needs to know where calls go.
  const needsDestination = !!name.trim() && isTransferTool({ name, description: preset?.description ?? description });
  const nameErr = submitted && !name.trim() ? "Give the tool a name." : null;
  const destErr =
    submitted && needsDestination && !destination.trim() ? "Enter a number, extension or queue to transfer to." : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!name.trim() || (needsDestination && !destination.trim())) return;
    onSave({
      id: newId("tool"),
      name: preset?.name ?? name.trim(),
      description:
        description.trim() || preset?.description || "Custom action — describe when the agent should use it.",
      kind: preset ? "builtin" : "custom",
      enabled: true,
      ...(needsDestination && { destination: destination.trim() }),
    });
  };

  return (
    <div className="m-6 flex flex-col gap-4 rounded-lg border border-ink-950/10 bg-paper-0 p-5">
      <div className="flex items-center gap-2">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-600">
          <Icon name="plus" className="size-3.5" />
        </div>
        <p className="text-[13.5px] font-semibold text-ink-950">Add a tool</p>
      </div>
      {available.length > 0 && (
        <div>
          <p className="mb-1.5 text-[12.5px] font-medium text-ink-500">Quick add</p>
          <div className="flex flex-wrap gap-2">
            {available.map((p) => (
              <Button
                key={p.name}
                type="button"
                size="sm"
                variant="secondary"
                onClick={() =>
                  isTransferTool(p)
                    ? (setName(p.name), setDescription(""), setSubmitted(false), setFocusDestination(true))
                    : onSave({
                        id: newId("tool"),
                        ...p,
                        kind: "builtin",
                        enabled: true,
                        ...(isBookingTool(p) && { calendarProvider: "google", calendarConnected: false }),
                      })
                }
              >
                <Icon name="plus" className="size-3.5" />
                {p.name}
              </Button>
            ))}
          </div>
        </div>
      )}
      <form onSubmit={submit} noValidate aria-label="Add a custom tool" className="flex flex-col gap-3">
        {available.length > 0 && (
          <div className="flex items-center gap-3 text-[12px] font-medium text-ink-400">
            <span className="h-px flex-1 bg-ink-950/8" />
            or build a custom one
            <span className="h-px flex-1 bg-ink-950/8" />
          </div>
        )}
        <div>
          <FieldLabel htmlFor={`${id}-name`} required>
            Tool name
          </FieldLabel>
          <Input
            id={`${id}-name`}
            name="toolName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!nameErr || undefined}
            aria-describedby={nameErr ? `${id}-name-err` : undefined}
            placeholder="e.g. Check order status"
          />
          <FieldError id={`${id}-name-err`}>{nameErr}</FieldError>
        </div>
        {needsDestination && (
          <div>
            <FieldLabel htmlFor={`${id}-dest`} required>
              Transfer to
            </FieldLabel>
            <Input
              id={`${id}-dest`}
              name="transferDestination"
              autoFocus={focusDestination}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder={TRANSFER_PLACEHOLDER}
              aria-invalid={!!destErr || undefined}
              aria-describedby={destErr ? `${id}-dest-err` : `${id}-dest-help`}
            />
            {destErr ? (
              <FieldError id={`${id}-dest-err`}>{destErr}</FieldError>
            ) : (
              <p id={`${id}-dest-help`} className="mt-1.5 text-[12.5px] text-ink-500">
                {TRANSFER_HELP}
              </p>
            )}
          </div>
        )}
        <div>
          <FieldLabel htmlFor={`${id}-desc`} hint="The agent reads this to decide when to call it">
            What it does
          </FieldLabel>
          <Input
            id={`${id}-desc`}
            name="toolDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={preset?.description ?? "e.g. Looks up an order by number and returns its shipping status"}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" size="sm">
            {needsDestination ? "Add transfer" : "Add tool"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function ToolsSection({
  tools,
  onToolsChange,
  defaultAdvanced = false,
}: {
  tools: ToolDef[];
  onToolsChange: (next: ToolDef[]) => void;
  defaultAdvanced?: boolean;
}) {
  const id = useId();
  const [adding, setAdding] = useState(false);
  const [curl, setCurl] = useState("");
  const [curlError, setCurlError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<ToolDef | null>(null);

  const generate = () => {
    const parsed = parseCurl(curl);
    if ("error" in parsed) {
      setCurlError(parsed.error);
      return;
    }
    const tool: ToolDef = {
      id: newId("tool"),
      name: parsed.suggestedName,
      description: `Custom webhook: ${parsed.method} ${parsed.url}`,
      kind: "custom",
      enabled: true,
      method: parsed.method,
      url: parsed.url,
      params: parsed.params,
      timeoutSec: 6,
    };
    onToolsChange([...tools, tool]);
    setGenerated(tool);
    setCurl("");
    setCurlError(null);
  };

  // Keep the preview in sync with edits made after generation (rename/timeout).
  const live = generated ? tools.find((t) => t.id === generated.id) : undefined;
  const updateGenerated = (patch: Partial<ToolDef>) => {
    if (!live) return;
    onToolsChange(tools.map((t) => (t.id === live.id ? { ...t, ...patch } : t)));
  };

  return (
    <SectionCard
      title="Tools"
      description="Actions it can take during a call, like booking or transferring."
      defaultAdvancedOpen={defaultAdvanced}
      guided={
        <div className="-mx-6 -mb-6 mt-1 divide-y divide-ink-950/8 border-t border-ink-950/8">
          {tools.length === 0 && !adding && (
            <p className="px-6 py-5 text-[13px] text-ink-500">
              No tools yet, so the agent can talk but can't act. Add call transfer first so callers can
              always reach a teammate, then booking or lookups as you need them.
            </p>
          )}
          {tools.map((t) => (
            <ToolRow
              key={t.id}
              tool={t}
              onToggle={(enabled) => onToolsChange(tools.map((x) => (x.id === t.id ? { ...x, enabled } : x)))}
              onChange={(patch) => onToolsChange(tools.map((x) => (x.id === t.id ? { ...x, ...patch } : x)))}
            />
          ))}
          {adding ? (
            <AddToolForm
              existing={tools}
              onCancel={() => setAdding(false)}
              onSave={(tool) => {
                onToolsChange([...tools, tool]);
                setAdding(false);
              }}
            />
          ) : (
            <div className="px-6 py-5">
              <Button variant="secondary" className="gap-2" onClick={() => setAdding(true)}>
                <Icon name="plus" className="size-4" />
                Add a tool
              </Button>
            </div>
          )}
        </div>
      }
      advanced={
        <div className="flex flex-col gap-3">
          <div>
            <FieldLabel hint="Exactly what the agent can call, including where transfers go">Tools as data (JSON)</FieldLabel>
            <pre
              aria-label="Tools as JSON"
              className="overflow-x-auto rounded-md bg-ink-950 p-3 text-[12px] leading-relaxed text-paper-100"
            >
{JSON.stringify(
  tools.map((t) => ({
    name: t.name,
    enabled: t.enabled,
    description: t.description,
    ...(isTransferTool(t) && { transferTo: t.destination?.trim() || null }),
    ...(isBookingTool(t) && {
      calendarProvider: t.calendarProvider ?? "google",
      calendarConnected: !!t.calendarConnected,
    }),
    ...(t.method && t.url && { method: t.method, url: t.url }),
  })),
  null,
  2,
)}
            </pre>
          </div>
          <FieldLabel htmlFor={`${id}-curl`} hint="We'll infer the method, endpoint, and parameters">
            Paste a cURL command to generate a custom tool
          </FieldLabel>
          <Textarea
            id={`${id}-curl`}
            name="curl"
            rows={3}
            value={curl}
            onChange={(e) => {
              setCurl(e.target.value);
              if (curlError) setCurlError(null);
            }}
            aria-invalid={!!curlError || undefined}
            aria-describedby={curlError ? `${id}-curl-err` : undefined}
            placeholder={`curl -X POST https://api.yourpractice.com/v1/eligibility \\\n  -H "Authorization: Bearer ..." \\\n  -d '{"memberId": "..."}'`}
            className="font-mono text-[12.5px]"
          />
          <FieldError id={`${id}-curl-err`}>{curlError}</FieldError>
          <div className="flex justify-end">
            <Button size="sm" variant="secondary" disabled={!curl.trim()} onClick={generate}>
              Generate tool from cURL
            </Button>
          </div>
          {live && (
            <div className="mt-1 flex flex-col gap-3 rounded-lg border border-success-200 bg-paper-0 p-4">
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-success-700">
                <Icon name="check" className="size-3.5" />
                Added “{live.name}” to this agent's tools
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel htmlFor={`${id}-gen-name`}>Tool name</FieldLabel>
                  <Input
                    id={`${id}-gen-name`}
                    name="generatedToolName"
                    value={live.name}
                    onChange={(e) => updateGenerated({ name: e.target.value })}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor={`${id}-gen-timeout`} hint="seconds">
                    Timeout
                  </FieldLabel>
                  <Input
                    id={`${id}-gen-timeout`}
                    name="generatedToolTimeout"
                    type="number"
                    min={1}
                    max={30}
                    value={live.timeoutSec ?? 6}
                    onChange={(e) => updateGenerated({ timeoutSec: Number(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <pre
                aria-label="Generated tool schema JSON"
                className="overflow-x-auto rounded-md bg-ink-950 p-3 text-[12px] leading-relaxed text-paper-100"
              >
{JSON.stringify(
  {
    name: live.name,
    method: live.method,
    url: live.url,
    parameters: Object.fromEntries((live.params ?? []).map((p) => [p, { type: "string" }])),
    timeoutSec: live.timeoutSec ?? 6,
  },
  null,
  2,
)}
              </pre>
            </div>
          )}
        </div>
      }
    />
  );
}
