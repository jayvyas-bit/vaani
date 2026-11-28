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
const upcoming: { id: Method; icon: IconName; title: string; description: string }[] = [
  { id: "describe", icon: "message", title: "Describe in plain language", description: "Tell it what you need in a sentence or two." },
  { id: "import", icon: "file", title: "Import a config file", description: "Bring an agent definition from another tool." },
];

export function MethodChooser({ onContinue }: { onContinue?: (method: Method) => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-[640px] flex-col justify-center px-4 py-10 sm:px-0 sm:py-14">
          <div className="mb-8">
            <h1 className="text-[22px] font-semibold text-ink-950">Create a new agent</h1>
            <p className="mt-1.5 text-[14px] text-ink-600">
              You’ll end up with a draft agent you can start a test call with.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {liveMethods.map((m) => (
              <RadioCard
                key={m.id}
                selected={false}
                onSelect={() => onContinue?.(m.id)}
                icon={<Icon name={m.icon} className="size-4.5" />}
                title={m.title}
                description={m.description}
              />
            ))}
          </div>

          <div className="mt-7">
            <p className="mb-3 text-[12.5px] font-medium text-ink-500">Coming soon</p>
            <div className="flex flex-col gap-3">
              {upcoming.map((m) => (
                <RadioCard
                  key={m.id}
                  selected={false}
                  disabled
                  onSelect={() => {}}
                  icon={<Icon name={m.icon} className="size-4.5" />}
                  title={m.title}
                  description={m.description}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
