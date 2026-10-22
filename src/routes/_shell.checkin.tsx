import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  CalendarCheck,
  Clock,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Plus,
  AlertTriangle,
  History,
  Check,
  X,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { authService, AuthUser } from "@/services/authService";
import {
  dataService,
  UserProfile,
  Goal,
  Milestone,
  RoadmapChange,
  CheckInRecord,
} from "@/services/dataService";
import { aiService } from "@/services/aiService";
import { PageHeader, Panel, AiTag, EmptyState } from "@/components/app/ui-bits";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";

export const Route = createFileRoute("/_shell/checkin")({
  head: () => ({
    meta: [
      { title: "Weekly Check-In — Trajectify.AI" },
      {
        name: "description",
        content: "Reflect on your weekly hours, mark completed tasks, and adapt your AI roadmap.",
      },
      { property: "og:title", content: "Weekly Check-In — Trajectify.AI" },
    ],
  }),
  component: CheckInPage,
});

const MOODS = [
  { value: 1, emoji: "😫", label: "Struggling", desc: "Heavy friction, low motivation" },
  { value: 2, emoji: "😕", label: "Low", desc: "Fell behind pace" },
  { value: 3, emoji: "😐", label: "Steady", desc: "Got the baseline work done" },
  { value: 4, emoji: "😊", label: "Good", desc: "Strong focus and clarity" },
  { value: 5, emoji: "🚀", label: "High Energy", desc: "Outperformed goals, peak momentum" },
] as const;

const DRAFT_KEY = "trajectify_checkin_draft";

function CheckInPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [notes, setNotes] = useState("");
  const [actualHours, setActualHours] = useState(14);
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [blockers, setBlockers] = useState("");
  const [goalChanges, setGoalChanges] = useState("");

  // Review step state
  const [reviewMode, setReviewMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [aiEncouragement, setAiEncouragement] = useState("");
  const [proposedChanges, setProposedChanges] = useState<RoadmapChange[]>([]);
  const [appliedCount, setAppliedCount] = useState(0);

  // Load user & profile
  useEffect(() => {
    const cur = authService.getCurrentUser();
    setUser(cur);
    if (!cur) {
      navigate({ to: "/login" });
      return;
    }

    dataService.getProfile(cur.id).then((p) => {
      setProfile(p);
      if (p) {
        const goal = p.goals.find((g) => g.id === p.activeGoalId);
        if (goal) {
          setActualHours(goal.hoursPerWeek || 14);
        }
      }

      // Check for saved draft
      try {
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft);
          if (parsed.notes) setNotes(parsed.notes);
          if (parsed.actualHours) setActualHours(parsed.actualHours);
          if (parsed.completedTaskIds) setCompletedTaskIds(parsed.completedTaskIds);
          if (parsed.mood) setMood(parsed.mood);
          if (parsed.blockers) setBlockers(parsed.blockers);
          if (parsed.goalChanges) setGoalChanges(parsed.goalChanges);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    });
  }, [navigate]);

  // Auto-save draft
  useEffect(() => {
    if (loading || reviewMode) return;
    const draft = {
      notes,
      actualHours,
      completedTaskIds,
      mood,
      blockers,
      goalChanges,
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn("Failed to save checkin draft:", e);
    }
  }, [notes, actualHours, completedTaskIds, mood, blockers, goalChanges, loading, reviewMode]);

  const activeGoal = profile?.goals.find((g) => g.id === profile.activeGoalId);

  // Collect tasks from active milestone
  const currentMilestones = activeGoal?.roadmap || [];
  const currentTasks = currentMilestones.flatMap((m) =>
    m.tasks.map((t) => ({ ...t, milestoneTitle: m.title })),
  );

  function toggleTask(id: string) {
    setCompletedTaskIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleAnalyzeAndSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !activeGoal || !user) return;

    if (!notes.trim()) {
      toast.error("Please add a brief note on how your week went.");
      return;
    }

    try {
      setSubmitting(true);
      toast.loading("Analyzing check-in with Trajectify AI...", { id: "checkin-eval" });

      const analysis = await aiService.analyzeCheckIn(
        {
          notes,
          actualHours,
          completedTaskIds,
          mood,
          blockers,
          goalChanges,
        },
        activeGoal.roadmap,
        profile,
        activeGoal,
      );

      // Save check-in record to storage
      await dataService.addCheckIn(user.id, {
        notes,
        actualHours,
        completedTaskIds,
        mood,
        blockers,
        goalChanges,
      });

      // Update state for review screen
      setAiSummary(analysis.summary);
      setAiEncouragement(analysis.encouragement);
      setProposedChanges(analysis.suggestedChanges.map((c) => ({ ...c, accepted: true })));
      setReviewMode(true);
      toast.success("Check-in analyzed! Review suggested roadmap adjustments.", {
        id: "checkin-eval",
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to analyze check-in. Please try again.";
      toast.error(msg, {
        id: "checkin-eval",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function toggleAcceptChange(changeId: string) {
    setProposedChanges((prev) =>
      prev.map((c) => (c.id === changeId ? { ...c, accepted: !c.accepted } : c)),
    );
  }

  function handleApplyAll() {
    setProposedChanges((prev) => prev.map((c) => ({ ...c, accepted: true })));
  }

  async function handleCommitChanges() {
    if (!user) return;
    const accepted = proposedChanges.filter((c) => c.accepted);
    try {
      setSubmitting(true);
      if (accepted.length > 0) {
        await dataService.applyRoadmapChanges(user.id, accepted);
        toast.success(
          `Applied ${accepted.length} roadmap update${accepted.length > 1 ? "s" : ""}!`,
        );
      } else {
        toast.info("Roadmap kept unchanged per your preferences.");
      }
      navigate({ to: "/roadmap" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to commit roadmap changes.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-3 text-sm text-muted-foreground">Loading your trajectory...</p>
      </div>
    );
  }

  if (!profile || !activeGoal) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title="Weekly Check-In"
          subtitle="Reflect, record hours, and adapt your trajectory."
        />
        <EmptyState
          title="No Active Trajectory Found"
          description="You haven't set up your primary goal yet. Complete the quick onboarding to start tracking weekly check-ins and getting tailored AI roadmap updates."
          actionText="Start Onboarding"
          onAction={() => navigate({ to: "/onboarding" })}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl pb-12">
      <PageHeader
        title="Weekly Check-In"
        subtitle={`Pacing "${activeGoal.title}" · Target: ${activeGoal.hoursPerWeek} hrs/week`}
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              Streak: <strong className="text-foreground">{activeGoal.streak} weeks</strong>
            </span>
            <AiTag>Adaptive feedback loop</AiTag>
          </div>
        }
      />

      <AnimatePresence mode="wait">
        {!reviewMode ? (
          /* FORM VIEW */
          <motion.form
            key="checkin-form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            onSubmit={handleAnalyzeAndSubmit}
            className="space-y-6"
          >
            {/* 1. Hours Invested Slider */}
            <Panel title="1. Actual Hours Invested This Week">
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-xs text-muted-foreground">
                  Target: <strong>{activeGoal.hoursPerWeek} hrs</strong>
                </span>
                <span className="font-display text-3xl font-extrabold text-primary">
                  {actualHours}{" "}
                  <span className="text-base font-semibold text-muted-foreground">hrs</span>
                </span>
              </div>
              <Slider
                value={[actualHours]}
                min={0}
                max={40}
                step={1}
                onValueChange={(v) => setActualHours(v[0] ?? 0)}
                aria-label="Hours studied this week"
              />
              <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                <span>0 hrs</span>
                <span>
                  {actualHours < activeGoal.hoursPerWeek
                    ? `${activeGoal.hoursPerWeek - actualHours}h below target`
                    : actualHours === activeGoal.hoursPerWeek
                      ? "Exactly on target"
                      : `+${actualHours - activeGoal.hoursPerWeek}h above target!`}
                </span>
                <span>40 hrs</span>
              </div>
            </Panel>

            {/* 2. Mood & Energy Scale */}
            <Panel title="2. Mood & Energy Level">
              <p className="text-xs text-muted-foreground mb-4">
                How did your learning or work sessions feel this week?
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {MOODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMood(m.value)}
                    className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all text-center ${
                      mood === m.value
                        ? "border-primary bg-primary/10 shadow-soft ring-2 ring-primary/40 scale-102"
                        : "bg-card hover:border-primary/50"
                    }`}
                  >
                    <span className="text-3xl mb-1">{m.emoji}</span>
                    <span className="text-xs font-bold text-foreground">{m.label}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">{m.desc}</span>
                  </button>
                ))}
              </div>
            </Panel>

            {/* 3. Milestones Completed Checklist */}
            <Panel title="3. Milestones & Tasks Completed This Week">
              <p className="text-xs text-muted-foreground mb-3">
                Check off any tasks you shipped or completed during the week:
              </p>
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {currentTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    No tasks in active roadmap.
                  </p>
                ) : (
                  currentTasks.map((t) => {
                    const isChecked = completedTaskIds.includes(t.id) || t.done;
                    return (
                      <div
                        key={t.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                          isChecked
                            ? "bg-muted/60 text-muted-foreground"
                            : "bg-card hover:border-primary/40"
                        }`}
                      >
                        <Checkbox
                          id={`chk-${t.id}`}
                          checked={isChecked}
                          onCheckedChange={() => toggleTask(t.id)}
                        />
                        <label
                          htmlFor={`chk-${t.id}`}
                          className={`flex-1 text-xs sm:text-sm font-medium cursor-pointer ${
                            isChecked ? "line-through text-muted-foreground" : "text-foreground"
                          }`}
                        >
                          {t.label}
                        </label>
                        <span className="text-[10px] rounded-full bg-secondary px-2 py-0.5 text-muted-foreground shrink-0">
                          {t.milestoneTitle}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </Panel>

            {/* 4. Weekly Reflections & Notes */}
            <Panel title="4. How Did This Week Go?">
              <label htmlFor="checkin-notes" className="text-xs text-muted-foreground mb-1 block">
                Summarize your wins, challenges, and what you spent the most time on:
              </label>
              <textarea
                id="checkin-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                required
                placeholder="e.g. Finished the TanStack Query tutorials and built a mock store API. Stumbled a bit on cache invalidation, but got it running."
                className="w-full rounded-xl border border-input bg-card p-3.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </Panel>

            {/* 5. Blockers & Changes */}
            <div className="grid gap-5 md:grid-cols-2">
              <Panel title="5. Blockers or Obstacles">
                <input
                  type="text"
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  placeholder="e.g. Semester exams next week; laptop repair delay"
                  className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                />
              </Panel>
              <Panel title="6. Changes in Schedule or Goal">
                <input
                  type="text"
                  value={goalChanges}
                  onChange={(e) => setGoalChanges(e.target.value)}
                  placeholder="e.g. Want to dedicate 2 extra hours on Saturdays"
                  className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                />
              </Panel>
            </div>

            {/* Form Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t">
              <button
                type="button"
                onClick={() => {
                  setNotes("");
                  setBlockers("");
                  setGoalChanges("");
                  setCompletedTaskIds([]);
                  localStorage.removeItem(DRAFT_KEY);
                  toast.info("Draft cleared.");
                }}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Clear draft
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-gradient-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-95 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {submitting ? (
                  <>Synthesizing AI Changes...</>
                ) : (
                  <>
                    Submit Check-In & Adapt Roadmap <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </motion.form>
        ) : (
          /* REVIEW & DIFF VIEW */
          <motion.div
            key="review-diff"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-6"
          >
            {/* AI Summary Banner */}
            <div className="rounded-2xl bg-gradient-ai border border-primary/25 p-6 shadow-soft">
              <div className="flex items-center gap-2 mb-2">
                <AiTag>Trajectify Synthesis</AiTag>
                <span className="text-xs text-muted-foreground">Evaluation Complete</span>
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">{aiSummary}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {aiEncouragement}
              </p>
            </div>

            {/* Proposed Roadmap Changes */}
            <Panel
              title="Proposed Roadmap Adjustments"
              action={
                <button
                  type="button"
                  onClick={handleApplyAll}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Accept all changes
                </button>
              }
            >
              <p className="text-xs text-muted-foreground mb-4">
                Trajectify AI analyzed your performance and recommends the following updates. You
                stay in full control — accept or reject each diff individually before committing.
              </p>

              {proposedChanges.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No modifications suggested for this week. Your roadmap is fully synchronized!
                </div>
              ) : (
                <div className="space-y-4">
                  {proposedChanges.map((change) => (
                    <div
                      key={change.id}
                      className={`p-4 rounded-xl border transition-all ${
                        change.accepted
                          ? "border-primary/40 bg-card shadow-soft"
                          : "border-border bg-muted/40 opacity-60"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ${
                              change.type === "add"
                                ? "bg-success/20 text-success"
                                : change.type === "remove"
                                  ? "bg-destructive/15 text-destructive"
                                  : "bg-primary/20 text-primary"
                            }`}
                          >
                            {change.type}
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground">
                            {change.milestoneTitle}
                          </span>
                        </div>

                        {/* Accept / Reject controls */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleAcceptChange(change.id)}
                            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                              change.accepted
                                ? "bg-primary text-primary-foreground"
                                : "border hover:bg-card"
                            }`}
                          >
                            <Check className="h-3.5 w-3.5" />
                            {change.accepted ? "Accepted" : "Accept"}
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleAcceptChange(change.id)}
                            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                              !change.accepted
                                ? "bg-destructive text-destructive-foreground"
                                : "border hover:bg-card text-muted-foreground"
                            }`}
                          >
                            <X className="h-3.5 w-3.5" /> Reject
                          </button>
                        </div>
                      </div>

                      <div className="mt-2">
                        <p className="font-semibold text-sm text-foreground">{change.taskLabel}</p>
                        <p className="text-xs text-primary font-medium mt-0.5">
                          Action: {change.action}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Reason: {change.reason}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            {/* Commit bar */}
            <div className="flex items-center justify-between pt-4 border-t">
              <button
                type="button"
                onClick={() => setReviewMode(false)}
                className="rounded-xl border bg-card px-4 py-2.5 text-sm font-semibold hover:border-primary"
              >
                Back to Edit
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleCommitChanges}
                className="rounded-xl bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-95"
              >
                Apply Accepted Changes to Roadmap
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Check-In History Timeline */}
      {activeGoal.checkIns && activeGoal.checkIns.length > 0 && (
        <section className="mt-12 pt-8 border-t">
          <div className="flex items-center gap-2 mb-6">
            <History className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-bold">Check-In History & Log</h2>
          </div>
          <div className="space-y-4">
            {activeGoal.checkIns.map((item) => (
              <div
                key={item.id}
                className="card-surface p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{item.date}</span>
                    <span className="text-sm">
                      {MOODS.find((m) => m.value === item.mood)?.emoji}
                    </span>
                    <span className="text-xs rounded-full bg-secondary px-2.5 py-0.5 font-medium text-muted-foreground">
                      {item.actualHours} hrs logged
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">{item.notes}</p>
                </div>
                {item.blockers && (
                  <div className="text-xs bg-muted/60 p-2 rounded-lg max-w-xs shrink-0">
                    <span className="font-semibold text-foreground">Blocker: </span>
                    <span className="text-muted-foreground">{item.blockers}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
