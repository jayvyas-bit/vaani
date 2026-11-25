import { useId, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FieldError, FieldLabel, Input, Select } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { SectionCard } from "@/components/ui/SectionCard";
import { Switch } from "@/components/ui/Switch";
import { HUMOR_TOGGLE_ID } from "@/lib/persona";
import { newId } from "@/lib/useControllable";
import type { BusinessRule, LimitType, SafetyToggle } from "@/lib/types";

const limitTypeLabel: Record<LimitType, string> = {
  discount_limit: "Discount limit",
  forbidden_promise: "Never do",
  escalation_trigger: "Hand to a person",
  payment_plan_limit: "Payment plan limit",
};

const limitTypeTone: Record<LimitType, "accent" | "clay" | "amber" | "neutral"> = {
  discount_limit: "neutral",
  forbidden_promise: "clay",
  escalation_trigger: "amber",
  payment_plan_limit: "neutral",
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
export function ruleSentence(rule: Pick<BusinessRule, "limitType" | "label" | "threshold" | "action">) {
  const label = rule.label.trim().replace(/[.!]+$/, "");
  const action = sentenceEnd(capitalize(rule.action));
  const threshold = rule.threshold?.trim();
  switch (rule.limitType) {
    case "forbidden_promise":
      return { condition: `${sentenceEnd(capitalize(label))} If it comes up`, action };
    case "escalation_trigger": {
      const body = /^(if|when|whenever)\b/i.test(label) ? capitalize(label) : `If ${lowerFirst(label)}`;
      return { condition: threshold ? `${body} (${threshold})` : body, action };
    }
    default:
      return {
        condition: threshold ? `${capitalize(label)}: ${sentenceEnd(threshold)} Within this limit` : capitalize(label),
        action,
      };
  }
}

function RuleSentence({ rule }: { rule: Pick<BusinessRule, "limitType" | "label" | "threshold" | "action"> }) {
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
  return (
    <div className="flex flex-col gap-2.5 px-6 py-3.5">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className={`text-[13.5px] leading-snug ${rule.enabled ? "text-ink-950" : "text-ink-500"}`}>
            <RuleSentence rule={rule} />
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge tone={limitTypeTone[rule.limitType]}>{limitTypeLabel[rule.limitType]}</Badge>
            {!rule.enabled && <span className="text-[12px] text-ink-500">Off — the agent ignores this rule</span>}
          </div>
        </div>
        <Switch checked={rule.enabled} onChange={onToggle} label={`Rule on: ${rule.label}`} />
      </div>
      {confirmingDelete ? (
        <div
          role="alertdialog"
          aria-label="Delete this rule?"
          className="flex flex-col gap-2 rounded-md border border-error-200 bg-error-50 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-[12.5px] text-ink-800">Delete this rule? The agent stops following it right away.</p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(false)}>
              Keep it
            </Button>
            <Button size="sm" variant="destructive" onClick={onDelete}>
              Delete rule
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="-ml-2.5" onClick={onEdit} aria-label={`Edit rule: ${rule.label}`}>
            Edit
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirmingDelete(true)}
            aria-label={`Delete rule: ${rule.label}`}
          >
            Delete
          </Button>
        </div>
      )}
    </div>
  );
}

