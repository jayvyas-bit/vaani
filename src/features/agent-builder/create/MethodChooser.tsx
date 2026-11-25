import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { RadioCard } from "@/components/ui/RadioCard";

export type Method = "template" | "describe" | "blank" | "import";

const liveMethods: { id: Method; icon: IconName; title: string; description: string }[] = [
  { id: "blank", icon: "plus", title: "Start from scratch", description: "Name it and say what it should do. Takes a minute." },
  {
    id: "template",
    icon: "book",
    title: "Browse templates",
    description: "Start from a ready-made agent for a common job, then customize it.",
  },
];

/** Not built yet — shown so the roadmap is visible, but not choosable. */
const upcoming: { id: Method; icon: IconName; title: string }[] = [
  { id: "describe", icon: "message", title: "Describe in plain language" },
  { id: "import", icon: "file", title: "Import a config file" },
];

export function MethodChooser({ onContinue }: { onContinue?: (method: Method) => void }) {
  const [selected, setSelected] = useState<Method>("blank");

  return (
    <div className="mx-auto w-full max-w-[640px] px-4 py-10 sm:px-0 sm:py-14">
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-ink-950">Create a new agent</h1>
        <p className="mt-1.5 text-[14px] text-ink-600">
          You'll end up with a draft agent you can start a test call with.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {liveMethods.map((m) => (
          <RadioCard
            key={m.id}
            selected={selected === m.id}
            onSelect={() => setSelected(m.id)}
            icon={<Icon name={m.icon} className="size-4.5" />}
            title={m.title}
            description={m.description}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12.5px] text-ink-500">
        <Badge tone="neutral">Coming soon</Badge>
        <span>
          {upcoming.map((m, i) => (
            <span key={m.id}>
              {i > 0 && ", "}
              {m.title}
            </span>
          ))}
        </span>
      </div>

      <div className="mt-8 flex justify-end">
        <Button size="lg" className="w-full sm:w-auto" onClick={() => onContinue?.(selected)}>
          Continue
        </Button>
      </div>
    </div>
  );
}
