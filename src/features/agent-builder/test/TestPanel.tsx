import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Field";
import { simulateReply, type AgentContext } from "@/lib/simulate";
import type { Agent, TranscriptTurn } from "@/lib/types";
import { newId } from "@/lib/useControllable";

type Mode = "call" | "chat";
type Session = "idle" | "live" | "ended";

export interface FlagDetails {
  /** What the caller (or recipient) said right before the flagged reply, if anything. */
  callerLine?: string;
}

/**
 * Opens idle: nothing plays until you start a test. The scripted transcript is
 * only shown when asked for, and is always labeled "Sample conversation".
 */
export function TestPanel({
  agent,
  transcript,
  context,
  onFlag,
  initialView = "idle",
}: {
  agent: Agent;
  /** A sample conversation, shown only when the viewer opts in. */
  transcript: TranscriptTurn[];
  /** Rules, tools and knowledge the simulated replies are drawn from. */
  context?: AgentContext;
  /** Called when a reply is flagged — the screen turns it into a test scenario. */
  onFlag?: (turn: TranscriptTurn, details: FlagDetails) => void;
  /** Canvas use: open with the sample conversation already showing. */
  initialView?: "idle" | "sample";
}) {
  const inputId = useId();
  const [mode, setMode] = useState<Mode>("call");
  const [session, setSession] = useState<Session>("idle");
  const [showSample, setShowSample] = useState(initialView === "sample");
  const [elapsed, setElapsed] = useState(0);
  const [flagged, setFlagged] = useState<Set<string>>(() => new Set());
  const [draft, setDraft] = useState("");
  const [conversation, setConversation] = useState<TranscriptTurn[]>([]);
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const replyTimer = useRef<number | undefined>(undefined);
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;
  const other = agent.direction === "outbound" ? "recipient" : "caller";

  const speak = (text: string) => {
    if (!canSpeak || mode !== "call") return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  };
  const stopSpeaking = () => {
    if (canSpeak) window.speechSynthesis.cancel();
  };

  useEffect(() => {
    if (session !== "live" || mode !== "call") return;
    const t = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [session, mode]);

  useEffect(
    () => () => {
      window.clearTimeout(replyTimer.current);
      if (canSpeak) window.speechSynthesis.cancel();
    },
    [canSpeak],
  );

  const sampleShown = session === "idle" && showSample;
  const turns = session === "idle" ? (showSample ? transcript : []) : conversation;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns.length, typing]);

  const clock = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const lastAgentIndex = turns.map((t) => t.speaker).lastIndexOf("agent");
  const lastAgentTurn = lastAgentIndex >= 0 ? turns[lastAgentIndex] : undefined;
  const lastFlagged = lastAgentTurn ? flagged.has(lastAgentTurn.id) : false;

  const start = () => {
    window.clearTimeout(replyTimer.current);
    setTyping(false);
    setShowSample(false);
    setElapsed(0);
    setConversation([{ id: newId("test"), speaker: "agent", text: agent.greeting }]);
    setSession("live");
    speak(agent.greeting);
  };

  const end = () => {
    window.clearTimeout(replyTimer.current);
    setTyping(false);
    stopSpeaking();
    setSession("ended");
  };

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    window.clearTimeout(replyTimer.current);
    setTyping(false);
    stopSpeaking();
    setMode(next);
    setSession("idle");
    setConversation([]);
  };

  const send = (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || typing || session !== "live") return;
    setConversation((c) => [...c, { id: newId("test"), speaker: "caller", text }]);
    setDraft("");
    setTyping(true);
    const ctx: AgentContext = context ?? { agent, rules: [], tools: [], knowledge: [] };
    replyTimer.current = window.setTimeout(() => {
      const reply = simulateReply(text, ctx);
      setConversation((c) => [...c, { id: newId("test"), speaker: "agent", text: reply }]);
      setTyping(false);
      speak(reply);
    }, 650);
  };

  const flagLast = () => {
    if (!lastAgentTurn || lastFlagged) return;
    const callerLine = [...turns.slice(0, lastAgentIndex)].reverse().find((t) => t.speaker !== "agent")?.text;
    setFlagged((s) => new Set(s).add(lastAgentTurn.id));
    onFlag?.(lastAgentTurn, { callerLine });
  };

  const startLabel = mode === "call" ? "Start test call" : "Start test chat";

  return (
    <div className="flex min-h-[420px] flex-col rounded-lg border border-ink-950/10 bg-paper-0 lg:h-full lg:min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-950/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[14px] font-semibold text-ink-950">Test this agent</h2>
          <span role="group" aria-label="Test mode" className="rounded-full bg-paper-100 p-0.5 text-[12px]">
            {(["call", "chat"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                aria-pressed={mode === m}
                className={`rounded-full px-2.5 py-1 font-medium ${mode === m ? "bg-paper-0 text-ink-950 shadow-sm" : "text-ink-500"}`}
              >
                {m === "call" ? "Call" : "Chat"}
              </button>
            ))}
          </span>
        </div>
        {session === "live" ? (
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-[12.5px] font-medium tabular-nums text-ink-700">
              <span className="size-1.5 rounded-full bg-error-500" />
              {mode === "call" ? `Test call · ${clock}` : "Test chat"}
            </span>
            <Button size="sm" variant="destructive" onClick={end}>
              {mode === "call" ? "End call" : "End chat"}
            </Button>
          </div>
        ) : session === "ended" ? (
          <Button size="sm" variant="secondary" className="gap-1.5" onClick={start}>
            <Icon name="play" className="size-3.5" />
            {startLabel}
          </Button>
        ) : null}
      </div>

      {sampleShown && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-950/8 bg-paper-50 px-4 py-2">
          <p className="text-[12.5px] text-ink-700">
            <span className="font-semibold">Sample conversation</span> — an example of how this agent might
            sound. It isn't a test.
          </p>
          <button
            type="button"
            onClick={() => setShowSample(false)}
            className="text-[12.5px] font-semibold text-brand-700 underline-offset-2 hover:underline"
          >
            Hide sample
          </button>
        </div>
      )}

      {session === "idle" && !showSample ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-paper-100 text-ink-600">
            <Icon name={mode === "call" ? (agent.direction === "outbound" ? "phone-outbound" : "phone-inbound") : "message"} className="size-4.5" />
          </div>
          <p className="max-w-[300px] text-[14px] font-medium text-ink-900">
            Talk to your agent the way a customer would.
          </p>
          <p className="max-w-[320px] text-[12.5px] text-ink-500">
            {mode === "call"
              ? `You play the ${other} and type what you'd say; the agent's replies are read aloud.`
              : `You play the ${other}; the agent replies in text.`}
          </p>
          <Button className="mt-1 gap-1.5" onClick={start}>
            <Icon name="play" className="size-4" />
            {startLabel}
          </Button>
          {transcript.length > 0 && (
            <button
              type="button"
              onClick={() => setShowSample(true)}
              className="text-[12.5px] font-semibold text-brand-700 underline-offset-2 hover:underline"
            >
              Show a sample conversation
            </button>
          )}
        </div>
      ) : (
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
          {turns.map((t) => (
            <div key={t.id} className={`flex flex-col ${t.speaker === "agent" ? "items-start" : "items-end"}`}>
              <div
                className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  t.speaker === "agent" ? "bg-paper-100 text-ink-900" : "bg-ink-950 text-paper-0"
                }`}
              >
                <span className="sr-only">{t.speaker === "agent" ? "Agent: " : `${other === "caller" ? "Caller" : "Recipient"}: `}</span>
                {t.text}
              </div>
              {flagged.has(t.id) && (
                <span className="mt-1 flex items-center gap-1 text-[11.5px] font-medium text-clay-700">
                  <Icon name="flag" className="size-3" />
                  Flagged — added to Test scenarios
                </span>
              )}
            </div>
          ))}
          {typing && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-paper-100 px-3.5 py-2.5 text-[13px] text-ink-500">
                <span className="sr-only">The agent is replying</span>
                <span aria-hidden="true">…</span>
              </div>
            </div>
          )}
          {session === "ended" && (
            <p className="pt-1 text-center text-[12.5px] text-ink-500">
              {mode === "call" ? `Test call ended after ${clock}.` : "Test chat ended."}
            </p>
          )}
        </div>
      )}

      {(session !== "idle" || showSample) && (
        <div className="border-t border-ink-950/10 p-3">
          {session === "live" ? (
            <form onSubmit={send} className="flex items-center gap-2">
              <label htmlFor={inputId} className="sr-only">
                What you say as the {other}
              </label>
              <Input
                autoFocus
                id={inputId}
                name="callerMessage"
                autoComplete="off"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`Say something as the ${other}…`}
                className="min-w-0 flex-1"
              />
              <Button type="submit" size="md" disabled={!draft.trim() || typing}>
                Send
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                className="px-3"
                aria-label={lastFlagged ? "Last reply flagged" : "Flag last reply"}
                title={lastFlagged ? "Last reply flagged" : "Flag last reply"}
                disabled={!lastAgentTurn || lastFlagged}
                onClick={flagLast}
              >
                <Icon name="flag" className="size-4" />
              </Button>
            </form>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <p className="flex-1 text-[12.5px] text-ink-500">
                {sampleShown ? "Spot a bad reply? Flag it to add a test scenario." : "Flag a reply to re-check it after every change."}
              </p>
              <Button variant="secondary" className="gap-1.5" disabled={!lastAgentTurn || lastFlagged} onClick={flagLast}>
                <Icon name="flag" className="size-4" />
                {lastFlagged ? "Flagged" : "Flag last reply"}
              </Button>
              {sampleShown && (
                <Button className="gap-1.5" onClick={start}>
                  <Icon name="play" className="size-4" />
                  {startLabel}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
      <p className="border-t border-ink-950/8 px-4 py-2.5 text-[12px] text-ink-400">
        Testing {agent.name.trim() || "this agent"} with its latest changes — nothing here touches real calls.
      </p>
    </div>
  );
}
