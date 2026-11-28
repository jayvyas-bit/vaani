import { Icon } from "@/components/ui/Icon";
import { RadioCard } from "@/components/ui/RadioCard";
import { WizardFooter } from "@/components/ui/WizardFooter";
import { agentTemplates, type AgentTemplate } from "@/lib/templates";

const groups = [
  {
    direction: "inbound" as const,
    title: "Inbound — agent answers calls",
    description: "Callers reach it: front desk, reservations, support.",
  },
  {
    direction: "outbound" as const,
    title: "Outbound — agent makes calls",
    description: "It places the call: follow-ups, reminders, outreach.",
  },
];

export function TemplateGallery({
  onSelect,
  onBack,
}: {
  onSelect?: (template: AgentTemplate) => void;
  onBack?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[640px] px-4 py-10 sm:px-0 sm:py-14 lg:max-w-[920px] xl:max-w-[1120px]">
          <div className="mb-8">
            <h1 className="text-[22px] font-semibold text-ink-950">Choose a template</h1>
            <p className="mt-1.5 text-[15px] text-ink-600">
              Starts you off with a name, purpose and call direction — all editable on the next step.
            </p>
          </div>

          <div className="flex flex-col gap-8">
            {groups.map((group) => {
              const templates = agentTemplates.filter((t) => t.values.direction === group.direction);
              if (templates.length === 0) return null;
              return (
                <div key={group.direction}>
                  <h2 className="text-[13px] font-semibold tracking-wide text-ink-500 uppercase">{group.title}</h2>
                  <p className="mt-0.5 text-[13px] text-ink-500">{group.description}</p>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {templates.map((t) => (
                      <RadioCard
                        key={t.id}
                        selected={false}
                        onSelect={() => onSelect?.(t)}
                        icon={<Icon name={t.icon} className="size-4.5" />}
                        title={t.title}
                        description={t.tagline}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <WizardFooter onBack={onBack} showBack={!!onBack} />
    </div>
  );
}
