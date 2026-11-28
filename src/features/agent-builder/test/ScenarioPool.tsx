import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FieldError, FieldLabel, Input, Textarea } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { contextSignature, evaluateScenario, type AgentContext } from "@/lib/simulate";
import type { Scenario, Verdict } from "@/lib/types";
import { formatRelative, newId, useControllable } from "@/lib/useControllable";

const verdictTone: Record<Verdict, "success" | "clay" | "amber" | "neutral"> = {
  pass: "success",
  fail: "clay",
  inconclusive: "amber",
  "not-run": "neutral",
};

const verdictLabel: Record<Verdict, string> = {
  pass: "Pass",
  fail: "Fail",
  inconclusive: "Inconclusive",
  "not-run": "Not run",
};

function ScenarioRow({
  scenario,
  running,
  stale,
}: {
  scenario: Scenario;
  running: boolean;
  /** True when the agent's config changed since this verdict last ran. */
  stale: boolean;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="min-w-0 text-[13px] font-medium text-ink-950 sm:truncate">{scenario.title}</p>
          {scenario.source === "auto-seeded" && (
            <Badge tone="neutral" className="shrink-0 gap-1">
              <Icon name="phone-inbound" className="size-3" />
              From a real call
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-[12px] text-ink-500">{scenario.criteria}</p>
        {scenario.verdict === "pass" && scenario.ruleOnly && !running && (
          <p className="mt-1.5 text-[12px] leading-snug text-ink-700">
            <span className="font-medium">Rule only: </span>
            The guardrail is written, but no system tool is connected, so this was not tested against real data.
          </p>
        )}
        {scenario.reason && !running && scenario.verdict !== "pass" && (
          <p className="mt-1.5 text-[12px] leading-snug text-ink-700">
            <span className="font-medium">Why: </span>
            {scenario.reason}
          </p>
        )}
      </div>
      <div className={`flex shrink-0 flex-col items-end gap-1.5 ${stale && !running ? "opacity-50" : ""}`}>
        {running ? (
          <Badge tone="neutral" className="gap-1">
            <Icon name="loader" className="size-3 animate-spin" strokeWidth={2.5} />
            Running…
          </Badge>
        ) : (
          <Badge tone={verdictTone[scenario.verdict]} dot={scenario.verdict !== "not-run"}>
            {scenario.verdict === "pass" && scenario.ruleOnly ? "Pass (rule only)" : verdictLabel[scenario.verdict]}
          </Badge>
        )}
      </div>
    </div>
  );
}

function AddScenarioForm({
  other = "caller",
  onCancel,
  onSave,
}: {
  other?: "caller" | "recipient";
  onCancel: () => void;
  onSave: (s: Scenario) => void;
}) {
  const id = useId();
  const Other = other === "caller" ? "Caller" : "Recipient";
  const [title, setTitle] = useState("");
  const [criteria, setCriteria] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const titleErr = submitted && !title.trim() ? `Describe what the ${other} does.` : null;
  const criteriaErr = submitted && !criteria.trim() ? "Say what a passing reply looks like." : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!title.trim() || !criteria.trim()) return;
    onSave({
      id: newId("sc"),
      title: title.trim(),
      criteria: criteria.trim(),
      source: "manual",
      verdict: "not-run",
    });
  };

  return (
    <form onSubmit={submit} noValidate aria-label="Add a test scenario" className="flex flex-col gap-3 p-4">
      <div>
        <FieldLabel htmlFor={`${id}-title`} required>
          {Other} does
        </FieldLabel>
        <Input
          id={`${id}-title`}
          name="scenarioTitle"
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={!!titleErr || undefined}
          aria-describedby={titleErr ? `${id}-title-err` : undefined}
          placeholder={`e.g. ${Other} asks for a 20% discount`}
        />
        <FieldError id={`${id}-title-err`}>{titleErr}</FieldError>
      </div>
      <div>
        <FieldLabel htmlFor={`${id}-criteria`} required>
          Passes when the agent
        </FieldLabel>
        <Textarea
          id={`${id}-criteria`}
          name="scenarioCriteria"
          rows={2}
          value={criteria}
          onChange={(e) => setCriteria(e.target.value)}
          aria-invalid={!!criteriaErr || undefined}
          aria-describedby={criteriaErr ? `${id}-criteria-err` : undefined}
          placeholder="e.g. Declines and offers the standard 10% instead"
        />
        <FieldError id={`${id}-criteria-err`}>{criteriaErr}</FieldError>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          Add test scenario
        </Button>
      </div>
    </form>
  );
}

