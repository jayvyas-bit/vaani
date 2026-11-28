import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { FieldError, FieldLabel, Input, Select } from "@/components/ui/Field";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Drawer, Section } from "@/components/ui/PanelCard";
import { Switch } from "@/components/ui/Switch";
import { HUMOR_TOGGLE_ID } from "@/lib/persona";
import { newId } from "@/lib/useControllable";
import type { BusinessRule, LimitType, SafetyToggle } from "@/lib/types";

const limitTypeLabel: Record<LimitType, string> = {
  discount_limit: "Discount limit",
  forbidden_promise: "Never do",
  escalation_trigger: "Hand to a person",
  payment_plan_limit: "Payment plan limit",
  follow_up_limit: "Follow-up limit",
};

const limitTypeIcon: Record<LimitType, IconName> = {
  discount_limit: "ruler",
  forbidden_promise: "x",
  escalation_trigger: "user",
  payment_plan_limit: "ruler",
  follow_up_limit: "clock",
};

/** Outlined, never tinted: the type reads from the icon and the label. */
const limitTypeTag: Record<LimitType, string> = {
  discount_limit: "text-secondary ring-ink-950/20",
  forbidden_promise: "text-terracotta-500 ring-terracotta-500",
  escalation_trigger: "text-brand-700 ring-brand-600",
  payment_plan_limit: "text-secondary ring-ink-950/20",
  follow_up_limit: "text-brand-700 ring-brand-600",
};

const hasLimit = (t: LimitType) => t === "discount_limit" || t === "payment_plan_limit";

