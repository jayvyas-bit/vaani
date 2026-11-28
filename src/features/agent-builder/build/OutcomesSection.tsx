import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FieldError, FieldLabel, Input, Select } from "@/components/ui/Field";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Drawer, Section } from "@/components/ui/PanelCard";
import { Switch } from "@/components/ui/Switch";
import { newId } from "@/lib/useControllable";
import type { OutcomeField, OutcomeFieldType } from "@/lib/types";

const typeIcon: Record<OutcomeFieldType, IconName> = {
  text: "file",
  number: "ruler",
  boolean: "check",
  enum: "list",
};

const typeLabel: Record<OutcomeFieldType, string> = {
  text: "Text",
  number: "Number",
  boolean: "Yes / no",
  enum: "One of a list",
};

function OutcomeRow({
  field,
  onEdit,
  onDelete,
}: {
  field: OutcomeField;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  return (
    <li className="flex items-start gap-4 py-5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-lime-300">
        <Icon name={typeIcon[field.type]} className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-md font-semibold text-primary">{field.label}</p>
          <span className="rounded-full px-2.5 py-0.5 text-xs font-medium text-secondary ring-1 ring-inset ring-ink-950/20">
            {typeLabel[field.type]}
          </span>
        </div>
        {field.type === "enum" && field.options && field.options.length > 0 && (
          <p className="mt-1 text-md text-secondary">{field.options.join(" · ")}</p>
        )}
        <p className="mt-1 text-sm text-tertiary">
          {field.required
            ? field.requiredWhen?.trim()
              ? `Required when ${field.requiredWhen.trim()}`
              : "Required by end of call"
            : "Optional"}
        </p>
        <div className="mt-2 flex h-9 items-center gap-1">
          {confirmingDelete ? (
            <div role="alertdialog" aria-label="Delete this outcome field?" className="flex items-center gap-3">
              <span className="text-sm font-medium text-terracotta-500">Delete this field?</span>
              <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(false)}>
                Keep it
              </Button>
              <Button size="sm" variant="destructive" onClick={onDelete}>
                Delete
              </Button>
            </div>
          ) : (
            <>
              <Button size="sm" variant="ghost" className="-ml-2.5" onClick={onEdit} aria-label={`Edit outcome field: ${field.label}`}>
                Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(true)} aria-label={`Delete outcome field: ${field.label}`}>
                Delete
              </Button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

function OutcomeForm({
  initial,
  onCancel,
  onSave,
}: {
  initial?: OutcomeField;
  onCancel: () => void;
  onSave: (field: OutcomeField) => void;
}) {
  const id = useId();
  const [label, setLabel] = useState(initial?.label ?? "");
  const [type, setType] = useState<OutcomeFieldType>(initial?.type ?? "text");
  const [options, setOptions] = useState((initial?.options ?? []).join(", "));
  const [required, setRequired] = useState(initial?.required ?? true);
  const [requiredWhen, setRequiredWhen] = useState(initial?.requiredWhen ?? "");
  const [submitted, setSubmitted] = useState(false);

  const labelErr = submitted && !label.trim() ? "Say what this outcome captures." : null;
  const parsedOptions = options
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const optionsErr = submitted && type === "enum" && parsedOptions.length < 2 ? "List at least two options, separated by commas." : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!label.trim() || (type === "enum" && parsedOptions.length < 2)) return;
    onSave({
      id: initial?.id ?? newId("outcome"),
      label: label.trim(),
      type,
      options: type === "enum" ? parsedOptions : undefined,
      required,
      requiredWhen: required && requiredWhen.trim() ? requiredWhen.trim() : undefined,
    });
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-label={initial ? "Edit outcome field" : "Add an outcome field"}
      className="flex flex-col gap-4 py-6"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor={`${id}-label`} required>
            What the agent should report
          </FieldLabel>
          <Input
            id={`${id}-label`}
            name="label"
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            aria-invalid={!!labelErr || undefined}
            aria-describedby={labelErr ? `${id}-label-err` : undefined}
            placeholder="e.g. Appointment booked"
          />
          <FieldError id={`${id}-label-err`}>{labelErr}</FieldError>
        </div>
        <div>
          <FieldLabel htmlFor={`${id}-type`}>Answer type</FieldLabel>
          <Select id={`${id}-type`} name="type" value={type} onChange={(e) => setType(e.target.value as OutcomeFieldType)}>
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="boolean">Yes / no</option>
            <option value="enum">One of a list</option>
          </Select>
        </div>
      </div>
      {type === "enum" && (
        <div>
          <FieldLabel htmlFor={`${id}-options`} required hint="Comma-separated">
            Allowed values
          </FieldLabel>
          <Input
            id={`${id}-options`}
            name="options"
            value={options}
            onChange={(e) => setOptions(e.target.value)}
            aria-invalid={!!optionsErr || undefined}
            aria-describedby={optionsErr ? `${id}-options-err` : undefined}
            placeholder="e.g. Booked, Rescheduled, Declined"
          />
          <FieldError id={`${id}-options-err`}>{optionsErr}</FieldError>
        </div>
      )}
      <div className="flex items-center gap-3 rounded-lg border border-ink-950/10 bg-paper-0 p-3">
        <Switch checked={required} onChange={setRequired} label="Required by end of call" />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-ink-800">Required by end of call</p>
          <p className="mt-0.5 text-[13px] text-ink-500">
            Flag calls where this wasn’t captured, instead of treating it as optional.
          </p>
        </div>
      </div>
      {required && (
        <div>
          <FieldLabel htmlFor={`${id}-when`} hint="Optional">
            Only required when
          </FieldLabel>
          <Input
            id={`${id}-when`}
            name="requiredWhen"
            value={requiredWhen}
            onChange={(e) => setRequiredWhen(e.target.value)}
            placeholder="e.g. consent given is yes"
          />
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          {initial ? "Save changes" : "Save field"}
        </Button>
      </div>
    </form>
  );
}

/**
 * The output schema for a call: what the agent must capture or report by the
 * end, like appointment status or whether a callback is needed. This is
 * config only — scenarios in Test can check it, but nothing here runs a real
 * structured-output extraction against a live backend.
 */
export function OutcomesSection({
  outcomes,
  onOutcomesChange,
}: {
  outcomes: OutcomeField[];
  onOutcomesChange: (next: OutcomeField[]) => void;
  defaultAdvanced?: boolean;
}) {
  const [panel, setPanel] = useState<"add" | "json" | { editId: string } | null>(null);
  const close = () => setPanel(null);
  const editing =
    panel && typeof panel === "object" ? outcomes.find((o) => o.id === panel.editId) : undefined;

  const suggestions = ([
    { label: "Appointment booked", type: "boolean" },
    { label: "Callback needed", type: "boolean" },
    { label: "Call result", type: "enum", options: ["Resolved", "Needs follow-up", "Not interested"] },
  ] as { label: string; type: OutcomeFieldType; options?: string[] }[]).filter((x) => !outcomes.some((o) => o.label.toLowerCase() === x.label.toLowerCase()));
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,440px)] xl:gap-10">
      <Section
        title="Required outcomes"
        icon="check"
        summary={outcomes.length === 0 ? "None yet" : `${outcomes.length} ${outcomes.length === 1 ? "field" : "fields"}`}
      >
        {outcomes.length > 0 ? (
          <ul className="divide-y divide-ink-950/10">
            {outcomes.map((f) => (
              <OutcomeRow
                key={f.id}
                field={f}
                onEdit={() => setPanel({ editId: f.id })}
                onDelete={() => onOutcomesChange(outcomes.filter((x) => x.id !== f.id))}
              />
            ))}
          </ul>
        ) : (
          <p className="py-6 text-md text-secondary">
            Nothing is checked at the end of a call. Add the fields this agent should report, like appointment status or whether a callback is needed.
          </p>
        )}
        <div className="flex min-h-[4.5rem] items-center justify-between gap-4">
          <Button className="gap-2 rounded-full" onClick={() => setPanel("add")}>
            <Icon name="plus" className="size-4" />
            Add an outcome field
          </Button>
          {outcomes.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setPanel("json")}>
              View as JSON
            </Button>
          )}
        </div>
      </Section>

      <aside className="xl:sticky xl:top-0">
        <Section title="Common fields" icon="sparkles" summary={suggestions.length === 0 ? "All added" : `${suggestions.length} available`}>
          {suggestions.length === 0 ? (
            <p className="py-5 text-md text-secondary">Every suggested field is already on this agent.</p>
          ) : (
            <ul className="divide-y divide-ink-950/10">
              {suggestions.map((x) => (
                <li key={x.label} className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="text-md font-semibold text-primary">{x.label}</p>
                    <p className="mt-0.5 text-sm text-tertiary">
                      {typeLabel[x.type]}
                      {x.options ? `: ${x.options.join(", ")}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="shrink-0 rounded-full"
                    aria-label={`Add ${x.label}`}
                    onClick={() => onOutcomesChange([...outcomes, { id: newId("outcome"), label: x.label, type: x.type, options: x.options, required: true }])}
                  >
                    Add
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </aside>

      {panel === "add" && (
        <Drawer title="Add an outcome field" onClose={close} padBottom={false}>
          <OutcomeForm
            onCancel={close}
            onSave={(field) => {
              onOutcomesChange([...outcomes, field]);
              close();
            }}
          />
        </Drawer>
      )}
      {editing && (
        <Drawer title="Edit outcome field" onClose={close} padBottom={false}>
          <OutcomeForm
            key={editing.id}
            initial={editing}
            onCancel={close}
            onSave={(field) => {
              onOutcomesChange(outcomes.map((x) => (x.id === editing.id ? field : x)));
              close();
            }}
          />
        </Drawer>
      )}
      {panel === "json" && (
        <Drawer title="Outcomes as data" onClose={close} padBottom={false}>
          <div className="py-6">
            <p className="mb-3 text-sm text-tertiary">The same fields, in the form your tests and any export read them.</p>
            <pre
              aria-label="Outcomes as JSON"
              className="overflow-x-auto rounded-xl bg-ink-950 p-4 text-[13px] leading-relaxed text-paper-100"
            >
{JSON.stringify(
  outcomes.map(({ id, label, type, options, required }) => ({ id, label, type, options: options ?? null, required })),
  null,
  2,
)}
            </pre>
          </div>
        </Drawer>
      )}
    </div>
  );
}