export function ScenarioPool({
  scenarios,
  onScenariosChange,
  context,
}: {
  scenarios: Scenario[];
  onScenariosChange?: (next: Scenario[]) => void;
  /** The agent config the scenarios are evaluated against. Without it, Run all is disabled. */
  context?: AgentContext;
}) {
  const [list, setList] = useControllable(scenarios, onScenariosChange);
  const [running, setRunning] = useState(false);
  const [adding, setAdding] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const timer = useRef<number | undefined>(undefined);

  // Re-render periodically so "Just now" ages into "2 minutes ago".
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      window.clearInterval(t);
      window.clearTimeout(timer.current);
    };
  }, []);

  // Read the latest list/context when the simulated run finishes, not the
  // snapshot from when it started.
  const latest = useRef({ list, context, setList });
  useEffect(() => {
    latest.current = { list, context, setList };
  });

  const runAll = () => {
    if (!context || running || list.length === 0) return;
    setRunning(true);
    timer.current = window.setTimeout(() => {
      const { list: current, context: ctx, setList: set } = latest.current;
      const at = Date.now();
      if (ctx) {
        const signature = contextSignature(ctx);
        set(
          current.map((s) => {
            const { verdict, reason, ruleOnly } = evaluateScenario(s, ctx);
            return { ...s, verdict, reason, ruleOnly, lastRunAt: at, lastRunSignature: signature };
          }),
        );
      }
      setNow(at);
      setRunning(false);
    }, 900);
  };

  const passCount = list.filter((s) => s.verdict === "pass").length;
  const failCount = list.filter((s) => s.verdict === "fail").length;
  const inconclusiveCount = list.filter((s) => s.verdict === "inconclusive").length;
  const notRunCount = list.filter((s) => s.verdict === "not-run").length;
  const other = context?.agent.direction === "outbound" ? "recipient" : "caller";

  const currentSignature = context ? contextSignature(context) : undefined;
  const isStale = (s: Scenario) =>
    s.verdict !== "not-run" && !!s.lastRunSignature && s.lastRunSignature !== currentSignature;
  const lastRunAt = list.reduce((m, s) => Math.max(m, s.lastRunAt ?? 0), 0);
  const staleCount = list.filter(isStale).length;

  return (
    <div className="flex min-h-[360px] flex-col rounded-lg border border-ink-950/10 bg-paper-0 lg:h-full lg:min-h-0">
      <div className="border-b border-ink-950/10 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-ink-950">Test scenarios</h2>
          <Button
            size="sm"
            variant="secondary"
            className="gap-1.5"
            onClick={runAll}
            disabled={!context || running || list.length === 0}
          >
            <Icon name="play" className="size-3.5" />
            {running ? "Running…" : "Run all"}
          </Button>
        </div>
        <p className="mt-1 text-[12px] text-ink-500" aria-live="polite">
          {list.length > 0 && (
            <span className="font-medium text-ink-700">
              {[
                `${passCount} pass`,
                `${failCount} fail`,
                inconclusiveCount > 0 && `${inconclusiveCount} inconclusive`,
                notRunCount > 0 && `${notRunCount} not run`,
              ]
                .filter(Boolean)
                .join(" · ")}
              {lastRunAt ? " · " : ""}
            </span>
          )}
          {list.length > 0 && lastRunAt ? `Last run ${formatRelative(lastRunAt, now)}` : null}
        </p>
        {staleCount > 0 && (
          <p className="mt-1.5 flex items-center gap-1 text-[12px] font-medium text-amber-700" aria-live="polite">
            <Icon name="alert" className="size-3" />
            {staleCount === 1 ? "1 result is" : `${staleCount} results are`} out of date. Run all to refresh.
          </p>
        )}
      </div>
      <div className="flex-1 divide-y divide-ink-950/8 overflow-y-auto">
        {list.length === 0 && !adding && (
          <p className="px-4 py-5 text-[13px] text-ink-500">
            No test scenarios yet. Add the calls you’re most worried about, then run them after every change.
          </p>
        )}
        {list.map((s) => (
          <ScenarioRow key={s.id} scenario={s} running={running} stale={isStale(s)} />
        ))}
      </div>
      <div className="border-t border-ink-950/10">
        {adding ? (
          <AddScenarioForm
            other={other}
            onCancel={() => setAdding(false)}
            onSave={(s) => {
              setList([...list, s]);
              setAdding(false);
            }}
          />
        ) : (
          <div className="p-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center gap-1.5"
              onClick={() => setAdding(true)}
            >
              <Icon name="plus" className="size-3.5" />
              Add a test scenario
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
