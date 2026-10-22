import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, GanttChart, ListTree, RefreshCw, Target } from "lucide-react";
import { toast } from "sonner";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { AiTag, PageHeader, StatusChip } from "@/components/app/ui-bits";
import { roadmap as initial } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/roadmap")({
  head: () => ({
    meta: [
      { title: "AI Roadmap — Trajectify.AI" },
      { name: "description", content: "Your month-by-month AI roadmap with weekly tasks and resources." },
      { property: "og:title", content: "AI Roadmap — Trajectify.AI" },
      { property: "og:description", content: "A living roadmap that adapts to your progress." },
    ],
  }),
  component: Roadmap,
});

function Roadmap() {
  const [data, setData] = useState(initial);
  const [view, setView] = useState<"timeline" | "gantt">("timeline");

  function toggle(mi: number, ti: number) {
    setData((d) => d.map((m, i) => (i !== mi ? m : { ...m, tasks: m.tasks.map((t, j) => (j === ti ? { ...t, done: !t.done } : t)) })));
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="AI Roadmap"
        subtitle="Become a Full-Stack Web Developer · May → Oct 2026"
        action={
          <div className="flex gap-2">
            <div className="flex rounded-xl border bg-card p-1" role="tablist">
              {([["timeline", ListTree], ["gantt", GanttChart]] as const).map(([v, Icon]) => (
                <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={cn("flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium capitalize", view === v ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground")}>
                  <Icon className="h-4 w-4" /> {v}
                </button>
              ))}
            </div>
            <button onClick={() => toast.success("Trajectory adapted", { description: "Month 3 extended by 1 week based on your pace." })} className="flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              <RefreshCw className="h-4 w-4" /> Adapt trajectory
            </button>
          </div>
        }
      />

      {view === "gantt" ? (
        <div className="card-surface overflow-x-auto p-5">
          <div className="min-w-[640px]">
            <div className="mb-3 grid grid-cols-[180px_repeat(6,1fr)] text-xs text-muted-foreground">
              <span />{["May", "Jun", "Jul", "Aug", "Sep", "Oct"].map((m) => <span key={m} className="text-center">{m}</span>)}
            </div>
            {data.map((m, i) => (
              <div key={m.title} className="grid grid-cols-[180px_repeat(6,1fr)] items-center py-2">
                <span className="truncate text-sm font-medium">{m.title}</span>
                <div className="h-7 rounded-lg" style={{ gridColumn: `${i + 2} / span 1`, background: m.status === "Done" ? "var(--mint)" : m.status === "In progress" ? "var(--gradient-primary)" : "var(--muted)" }} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Accordion type="single" collapsible defaultValue="m-2" className="relative space-y-4 border-l-2 border-border pl-6">
          {data.map((m, mi) => {
            const done = m.tasks.filter((t) => t.done).length;
            return (
              <AccordionItem key={m.title} value={`m-${mi}`} className={cn("card-surface relative border-b-0 px-5", m.status === "In progress" && "ring-2 ring-electric/40")}>
                <span className={cn("absolute -left-[35px] top-6 h-4 w-4 rounded-full border-4 border-background", m.status === "Done" ? "bg-mint" : m.status === "In progress" ? "bg-electric" : "bg-muted-foreground/40")} />
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex flex-1 flex-wrap items-center gap-3 pr-3 text-left">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">{m.month}</p>
                      <p className="font-display text-base font-semibold">{m.title}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{done}/{m.tasks.length} tasks</span>
                    <StatusChip status={m.status} />
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-sm font-semibold">Weekly tasks</p>
                      <ul className="space-y-2">
                        {m.tasks.map((t, ti) => (
                          <li key={t.label} className="flex items-center gap-2.5">
                            <Checkbox id={`${mi}-${ti}`} checked={t.done} onCheckedChange={() => toggle(mi, ti)} />
                            <label htmlFor={`${mi}-${ti}`} className={cn("text-sm", t.done && "text-muted-foreground line-through")}>{t.label}</label>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><BookOpen className="h-4 w-4" /> Resources</p>
                        <div className="flex flex-wrap gap-2">{m.resources.map((r) => <span key={r} className="rounded-full bg-secondary px-3 py-1 text-xs">{r}</span>)}</div>
                      </div>
                      <div className="rounded-xl bg-gradient-ai p-3">
                        <p className="mb-1 flex items-center justify-between text-sm font-semibold"><span className="flex items-center gap-1.5"><Target className="h-4 w-4" /> Expected outcome</span><AiTag>AI</AiTag></p>
                        <p className="text-sm text-muted-foreground">{m.outcome}</p>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
