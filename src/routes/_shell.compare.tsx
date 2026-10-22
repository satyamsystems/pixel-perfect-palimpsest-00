import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Award, Clock, Compass, GitCompare, Sparkles, TrendingUp } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Slider } from "@/components/ui/slider";
import { AiTag, EmptyState, PageHeader, Panel, RiskBadge } from "@/components/app/ui-bits";
import { authService, AuthUser } from "@/services/authService";
import { dataService, UserProfile, Goal } from "@/services/dataService";
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
const monthsLabels = ["Now", "M1", "M2", "M3", "M4", "M5", "M6"];

function ComparePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [hours, setHours] = useState(14);
  const [delay, setDelay] = useState(0);

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
        const activeGoal = p.goals.find((g) => g.id === p.activeGoalId);
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
          skillGrowth: 86,
          probability: 80,
          months: 5,
          risk: "Low" as const,
          base: [20, 35, 52, 68, 79, 88, 92],
        },
        {
          id: "path-2",
          name: "High-Intensity Functional Endurance",
          skillGrowth: 78,
          probability: 68,
          months: 6,
          risk: "Medium" as const,
          base: [15, 28, 42, 55, 66, 75, 82],
        },
        {
          id: "path-3",
          name: "Rapid Athletic Transformation",
          skillGrowth: 65,
          probability: 58,
          months: 3,
          risk: "High" as const,
          base: [25, 45, 62, 70, 75, 78, 80],
        },
      ];
    }

    if (domainName === "Finance") {
      return [
        {
          id: "path-1",
          name: "Automated Index & Emergency Shield",
          skillGrowth: 88,
          probability: 85,
          months: 6,
          risk: "Low" as const,
          base: [20, 34, 48, 62, 74, 84, 91],
        },
        {
          id: "path-2",
          name: "Active Portfolio & Growth Assets",
          skillGrowth: 76,
          probability: 64,
          months: 8,
          risk: "Medium" as const,
          base: [15, 26, 38, 50, 62, 70, 78],
        },
        {
          id: "path-3",
          name: "Aggressive Cashflow Optimization",
          skillGrowth: 62,
          probability: 55,
          months: 4,
          risk: "High" as const,
          base: [25, 40, 52, 60, 65, 68, 70],
        },
      ];
    }

    // Default: Career / Skills
    return [
      {
        id: "path-1",
        name: `${goalTitle} (Direct Track)`,
        skillGrowth: 84,
        probability: Math.min(94, Math.max(50, activeGoal.probability || 74)),
        months: 6,
        risk: "Low" as const,
        base: [20, 35, 50, 64, 76, 85, 92],
      },
      {
        id: "path-2",
        name: "Full-Stack Specialist & Cloud Track",
        skillGrowth: 76,
        probability: 66,
        months: 8,
        risk: "Medium" as const,
        base: [15, 25, 36, 48, 58, 68, 75],
      },
      {
        id: "path-3",
        name: "Accelerated Sprint to Production",
        skillGrowth: 60,
        probability: 56,
        months: 4,
        risk: "High" as const,
        base: [25, 42, 56, 64, 70, 72, 74],
      },
    ];
  }, [activeGoal]);

  const factor = hours / (activeGoal?.hoursPerWeek || 14);

  const computed = useMemo(
    () =>
      basePaths.map((p) => {
        const prob = Math.max(
          12,
          Math.min(98, Math.round(p.probability * (0.6 + 0.4 * factor) - delay * 3)),
        );
        const time = Math.max(1.5, Math.round((p.months / factor) * 10) / 10);
        const data = monthsLabels.map((m, i) => ({
          m,
          v: Math.min(
            100,
            Math.round((p.base[i] ?? 0) * (0.55 + 0.45 * factor) - (i > 0 ? delay * 2.5 : 0)),
          ),
        }));
        return { ...p, prob, time, data };
      }),
    [basePaths, factor, delay],
  );

  const best = computed.length > 0 ? computed.reduce((a, b) => (b.prob > a.prob ? b : a)) : null;

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
                    Probability
                  </p>
                </div>
                <div className="rounded-xl bg-muted/60 p-2.5">
                  <p className="font-display text-lg font-bold text-foreground">{p.skillGrowth}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Skill Score
                  </p>
                </div>
                <div className="rounded-xl bg-muted/60 p-2.5">
                  <p className="font-display text-lg font-bold text-foreground flex items-center justify-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {p.time}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Months
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
                      name="Projected Readiness"
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
            modeled goal achievement probability (<strong>{best.prob}%</strong>). It protects your
            learning momentum while remaining within safe cognitive load boundaries for your
            selected domain.
          </p>
        </Panel>
      )}
    </div>
  );
}
