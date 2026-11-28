import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FieldError, FieldLabel, Input, Select, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Drawer, Section } from "@/components/ui/PanelCard";
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
          <p className="text-[13px] font-medium text-ink-800">Simulate as connected (test only)</p>
          <p className="mt-0.5 text-[13px] text-ink-500">
            This demo has no live calendar backend: there’s no real OAuth or account to link. This switch only
            marks the tool as connected for test scenarios; it doesn’t read or write a real calendar.
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

/** Inline "What it does" editor for a tool's description — what the agent reads to decide when and how to call it. */
function DescriptionEditor({
  toolName,
  initial,
  onCancel,
  onSave,
}: {
  toolName: string;
  initial: string;
  onCancel?: () => void;
  onSave: (description: string) => void;
}) {
  const id = useId();
  const [value, setValue] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const err = submitted && !value.trim() ? "Describe what this tool does." : null;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (value.trim()) onSave(value.trim());
  };
  return (
    <form onSubmit={submit} noValidate aria-label={`Edit description for ${toolName}`} className="mt-2.5">
      <FieldLabel htmlFor={`${id}-tool-desc`} required hint="The agent reads this to decide when and how to call it">
        What it does
      </FieldLabel>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <Textarea
            id={`${id}-tool-desc`}
            name="toolDescription"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={!!err || undefined}
            aria-describedby={err ? `${id}-tool-desc-err` : undefined}
          />
          <FieldError id={`${id}-tool-desc-err`}>{err}</FieldError>
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

/** Inline "Transfer to" editor for a transfer tool that’s already on the list. */
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
            <p id={`${id}-dest-help`} className="mt-1.5 text-[13px] text-ink-500">
              {TRANSFER_HELP}
            </p>
          )}
          <p className="mt-1.5 text-[13px] text-ink-500">
            This demo never dials or verifies this destination: entering a number here doesn’t confirm it’s
            reachable or that whoever answers has agreed to take transferred calls.
          </p>
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

const toolTag = "rounded-full px-2.5 py-0.5 text-xs font-medium text-secondary ring-1 ring-inset ring-ink-950/20";

function ToolRow({
  tool,
  onToggle,
  onChange,
  onDelete,
}: {
  tool: ToolDef;
  onToggle: (enabled: boolean) => void;
  onChange: (patch: Partial<ToolDef>) => void;
  onDelete: () => void;
}) {
  const transfer = isTransferTool(tool);
  const booking = isBookingTool(tool);
  const plain = !transfer && !booking;
  const destination = tool.destination?.trim();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const warn = "flex items-center gap-1.5 text-sm font-medium text-terracotta-500";
  const editLabel = transfer
    ? destination
      ? "Edit"
      : "Set destination"
    : booking
      ? "Configure"
      : "Edit";
  const editAria = transfer
    ? `Edit transfer destination for ${tool.name}`
    : booking
      ? `Configure calendar for ${tool.name}`
      : `Edit description for ${tool.name}`;
  const close = () => setEditing(false);
  return (
    <li className="flex items-start gap-4 py-5">
      <span
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
          tool.enabled ? "bg-brand-600 text-lime-300" : "text-tertiary ring-1 ring-inset ring-ink-950/20"
        }`}
      >
        <Icon name={transfer ? "phone-outbound" : booking ? "clock" : "wrench"} className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-md font-semibold ${tool.enabled ? "text-primary" : "text-tertiary"}`}>{tool.name}</p>
          {tool.kind === "custom" && !transfer && <span className={toolTag}>Custom webhook</span>}
          {booking && <span className={toolTag}>{calendarProviderLabel[tool.calendarProvider ?? "google"]}</span>}
        </div>
        {transfer ? (
          destination ? (
            <p className="mt-1 text-md text-secondary">
              Transfers to <span className="font-semibold text-primary">{destination}</span>
              <span className="text-tertiary">. Unverified, never dialed by this demo.</span>
            </p>
          ) : (
            <p className={`mt-1 ${warn}`}>
              <Icon name="alert" className="size-4 shrink-0" />
              No destination set. Calls can’t be transferred yet.
            </p>
          )
        ) : booking ? (
          tool.calendarConnected ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-brand-700">
              <Icon name="check" className="size-4 shrink-0" />
              Connected (simulated, no live calendar backend)
            </p>
          ) : (
            <p className={`mt-1 ${warn}`}>
              <Icon name="alert" className="size-4 shrink-0" />
              Not connected. Configure a calendar before relying on this.
            </p>
          )
        ) : (
          <p className="mt-1 text-md text-secondary">
            {tool.method && tool.url ? <span className="font-mono text-sm">{tool.method} {tool.url}</span> : tool.description}
          </p>
        )}
        <div className="mt-2 flex h-9 items-center gap-1">
          {confirmingDelete ? (
            <div role="alertdialog" aria-label={`Delete tool: ${tool.name}?`} className="flex items-center gap-3">
              <span className="text-sm font-medium text-terracotta-500">Delete this tool?</span>
              <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(false)}>
                Keep it
              </Button>
              <Button size="sm" variant="destructive" onClick={onDelete}>
                Delete
              </Button>
            </div>
          ) : (
            <>
              <Button size="sm" variant="ghost" className="-ml-2.5" onClick={() => setEditing(true)} aria-label={editAria}>
                {editLabel}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(true)} aria-label={`Delete tool: ${tool.name}`}>
                Delete
              </Button>
            </>
          )}
        </div>
      </div>
      <Switch checked={tool.enabled} onChange={onToggle} label={`Tool on: ${tool.name}`} />
      {editing && (
        <Drawer
          title={transfer ? "Transfer destination" : booking ? "Calendar" : "Edit tool"}
          onClose={close}
          padBottom={false}
        >
          <div className="py-6">
            {plain && (
              <DescriptionEditor
                toolName={tool.name}
                initial={tool.description}
                onCancel={close}
                onSave={(next) => {
                  onChange({ description: next });
                  close();
                }}
              />
            )}
            {transfer && (
              <DestinationEditor
                toolName={tool.name}
                initial={tool.destination ?? ""}
                onCancel={close}
                onSave={(next) => {
                  onChange({ destination: next });
                  close();
                }}
              />
            )}
            {booking && (
              <CalendarConfigEditor
                toolName={tool.name}
                initialProvider={tool.calendarProvider ?? "google"}
                initialConnected={!!tool.calendarConnected}
                onCancel={close}
                onSave={(patch) => {
                  onChange(patch);
                  close();
                }}
              />
            )}
          </div>
        </Drawer>
      )}
    </li>
  );
}

