import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Compass,
  GanttChart,
  ListTree,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { authService, AuthUser } from "@/services/authService";
import { dataService, UserProfile, Goal, Milestone } from "@/services/dataService";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { AiTag, EmptyState, PageHeader, StatusChip } from "@/components/app/ui-bits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/roadmap")({
  head: () => ({
    meta: [
      { title: "AI Roadmap — Trajectify.AI" },
      {
        name: "description",
        content:
          "Your month-by-month living roadmap with milestone tasks and resources that adapts to your progress.",
      },
      { property: "og:title", content: "AI Roadmap — Trajectify.AI" },
    ],
  }),
  component: RoadmapPage,
});

function RoadmapPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"timeline" | "gantt">("timeline");

  useEffect(() => {
    const cur = authService.getCurrentUser();
    setUser(cur);
    if (!cur) {
      navigate({ to: "/login" });
      return;
    }

    dataService.getProfile(cur.id).then((p) => {
      setProfile(p);
      setLoading(false);
    });
  }, [navigate]);

  const activeGoal = profile?.goals.find((g) => g.id === profile.activeGoalId) || profile?.goals[0];

  async function handleToggleTask(milestoneId: string, taskId: string) {
    if (!user) return;
    try {
      const updated = await dataService.toggleTask(user.id, milestoneId, taskId);
      setProfile(updated);
      toast.success("Task updated & trajectory recalculated!");
    } catch {
      toast.error("Failed to update task.");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl py-16 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-3 text-sm text-muted-foreground">Loading your personalized roadmap...</p>
      </div>
    );
  }

  if (!profile || !activeGoal) {
    return (
      <div className="mx-auto max-w-4xl py-6">
        <PageHeader
          title="AI Roadmap"
          subtitle="Living month-by-month plan that adapts as you grow."
        />
        <EmptyState
          title="No Roadmap Generated Yet"
          description="Complete your initial onboarding profile to synthesize your tailored milestones, weekly tasks, and recommended resources."
          actionText="Create Your Roadmap"
          onAction={() => navigate({ to: "/onboarding" })}
          icon={Compass}
        />
      </div>
    );
  }

  const milestones = activeGoal.roadmap || [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <PageHeader
        title="AI Roadmap"
        subtitle={`${activeGoal.title} · ${activeGoal.domain} · Target: ${activeGoal.targetDate}`}
        action={
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex rounded-xl border bg-card p-1" role="tablist">
              {(
                [
                  ["timeline", ListTree],
                  ["gantt", GanttChart],
                ] as const
              ).map(([v, Icon]) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition",
                    view === v
                      ? "bg-gradient-primary text-primary-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" /> {v}
                </button>
              ))}
            </div>

            <Link
              to="/checkin"
              className="flex items-center gap-1.5 rounded-xl bg-gradient-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-soft hover:opacity-95 transition"
            >
              <CalendarCheck className="h-4 w-4" /> Weekly Check-In
            </Link>
          </div>
        }
      />

      {/* Progress Metric Banner */}
      <div className="card-surface p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Current Progress</p>
            <p className="text-base font-bold text-foreground">{activeGoal.progress}% Achieved</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-success/10 text-success">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Achievement Probability</p>
            <p className="text-base font-bold text-foreground">
              {activeGoal.probability}% Modeling
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-ai/10 text-ai">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Weekly Target</p>
            <p className="text-base font-bold text-foreground">
              {activeGoal.hoursPerWeek} hrs/week
            </p>
          </div>
        </div>
      </div>

      {/* GANTT VIEW */}
      {view === "gantt" ? (
        <div className="card-surface overflow-x-auto p-6">
          <div className="min-w-[680px]">
            <div className="mb-4 grid grid-cols-[200px_repeat(4,1fr)] text-xs font-semibold text-muted-foreground border-b pb-2">
              <span>Milestone</span>
              {milestones.map((m) => (
                <span key={m.id} className="text-center font-mono">
                  {m.month.split(" · ")[1] || m.month}
                </span>
              ))}
            </div>
            <div className="space-y-3">
              {milestones.map((m, i) => (
                <div key={m.id} className="grid grid-cols-[200px_repeat(4,1fr)] items-center py-2">
                  <div className="pr-3">
                    <p className="truncate text-xs font-bold text-foreground">{m.title}</p>
                    <p className="text-[10px] text-muted-foreground">{m.status}</p>
                  </div>
                  <div
                    className="h-8 rounded-xl shadow-soft flex items-center justify-center text-[11px] font-bold text-white px-2"
                    style={{
                      gridColumn: `${i + 2} / span 1`,
                      background:
                        m.status === "Done"
                          ? "var(--success)"
                          : m.status === "In progress"
                            ? "var(--primary)"
                            : "var(--muted)",
                      color: m.status === "Upcoming" ? "var(--muted-foreground)" : "#FFFFFF",
                    }}
                  >
                    {m.tasks.filter((t) => t.done).length}/{m.tasks.length} tasks
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* TIMELINE ACCORDION VIEW */
        <Accordion
          type="single"
          collapsible
          defaultValue={milestones[0]?.id || "m-1"}
          className="relative space-y-4 border-l-2 border-border pl-6"
        >
          {milestones.map((m) => {
            const done = m.tasks.filter((t) => t.done).length;
            const isCompleted = done === m.tasks.length && m.tasks.length > 0;
            return (
              <AccordionItem
                key={m.id}
                value={m.id}
                className={cn(
                  "card-surface relative border-b-0 px-5 transition-all",
                  m.status === "In progress" && "ring-2 ring-primary/40 shadow-soft",
                )}
              >
                {/* Node icon on vertical line */}
                <span
                  className={cn(
                    "absolute -left-[35px] top-6 h-4 w-4 rounded-full border-4 border-background",
                    m.status === "Done"
                      ? "bg-success"
                      : m.status === "In progress"
                        ? "bg-primary"
                        : "bg-muted-foreground/40",
                  )}
                />

                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex flex-1 flex-wrap items-center gap-3 pr-3 text-left">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-muted-foreground">{m.month}</p>
                      <p className="font-display text-base font-bold text-foreground mt-0.5">
                        {m.title}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">
                      {done}/{m.tasks.length} tasks
                    </span>
                    <StatusChip status={m.status} />
                  </div>
                </AccordionTrigger>

                <AccordionContent className="pb-5 pt-1">
                  <div className="grid gap-6 md:grid-cols-2 pt-2 border-t border-border/50">
                    <div>
                      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Weekly Tasks (Click to toggle)
                      </p>
                      <ul className="space-y-2.5">
                        {m.tasks.map((t) => (
                          <li
                            key={t.id}
                            className="flex items-center gap-3 p-2.5 rounded-xl border bg-card hover:border-primary/40 transition"
                          >
                            <Checkbox
                              id={`task-${t.id}`}
                              checked={t.done}
                              onCheckedChange={() => handleToggleTask(m.id, t.id)}
                            />
                            <label
                              htmlFor={`task-${t.id}`}
                              className={cn(
                                "text-xs font-medium cursor-pointer flex-1",
                                t.done && "text-muted-foreground line-through opacity-70",
                              )}
                            >
                              {t.label}
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          <BookOpen className="h-3.5 w-3.5" /> Curated Resources
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {m.resources.map((r) => (
                            <span
                              key={r}
                              className="rounded-full bg-secondary border px-3 py-1 text-xs font-medium text-foreground"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl bg-gradient-ai border border-primary/20 p-4">
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                            <Target className="h-4 w-4 text-primary" /> Expected Outcome
                          </span>
                          <AiTag>AI Calibrated</AiTag>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{m.outcome}</p>
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
