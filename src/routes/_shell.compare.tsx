import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { Award, Clock, Compass, GitCompare, Sparkles, TrendingUp, Save } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { AiTag, EmptyState, PageHeader, Panel, RiskBadge } from "@/components/app/ui-bits";
import { authService, AuthUser } from "@/services/authService";
import { dataService, UserProfile, Goal } from "@/services/dataService";
import { calculateSimulation, SkillRequirementInput } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/compare")({
  head: () => ({
    meta: [
      { title: "What-If Comparison — Trajectify.AI" },
      {
        name: "description",
        content:
          "Simulate and compare different career and skill trajectories side by side with live probability projections.",
      },
      { property: "og:title", content: "What-If Comparison — Trajectify.AI" },
    ],
  }),
  component: ComparePage,
});

const chartPalette = ["var(--primary)", "var(--ai-highlight)", "var(--accent)"];

function ComparePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [hours, setHours] = useState(14);
  const [delay, setDelay] = useState(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        const activeGoal = p.goals.find((g) => g.id === p.activeGoalId) || p.goals[0];
        if (activeGoal) {
          setHours(activeGoal.hoursPerWeek || 14);
        }
      }
      setLoading(false);
    });
  }, [navigate]);

  const activeGoal = profile?.goals.find((g) => g.id === profile.activeGoalId) || profile?.goals[0];

  // Dynamic path alternatives derived from the user's active goal
  const basePaths = useMemo(() => {
    if (!activeGoal) return [];

    const domainName = activeGoal.domain;
    const goalTitle = activeGoal.title;

    if (domainName === "Fitness") {
      return [
        {
          id: "path-1",
          name: "Structured Hypertrophy & Cardio",
          months: 5,
          velocity: 0.08,
          adherence: 1.0,
        },
        {
          id: "path-2",
          name: "High-Intensity Functional Endurance",
          months: 6,
          velocity: 0.065,
          adherence: 0.95,
        },
        {
          id: "path-3",
          name: "Rapid Athletic Transformation",
          months: 3,
          velocity: 0.12,
          adherence: 0.85,
        },
      ];
    }

    if (domainName === "Finance") {
      return [
        {
          id: "path-1",
          name: "Automated Index & Emergency Shield",
          months: 6,
          velocity: 0.09,
          adherence: 1.0,
        },
        {
          id: "path-2",
          name: "Active Portfolio & Growth Assets",
          months: 8,
          velocity: 0.07,
          adherence: 0.95,
        },
        {
          id: "path-3",
          name: "Aggressive Cashflow Optimization",
          months: 4,
          velocity: 0.11,
          adherence: 0.85,
        },
      ];
    }

    // Default: Career / Skills or Habits
    return [
      {
        id: "path-1",
        name: `${goalTitle} (Direct Track)`,
        months: 6,
        velocity: 0.08,
        adherence: 1.0,
      },
      {
        id: "path-2",
        name: "Full-Stack Specialist & Cloud Track",
        months: 8,
        velocity: 0.065,
        adherence: 0.95,
      },
      {
        id: "path-3",
        name: "Accelerated Sprint to Production",
        months: 4,
        velocity: 0.12,
        adherence: 0.82,
      },
    ];
  }, [activeGoal]);

  // Deterministic scoring engine calculations
  const computed = useMemo(() => {
    if (!activeGoal) return [];

    const skillInputs: SkillRequirementInput[] = (activeGoal.skills || []).map((sk) => ({
      name: sk.name,
      r: 8, // Target required level
      s: sk.level, // Current student level
      w: 1.0,
    }));

    if (skillInputs.length === 0) {
      skillInputs.push({ name: "Core Skills", r: 8, s: 4, w: 1.0 });
    }

    return basePaths.map((p) => {
      const sim = calculateSimulation({
        skills: skillInputs,
        hoursPerWeek: hours,
        targetMonths: p.months,
        startDelayMonths: delay,
        velocity: p.velocity,
        adherence: p.adherence,
      });

      return {
        id: p.id,
        name: p.name,
        prob: sim.successScorePercent, // Deterministic success score P
        skillGrowth: sim.readinessPercent, // Deterministic readiness score F
        time: Math.min(24, Math.max(1.0, sim.timeToReadinessMonths)), // Time to readiness M
        risk: sim.riskLevel, // Deterministic risk delta R = P(v) - P(0.7v)
        data: sim.monthlyCurve.map((c) => ({ m: c.month, v: c.value })),
        rawSim: sim,
      };
    });
  }, [activeGoal, basePaths, hours, delay]);

  const best = computed.length > 0 ? computed.reduce((a, b) => (b.prob > a.prob ? b : a)) : null;

  // Debounced auto-save of current simulation to Supabase what_if_comparisons
  useEffect(() => {
    if (!user || !activeGoal || !best) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      dataService.saveWhatIfComparison(user.id, activeGoal.id, {
        scenarioName: best.name,
        hoursPerWeek: hours,
        delayMonths: delay,
        projectedProbability: best.prob,
        projectedCompletionMonths: Math.round(best.time) || 6,
        riskLevel: best.risk,
        skillGrowthScore: best.skillGrowth,
        comparisonData: {
          paths: computed.map((c) => ({
            name: c.name,
            score: c.prob,
            readiness: c.skillGrowth,
            risk: c.risk,
          })),
        },
      });
    }, 1500);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [user, activeGoal, best, hours, delay, computed]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl py-16 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-3 text-sm text-muted-foreground">Loading What-If simulations...</p>
      </div>
    );
  }

  if (!profile || !activeGoal) {
    return (
      <div className="mx-auto max-w-4xl py-6">
        <PageHeader title="What-If Comparison" subtitle="Simulate different future paths." />
        <EmptyState
          title="No Goals Available for Comparison"
          description="Complete your initial onboarding profile to simulate custom what-if paths, adjust weekly hours, and compare projected growth curves."
          actionText="Start Profile Onboarding"
          onAction={() => navigate({ to: "/onboarding" })}
          icon={Compass}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <PageHeader
        title="What-If Scenario Simulator"
        subtitle={`Adjust your time and start variables to observe real-time projected trajectories for "${activeGoal.title}".`}
      />

      {/* Decision Sliders Card */}
      <Panel title="Interactive Decision Variables" className="mb-2">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <div className="mb-3 flex justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Weekly Time Commitment</span>
              <span className="text-primary font-bold text-sm">{hours} hrs/week</span>
            </div>
            <Slider
              value={[hours]}
              min={4}
              max={36}
              step={1}
              onValueChange={(v) => setHours(v[0] ?? 14)}
              aria-label="Hours per week slider"
            />
            <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
              <span>4 hrs (minimal)</span>
              <span>14 hrs (baseline)</span>
              <span>36 hrs (intensive)</span>
            </div>
          </div>

          <div>
            <div className="mb-3 flex justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Start Date Delay</span>
              <span className="text-primary font-bold text-sm">
                {delay === 0 ? "Immediate (This Week)" : `In ${delay} month${delay > 1 ? "s" : ""}`}
              </span>
            </div>
            <Slider
              value={[delay]}
              min={0}
              max={4}
              step={1}
              onValueChange={(v) => setDelay(v[0] ?? 0)}
              aria-label="Start delay in months"
            />
            <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
              <span>Immediate</span>
              <span>2 months</span>
              <span>4 months</span>
            </div>
          </div>
        </div>
      </Panel>

      {/* Comparative Paths Grid */}
      <div className="grid gap-5 lg:grid-cols-3">
        {computed.map((p, i) => {
          const isBest = best && p.id === best.id;
          return (
            <Panel
              key={p.id}
              className={cn(
                "relative transition-all",
                isBest && "ring-2 ring-primary border-primary shadow-soft",
              )}
            >
              {isBest && (
                <span className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-soft">
                  <Award className="h-3.5 w-3.5" /> Optimal Risk/Reward
                </span>
              )}

              <div className="flex items-start justify-between gap-2 pt-1">
                <h2 className="text-base font-bold text-foreground">{p.name}</h2>
                <RiskBadge risk={p.risk} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
                <div className="rounded-xl bg-muted/60 p-2.5">
                  <p className="font-display text-lg font-bold text-foreground">{p.prob}%</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Score (P)
                  </p>
                </div>
                <div className="rounded-xl bg-muted/60 p-2.5">
                  <p className="font-display text-lg font-bold text-foreground">{p.skillGrowth}%</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Readiness (F)
                  </p>
                </div>
                <div className="rounded-xl bg-muted/60 p-2.5">
                  <p className="font-display text-lg font-bold text-foreground flex items-center justify-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {p.time}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Months (M)
                  </p>
                </div>
              </div>

              {/* Growth Curve */}
              <div className="mt-4 h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={p.data}>
                    <XAxis
                      dataKey="m"
                      tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        fontSize: 12,
                        color: "var(--foreground)",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="v"
                      name="Deterministic Readiness"
                      stroke={chartPalette[i]}
                      strokeWidth={3}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Panel>
          );
        })}
      </div>

      {/* AI Decision Analysis Card */}
      {best && (
        <Panel ai title="Why Trajectify Recommends This Path" action={<AiTag />}>
          <p className="text-sm leading-relaxed text-foreground">
            At <strong>{hours} hours/week</strong>{" "}
            {delay > 0 ? `with a ${delay}-month delay, ` : "starting immediately, "}
            the <span className="font-bold text-primary">{best.name}</span> yields the highest
            deterministic success score (<strong>{best.prob}%</strong>) with{" "}
            <strong>{best.risk}</strong> modeled volatility risk. It maximizes skill readiness
            growth within safe cognitive limits for your domain.
          </p>
        </Panel>
      )}
    </div>
  );
}