/** Common actions a voice agent needs, so "Add a tool" isn’t a blank form. */
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
    <div className="flex flex-col gap-5 py-6">
      {available.length > 0 && (
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-ink-500">Quick add</p>
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
          <div className="flex items-center gap-3 text-[13px] font-medium text-ink-500">
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
              <p id={`${id}-dest-help`} className="mt-1.5 text-[13px] text-ink-500">
                {TRANSFER_HELP}
              </p>
            )}
            <p className="mt-1.5 text-[13px] text-ink-500">
              This demo never dials or verifies this destination — entering a number here doesn’t confirm it’s
              reachable or that whoever answers has agreed to take transferred calls.
            </p>
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
}: {
  tools: ToolDef[];
  onToolsChange: (next: ToolDef[]) => void;
  defaultAdvanced?: boolean;
}) {
  const id = useId();
  const [panel, setPanel] = useState<"add" | "curl" | "json" | null>(null);
  const [curl, setCurl] = useState("");
  const [curlError, setCurlError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<ToolDef | null>(null);
  const [droppedAuth, setDroppedAuth] = useState<string[]>([]);

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
    setDroppedAuth(parsed.headers.filter((h) => /^(authorization|proxy-authorization|x-api-key|api-key|x-auth-token|cookie)$/i.test(h)));
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

  const close = () => setPanel(null);
  const on = tools.filter((t) => t.enabled).length;
  const quick = builtinPresets.filter((p) => !tools.some((t) => t.name === p.name));
  const quickAdd = (p: Pick<ToolDef, "name" | "description">) =>
    isTransferTool(p)
      ? setPanel("add")
      : onToolsChange([
          ...tools,
          {
            id: newId("tool"),
            ...p,
            kind: "builtin",
            enabled: true,
            ...(isBookingTool(p) && { calendarProvider: "google", calendarConnected: false }),
          },
        ]);
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,440px)] xl:gap-10">
      <Section
        title="Available tools"
        icon="wrench"
        summary={tools.length === 0 ? "None yet" : `${tools.length} ${tools.length === 1 ? "tool" : "tools"} · ${on} on`}
      >
        {tools.length === 0 ? (
          <p className="py-6 text-md text-secondary">
            The agent can talk but can’t act. Start with call transfer so people can always reach a teammate, then add booking or lookups.
          </p>
        ) : (
          <ul className="divide-y divide-ink-950/10">
            {tools.map((t) => (
              <ToolRow
                key={t.id}
                tool={t}
                onToggle={(enabled) => onToolsChange(tools.map((x) => (x.id === t.id ? { ...x, enabled } : x)))}
                onChange={(patch) => onToolsChange(tools.map((x) => (x.id === t.id ? { ...x, ...patch } : x)))}
                onDelete={() => onToolsChange(tools.filter((x) => x.id !== t.id))}
              />
            ))}
          </ul>
        )}
        <div className="flex min-h-[4.5rem] items-center justify-between gap-4">
          <Button className="gap-2 rounded-full" onClick={() => setPanel("add")}>
            <Icon name="plus" className="size-4" />
            Add a tool
          </Button>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => setPanel("curl")}>
              Import from cURL
            </Button>
            {tools.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setPanel("json")}>
                View as JSON
              </Button>
            )}
          </div>
        </div>
      </Section>

      <aside className="xl:sticky xl:top-0">
        <Section title="Quick add" icon="plus" summary={quick.length === 0 ? "All added" : `${quick.length} available`}>
          {quick.length === 0 ? (
            <p className="py-5 text-md text-secondary">Every common action is already on this agent.</p>
          ) : (
            <ul className="divide-y divide-ink-950/10">
              {quick.map((p) => (
                <li key={p.name} className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="text-md font-semibold text-primary">{p.name}</p>
                    <p className="mt-0.5 text-sm text-tertiary">{p.description}</p>
                  </div>
                  <Button size="sm" variant="secondary" className="shrink-0 rounded-full" onClick={() => quickAdd(p)} aria-label={`Add ${p.name}`}>
                    Add
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </aside>

      {panel === "add" && (
        <Drawer title="Add a tool" onClose={close} padBottom={false}>
          <AddToolForm
            existing={tools}
            onCancel={close}
            onSave={(tool) => {
              onToolsChange([...tools, tool]);
              close();
            }}
          />
        </Drawer>
      )}
      {panel === "json" && (
        <Drawer title="Tools as data" onClose={close} padBottom={false}>
          <div className="py-6">
            <p className="mb-3 text-sm text-tertiary">Exactly what the agent can call, including where transfers go.</p>
            <pre
              aria-label="Tools as JSON"
              className="overflow-x-auto rounded-xl bg-ink-950 p-4 text-[13px] leading-relaxed text-paper-100"
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
    ...(t.params?.length && { parameters: Object.fromEntries(t.params.map((p) => [p, { type: "string" }])) }),
    ...(t.timeoutSec && { timeoutSec: t.timeoutSec }),
  })),
  null,
  2,
)}
            </pre>
          </div>
        </Drawer>
      )}
      {panel === "curl" && (
        <Drawer title="Import from cURL" onClose={close} padBottom={false}>
          <div className="flex flex-col gap-3 py-6">
          <FieldLabel htmlFor={`${id}-curl`} hint="We’ll infer the method, endpoint, and parameters">
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
            className="font-mono text-[13px]"
          />
          <FieldError id={`${id}-curl-err`}>{curlError}</FieldError>
          <div className="flex justify-end">
            <Button size="sm" variant="secondary" disabled={!curl.trim()} onClick={generate}>
              Generate tool from cURL
            </Button>
          </div>
          {live && (
            <div className="mt-1 flex flex-col gap-3 rounded-lg border border-success-200 bg-paper-0 p-4">
              <p className="flex items-center gap-1.5 text-[14px] font-medium text-success-700">
                <Icon name="check" className="size-3.5" />
                Added “{live.name}” to this agent’s tools
              </p>
              {droppedAuth.length > 0 && (
                <p role="status" className="rounded-md bg-warning-50 px-3 py-2 text-sm text-warning-700">
                  The {droppedAuth.join(", ")} header from your cURL was not saved. This tool will call the endpoint without credentials until a secure credential store is connected, so calls to a protected API will fail.
                </p>
              )}
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
                className="overflow-x-auto rounded-md bg-ink-950 p-3 text-[13px] leading-relaxed text-paper-100"
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
        </Drawer>
      )}
    </div>
  );
}