const labelPlaceholder: Record<LimitType, string> = {
  forbidden_promise: "e.g. Never promise same-day refunds",
  escalation_trigger: "e.g. The caller asks for a manager",
  discount_limit: "e.g. Loyalty discount",
  payment_plan_limit: "e.g. Payment plans the agent can offer alone",
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
  const [label, setLabel] = useState(initial?.label ?? "");
  const [action, setAction] = useState(initial?.action ?? "");
  const [submitted, setSubmitted] = useState(false);

  const limitNeeded = hasLimit(limitType);
  const labelErr = submitted && !label.trim() ? "Describe the rule in a sentence." : null;
  const actionErr = submitted && !action.trim() ? "Say what the agent should do." : null;
  const thresholdErr = submitted && limitNeeded && !threshold.trim() ? "Say what the limit is, e.g. up to 15% off." : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!label.trim() || !action.trim() || (limitNeeded && !threshold.trim())) return;
    onSave({
      id: initial?.id ?? newId("rule"),
      limitType,
      label: label.trim(),
      threshold: threshold.trim() || undefined,
      action: action.trim(),
      enabled: initial?.enabled ?? true,
    });
  };

  const preview = label.trim() && action.trim() ? { limitType, label, threshold, action } : null;

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-label={initial ? "Edit business rule" : "Add a business rule"}
      className="flex flex-col gap-3 border-t border-ink-950/8 bg-paper-50 px-6 py-5 first:border-t-0"
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
          </Select>
        </div>
        <div>
          <FieldLabel
            htmlFor={`${id}-threshold`}
            required={limitNeeded}
            hint={limitNeeded ? undefined : "Optional"}
          >
            {limitNeeded ? "Limit" : "Details"}
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
                  : "e.g. Pain ≥ 7 / 10"
            }
          />
          <FieldError id={`${id}-threshold-err`}>{thresholdErr}</FieldError>
        </div>
      </div>
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
        <p className="rounded-md border border-ink-950/8 bg-paper-0 px-3 py-2 text-[12.5px] text-ink-700">
          <span className="font-medium text-ink-500">Reads as: </span>
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
  defaultAdvanced = false,
}: {
  safety: SafetyToggle[];
  businessRules: BusinessRule[];
  onSafetyChange: (next: SafetyToggle[]) => void;
  onBusinessRulesChange: (next: BusinessRule[]) => void;
  defaultAdvanced?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // Humor is a tone choice and lives in Persona.
  const shownSafety = safety.filter((s) => s.id !== HUMOR_TOGGLE_ID);

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Business rules"
        description="Things this agent must never do, or must hand to a person."
        defaultAdvancedOpen={defaultAdvanced}
        guided={
          <div className="-mx-6 -mb-6 mt-1 border-t border-ink-950/8">
            {businessRules.length > 0 ? (
              <div className="divide-y divide-ink-950/8">
                {businessRules.map((r) =>
                  editingId === r.id ? (
                    <RuleForm
                      key={r.id}
                      initial={r}
                      onCancel={() => setEditingId(null)}
                      onSave={(rule) => {
                        onBusinessRulesChange(businessRules.map((x) => (x.id === r.id ? rule : x)));
                        setEditingId(null);
                      }}
                    />
                  ) : (
                    <BusinessRuleRow
                      key={r.id}
                      rule={r}
                      onToggle={(enabled) =>
                        onBusinessRulesChange(businessRules.map((x) => (x.id === r.id ? { ...x, enabled } : x)))
                      }
                      onEdit={() => {
                        setAdding(false);
                        setEditingId(r.id);
                      }}
                      onDelete={() => {
                        onBusinessRulesChange(businessRules.filter((x) => x.id !== r.id));
                        if (editingId === r.id) setEditingId(null);
                      }}
                    />
                  ),
                )}
              </div>
            ) : (
              !adding && (
                <p className="px-6 pt-5 text-[13px] text-ink-500">
                  No rules yet, so the agent only follows its persona. Add the first thing it must never
                  do on a call, like quoting a price or promising a refund.
                </p>
              )
            )}
            {adding ? (
              <RuleForm
                onCancel={() => setAdding(false)}
                onSave={(rule) => {
                  onBusinessRulesChange([...businessRules, rule]);
                  setAdding(false);
                }}
              />
            ) : (
              <div className={`px-6 pb-5 ${businessRules.length > 0 ? "border-t border-ink-950/8 pt-4" : "pt-4"}`}>
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
                  Add a business rule
                </Button>
              </div>
            )}
          </div>
        }
        advanced={
          <div>
            <FieldLabel hint="The same rules, in the form the agent and your tests read them">Rules as data (JSON)</FieldLabel>
            <pre
              aria-label="Business rules as JSON"
              className="overflow-x-auto rounded-md bg-ink-950 p-3 text-[12px] leading-relaxed text-paper-100"
            >
{JSON.stringify(
  businessRules.map(({ id, limitType, label, threshold, action, enabled }) => ({
    id,
    limitType,
    label,
    threshold: threshold ?? null,
    action,
    enabled,
  })),
  null,
  2,
)}
            </pre>
          </div>
        }
      />

      <SectionCard
        title="Content safety"
        description="Protections that apply to every agent. Required ones can't be turned off."
        quiet
        guided={
          <div className="-mx-6 -mb-4 divide-y divide-ink-950/8 border-t border-ink-950/8">
            {shownSafety.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-4 px-6 py-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-ink-950">{s.label}</p>
                  <p className="text-[12.5px] text-ink-500">{s.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2.5">
                  {s.locked && (
                    <span className="flex items-center gap-1 text-[12px] font-medium text-ink-400">
                      <Icon name="lock" className="size-3" />
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
          </div>
        }
      />
    </div>
  );
}
