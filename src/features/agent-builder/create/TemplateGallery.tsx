import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { agentTemplates, type AgentTemplate } from "@/lib/templates";

export function TemplateGallery({ onSelect }: { onSelect?: (template: AgentTemplate) => void }) {
  return (
    <div className="mx-auto w-full max-w-[640px] px-4 py-10 sm:px-0 sm:py-14">
      <div className="mb-8">
        <h1 className="text-[22px] font-semibold text-ink-950">Choose a template</h1>
        <p className="mt-1.5 text-[14px] text-ink-600">
          Starts you off with a name, purpose and call direction — all editable on the next step.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {agentTemplates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect?.(t)}
            className="flex w-full flex-col items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-xs outline-none transition-colors hover:border-gray-300 focus-visible:ring-4 focus-visible:ring-brand-500/25"
          >
            <div className="flex w-full items-center justify-between gap-2">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 ring-4 ring-gray-50">
                <Icon name={t.icon} className="size-4.5" />
              </div>
              <Badge tone={t.values.direction === "inbound" ? "inbound" : "outbound"}>
                {t.values.direction === "inbound" ? "Inbound" : "Outbound"}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{t.title}</p>
              <p className="mt-0.5 text-sm leading-5 text-gray-600">{t.tagline}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