function sentenceEnd(text: string) {
  const t = text.trim().replace(/[,;:\s]+$/, "");
  return /[.!?…”"]$/.test(t) ? t : `${t}.`;
}

function capitalize(text: string) {
  const t = text.trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Lower-case the first letter unless it starts an acronym ("ID", "ACH"). */
function lowerFirst(text: string) {
  const t = text.trim();
  return /^[A-Z]{2}/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1);
}

/**
 * A saved rule as one plain sentence — the condition, then what the agent does:
 * "If the caller mentions swelling → Offer a same-day slot."
 */
export function ruleSentence(
  rule: Pick<BusinessRule, "limitType" | "label" | "threshold" | "priceFloor" | "action">,
) {
  const label = rule.label.trim().replace(/[.!]+$/, "");
  const action = sentenceEnd(capitalize(rule.action));
  const threshold = rule.threshold?.trim();
  const floor = rule.priceFloor?.trim();
  switch (rule.limitType) {
    case "forbidden_promise":
      return {
        condition: threshold
          ? `${sentenceEnd(capitalize(label))} If it comes up (${threshold})`
          : `${sentenceEnd(capitalize(label))} If it comes up`,
        action,
      };
    case "escalation_trigger": {
      const body = /^(if|when|whenever)\b/i.test(label) ? capitalize(label) : `If ${lowerFirst(label)}`;
      return { condition: threshold ? `${body} (${threshold})` : body, action };
    }
    case "follow_up_limit": {
      const body = /^(if|when|whenever|after)\b/i.test(label) ? capitalize(label) : `If ${lowerFirst(label)}`;
      return { condition: threshold ? `${body} (${threshold})` : body, action };
    }
    default: {
      const limitBits = [threshold, floor ? `never below ${floor} per item` : null].filter(Boolean).join(", ");
      return {
        condition: limitBits ? `${capitalize(label)}: ${sentenceEnd(limitBits)} Within this limit` : capitalize(label),
        action,
      };
    }
  }
}

function RuleSentence({
  rule,
}: {
  rule: Pick<BusinessRule, "limitType" | "label" | "threshold" | "priceFloor" | "action">;
}) {
  const { condition, action } = ruleSentence(rule);
  return (
    <>
      {condition} <span aria-hidden="true">→</span>
      <span className="sr-only">, then:</span> <span className="font-semibold">{action}</span>
    </>
  );
}

function BusinessRuleRow({
  rule,
  onToggle,
  onEdit,
  onDelete,
}: {
  rule: BusinessRule;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { condition, action } = ruleSentence(rule);
  const btn =
    "h-9 rounded-lg px-3 text-sm font-medium text-secondary outline-focus-ring hover:bg-primary_hover focus-visible:outline-2";
  return (
    <li className="flex items-start gap-4 py-5">
      <span
        aria-hidden="true"
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${rule.enabled ? "bg-brand-600 text-lime-300" : "bg-paper-50 text-fg-quaternary ring-1 ring-inset ring-ink-950/15"}`}
      >
        <Icon name={limitTypeIcon[rule.limitType]} className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex h-6 items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${limitTypeTag[rule.limitType]}`}
          >
            {limitTypeLabel[rule.limitType]}
          </span>
          {!rule.enabled && (
            <span className="text-sm text-tertiary">Off. The agent ignores this rule.</span>
          )}
        </div>
        <p className={`mt-2 text-md leading-snug ${rule.enabled ? "text-secondary" : "text-tertiary"}`}>
          {condition}
        </p>
        <p
          className={`mt-1.5 text-md font-semibold leading-snug ${rule.enabled ? "text-primary" : "text-tertiary"}`}
        >
          <span className="sr-only">Then: </span>
          <span aria-hidden="true" className="mr-1.5 text-fg-quaternary">→</span>
          {action}
        </p>
        <div className="-ml-3 mt-2 flex h-9 items-center gap-1">
          {confirmingDelete ? (
            <div role="alertdialog" aria-label="Delete this rule?" className="flex items-center gap-1">
              <span className="px-3 text-sm font-medium text-terracotta-500">Delete this rule?</span>
              <button type="button" className={btn} onClick={() => setConfirmingDelete(false)}>
                Keep it
              </button>
              <button
                type="button"
                className="h-9 rounded-lg bg-terracotta-500 px-3 text-sm font-semibold text-white outline-focus-ring hover:opacity-90 focus-visible:outline-2"
                onClick={onDelete}
              >
                Delete
              </button>
            </div>
          ) : (
            <>
              <button type="button" className={btn} onClick={onEdit} aria-label={`Edit rule: ${rule.label}`}>
                Edit
              </button>
              <button
                type="button"
                className={btn}
                onClick={() => setConfirmingDelete(true)}
                aria-label={`Delete rule: ${rule.label}`}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
      <Switch checked={rule.enabled} onChange={onToggle} label={`Rule on: ${rule.label}`} />
    </li>
  );
}

const labelPlaceholder: Record<LimitType, string> = {
  forbidden_promise: "e.g. Never promise same-day refunds",
  escalation_trigger: "e.g. The caller asks for a manager",
  discount_limit: "e.g. Loyalty discount",
  payment_plan_limit: "e.g. Payment plans the agent can offer alone",
  follow_up_limit: "e.g. Lead doesn’t answer after 3 attempts",
};

/** Inline, flat form region in the rules list — used both to add and to edit a rule. */
function RuleForm({
  initial,
  onCancel,
  onSave,
}: {
  initial?: BusinessRule;
  onCancel: () => void;
  onSave: (rule: BusinessRule) => void;
}) {
  const id = useId();
  const [limitType, setLimitType] = useState<LimitType>(initial?.limitType ?? "forbidden_promise");
  const [threshold, setThreshold] = useState(initial?.threshold ?? "");
  const [priceFloor, setPriceFloor] = useState(initial?.priceFloor ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [action, setAction] = useState(initial?.action ?? "");
  const [submitted, setSubmitted] = useState(false);

  const limitNeeded = hasLimit(limitType);
  const isDiscount = limitType === "discount_limit";
  const labelErr = submitted && !label.trim() ? "Describe the rule in a sentence." : null;
  const actionErr = submitted && !action.trim() ? "Say what the agent should do." : null;
  const thresholdErr =
    submitted && limitNeeded
      ? !threshold.trim()
        ? "Say what the limit is, e.g. up to 15% off."
        : !/\d/.test(threshold)
          ? "Include a number, e.g. 20% or $25/mo."
          : null
      : null;
  const floorErr =
    submitted && isDiscount && priceFloor.trim() && !/\d/.test(priceFloor)
      ? "Include a dollar amount, e.g. $45."
      : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (
      !label.trim() ||
      !action.trim() ||
      (limitNeeded && (!threshold.trim() || !/\d/.test(threshold))) ||
      (isDiscount && priceFloor.trim() && !/\d/.test(priceFloor))
    )
      return;
    onSave({
      id: initial?.id ?? newId("rule"),
      limitType,
      label: label.trim(),
      threshold: threshold.trim() || undefined,
      priceFloor: isDiscount ? priceFloor.trim() || undefined : undefined,
      action: action.trim(),
      enabled: initial?.enabled ?? true,
    });
  };

  const preview = label.trim() && action.trim() ? { limitType, label, threshold, priceFloor, action } : null;

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-label={initial ? "Edit guardrail" : "Add a guardrail"}
      className="flex flex-col gap-4 py-6"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor={`${id}-type`}>Rule type</FieldLabel>
          <Select
            id={`${id}-type`}
            name="limitType"
            value={limitType}
            onChange={(e) => setLimitType(e.target.value as LimitType)}
          >
            <option value="forbidden_promise">Never do</option>
            <option value="escalation_trigger">Hand to a person</option>
            <option value="discount_limit">Discount limit</option>
            <option value="payment_plan_limit">Payment plan limit</option>
            <option value="follow_up_limit">Follow-up limit</option>
          </Select>
        </div>
        <div>
          <FieldLabel
            htmlFor={`${id}-threshold`}
            required={limitNeeded}
          >
            {limitNeeded ? "Limit" : "Details (optional)"}
          </FieldLabel>
          <Input
            id={`${id}-threshold`}
            name="threshold"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            aria-invalid={!!thresholdErr || undefined}
            aria-describedby={thresholdErr ? `${id}-threshold-err` : undefined}
            placeholder={
              limitType === "payment_plan_limit"
                ? "e.g. Up to 6 months, min $25/mo"
                : limitType === "discount_limit"
                  ? "e.g. Up to 15% off"
                  : limitType === "follow_up_limit"
                    ? "e.g. After 3 attempts, 24h apart"
                    : "e.g. Pain ≥ 7 / 10"
            }
          />
          <FieldError id={`${id}-threshold-err`}>{thresholdErr}</FieldError>
        </div>
      </div>
      {isDiscount && (
        <div>
          <FieldLabel htmlFor={`${id}-floor`} hint="Optional. Never discount below this, per item">
            Price floor (per item)
          </FieldLabel>
          <Input
            id={`${id}-floor`}
            name="priceFloor"
            value={priceFloor}
            onChange={(e) => setPriceFloor(e.target.value)}
            aria-invalid={!!floorErr || undefined}
            aria-describedby={floorErr ? `${id}-floor-err` : undefined}
            placeholder="e.g. $45"
          />
          <FieldError id={`${id}-floor-err`}>{floorErr}</FieldError>
        </div>
      )}
      <div>
        <FieldLabel htmlFor={`${id}-label`} required>
          {limitType === "escalation_trigger" ? "When this happens" : "In plain language"}
        </FieldLabel>
        <Input
          id={`${id}-label`}
          name="label"
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          aria-invalid={!!labelErr || undefined}
          aria-describedby={labelErr ? `${id}-label-err` : undefined}
          placeholder={labelPlaceholder[limitType]}
        />
        <FieldError id={`${id}-label-err`}>{labelErr}</FieldError>
      </div>
      <div>
        <FieldLabel htmlFor={`${id}-action`} required>
          {limitNeeded ? "What the agent does within the limit" : "What the agent does instead"}
        </FieldLabel>
        <Input
          id={`${id}-action`}
          name="action"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          aria-invalid={!!actionErr || undefined}
          aria-describedby={actionErr ? `${id}-action-err` : undefined}
          placeholder="e.g. Offer to have a teammate call them back"
        />
        <FieldError id={`${id}-action-err`}>{actionErr}</FieldError>
      </div>
      {preview && (
        <p className="rounded-xl px-4 py-3 text-sm text-secondary ring-1 ring-inset ring-ink-950/15">
          <span className="font-medium text-tertiary">Reads as: </span>
          <RuleSentence rule={preview} />
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          {initial ? "Save changes" : "Save rule"}
        </Button>
      </div>
    </form>
  );
}

export function GuardrailsSection({
  safety,
  businessRules,
  onSafetyChange,
  onBusinessRulesChange,
}: {
  safety: SafetyToggle[];
  businessRules: BusinessRule[];
  onSafetyChange: (next: SafetyToggle[]) => void;
  onBusinessRulesChange: (next: BusinessRule[]) => void;
  defaultAdvanced?: boolean;
}) {
  // One drawer at a time: add a rule, edit one, or read them as JSON. Nothing expands in the page.
  const [panel, setPanel] = useState<"add" | "json" | { editId: string } | null>(null);
  // Humor is a tone choice and lives in Persona.
  const shownSafety = safety.filter((s) => s.id !== HUMOR_TOGGLE_ID);
  const onCount = businessRules.filter((r) => r.enabled).length;
  const editing =
    panel && typeof panel === "object" ? businessRules.find((r) => r.id === panel.editId) : undefined;
  const close = () => setPanel(null);

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,440px)] xl:gap-10">
      <div className="min-w-0">
        <Section
          title="Your rules"
          icon="shield"
          summary={
            businessRules.length === 0
              ? "None yet"
              : `${businessRules.length} ${businessRules.length === 1 ? "rule" : "rules"} · ${onCount} on`
          }
        >
          {businessRules.length > 0 ? (
            <ul className="divide-y divide-ink-950/10">
              {businessRules.map((r) => (
                <BusinessRuleRow
                  key={r.id}
                  rule={r}
                  onToggle={(enabled) =>
                    onBusinessRulesChange(businessRules.map((x) => (x.id === r.id ? { ...x, enabled } : x)))
                  }
                  onEdit={() => setPanel({ editId: r.id })}
                  onDelete={() => onBusinessRulesChange(businessRules.filter((x) => x.id !== r.id))}
                />
              ))}
            </ul>
          ) : (
            <p className="py-6 text-md text-tertiary">
              No rules yet, so the agent only follows its persona. Add the first thing it must never do on a
              call, like quoting a price or promising a refund.
            </p>
          )}
          <div className="flex min-h-[4.5rem] items-center justify-between gap-4 py-4">
            <button
              type="button"
              onClick={() => setPanel("add")}
              aria-haspopup="dialog"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-brand-600 px-5 text-sm font-semibold text-white outline-focus-ring hover:bg-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <Icon name="plus" className="size-4" />
              Add a guardrail
            </button>
            {businessRules.length > 0 && (
              <button
                type="button"
                onClick={() => setPanel("json")}
                aria-haspopup="dialog"
                className="h-11 rounded-lg px-3 text-sm font-medium text-secondary outline-focus-ring hover:bg-primary_hover focus-visible:outline-2"
              >
                View as JSON
              </button>
            )}
          </div>
        </Section>
      </div>

      <aside className="xl:sticky xl:top-0">
        <Section
          title="Content safety"
          icon="lock"
          summary={`${shownSafety.filter((s) => s.enabled).length} of ${shownSafety.length} on`}
        >
          <p className="py-4 text-sm text-tertiary">
            Protections that apply to every agent. Required ones can’t be turned off.
          </p>
          {shownSafety.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="text-md font-semibold text-primary">{s.label}</p>
                <p className="mt-0.5 text-sm text-tertiary">{s.description}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                {s.locked && (
                  <span className="flex items-center gap-1 text-sm font-medium text-tertiary">
                    <Icon name="lock" className="size-3.5" />
                    Required
                  </span>
                )}
                <Switch
                  checked={s.enabled}
                  disabled={s.locked}
                  label={s.label}
                  onChange={
                    s.locked
                      ? undefined
                      : (enabled) => onSafetyChange(safety.map((x) => (x.id === s.id ? { ...x, enabled } : x)))
                  }
                />
              </div>
            </div>
          ))}
        </Section>
      </aside>

      {panel === "add" && (
        <Drawer title="Add a guardrail" onClose={close} padBottom={false}>
          <RuleForm
            onCancel={close}
            onSave={(rule) => {
              onBusinessRulesChange([...businessRules, rule]);
              close();
            }}
          />
        </Drawer>
      )}
      {editing && (
        <Drawer title="Edit guardrail" onClose={close} padBottom={false}>
          <RuleForm
            key={editing.id}
            initial={editing}
            onCancel={close}
            onSave={(rule) => {
              onBusinessRulesChange(businessRules.map((x) => (x.id === editing.id ? rule : x)));
              close();
            }}
          />
        </Drawer>
      )}
      {panel === "json" && (
        <Drawer title="Rules as data" onClose={close} padBottom={false}>
          <div className="py-6">
            <p className="mb-3 text-sm text-tertiary">The same rules, in the form the agent and your tests read them.</p>
            <pre
              aria-label="Guardrails as JSON"
              className="overflow-x-auto rounded-xl bg-ink-950 p-4 text-sm leading-relaxed text-paper-100"
            >
{JSON.stringify(
  businessRules.map(({ id, limitType, label, threshold, priceFloor, action, enabled }) => ({
    id,
    limitType,
    label,
    threshold: threshold ?? null,
    priceFloor: priceFloor ?? null,
    action,
    enabled,
  })),
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
