import { useId, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FieldError, FieldLabel, Input, Select } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { SectionCard } from "@/components/ui/SectionCard";
import { Switch } from "@/components/ui/Switch";
import { newId } from "@/lib/useControllable";
import type { OutcomeField, OutcomeFieldType } from "@/lib/types";

const typeLabel: Record<OutcomeFieldType, string> = {
  text: "Text",
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
    <div className="flex flex-col gap-2.5 py-3.5">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-ink-950">{field.label}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{typeLabel[field.type]}</Badge>
            {field.type === "enum" && field.options && field.options.length > 0 && (
              <span className="text-[13px] text-ink-500">{field.options.join(" · ")}</span>
            )}
            {field.required ? (
              <span className="text-[13px] font-medium text-amber-700">Required by end of call</span>
            ) : (
              <span className="text-[13px] text-ink-500">Optional</span>
            )}
          </div>
        </div>
      </div>
      {confirmingDelete ? (
        <div
          role="alertdialog"
          aria-label="Delete this outcome field?"
          className="flex flex-col gap-2 rounded-md border border-error-200 bg-error-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-[13px] text-ink-800">Delete this outcome field? It won’t be checked for anymore.</p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(false)}>
              Keep it
            </Button>
            <Button size="sm" variant="destructive" onClick={onDelete}>
              Delete
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="-ml-2.5" onClick={onEdit} aria-label={`Edit outcome field: ${field.label}`}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(true)} aria-label={`Delete outcome field: ${field.label}`}>
            Delete
          </Button>
        </div>
      )}
    </div>
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
    });
  };

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-label={initial ? "Edit outcome field" : "Add an outcome field"}
      className="flex flex-col gap-3 border-t border-ink-950/8 bg-paper-50 px-6 py-5 first:border-t-0"
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
  defaultAdvanced = false,
}: {
  outcomes: OutcomeField[];
  onOutcomesChange: (next: OutcomeField[]) => void;
  defaultAdvanced?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Required outcomes"
        description="For example appointment status or whether a callback is needed."
        defaultAdvancedOpen={defaultAdvanced}
        guided={
          <div>
            {outcomes.length > 0 ? (
              <div className="divide-y divide-secondary border-y border-secondary">
                {outcomes.map((f) =>
                  editingId === f.id ? (
                    <OutcomeForm
                      key={f.id}
                      initial={f}
                      onCancel={() => setEditingId(null)}
                      onSave={(field) => {
                        onOutcomesChange(outcomes.map((x) => (x.id === f.id ? field : x)));
                        setEditingId(null);
                      }}
                    />
                  ) : (
                    <OutcomeRow
                      key={f.id}
                      field={f}
                      onEdit={() => {
                        setAdding(false);
                        setEditingId(f.id);
                      }}
                      onDelete={() => {
                        onOutcomesChange(outcomes.filter((x) => x.id !== f.id));
                        if (editingId === f.id) setEditingId(null);
                      }}
                    />
                  ),
                )}
              </div>
            ) : (
              !adding && (
                <div className="flex flex-col items-start gap-4 rounded-xl border border-dashed border-primary bg-secondary px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-md font-semibold text-primary">No required outcomes yet</p>
                    <p className="mt-1 max-w-[56ch] text-sm text-tertiary">
                      Nothing is checked at the end of a call. Add the fields this agent should report, like appointment status or whether a callback is needed.
                    </p>
                  </div>
                  <Button className="shrink-0 gap-2" onClick={() => setAdding(true)}>
                    <Icon name="plus" className="size-4" />
                    Add an outcome field
                  </Button>
                </div>
              )
            )}
            {adding ? (
              <OutcomeForm
                onCancel={() => setAdding(false)}
                onSave={(field) => {
                  onOutcomesChange([...outcomes, field]);
                  setAdding(false);
                }}
              />
            ) : (
              outcomes.length === 0 ? null : <div className="pt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setEditingId(null);
                    setAdding(true);
                  }}
                >
                  <Icon name="plus" className="size-3.5" />
                  Add an outcome field
                </Button>
              </div>
            )}
          </div>
        }
        advanced={
          <div>
            <FieldLabel hint="The same fields, in the form your tests and any export read them">Outcomes as data (JSON)</FieldLabel>
            <pre
              aria-label="Outcomes as JSON"
              className="overflow-x-auto rounded-md bg-ink-950 p-3 text-[13px] leading-relaxed text-paper-100"
            >
{JSON.stringify(
  outcomes.map(({ id, label, type, options, required }) => ({
    id,
    label,
    type,
    options: options ?? null,
    required,
  })),
  null,
  2,
)}
            </pre>
          </div>
        }
      />
    </div>
  );
}
