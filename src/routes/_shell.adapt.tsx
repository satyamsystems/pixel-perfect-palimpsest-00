import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Calculator,
  Compass,
  LineChart as LineIcon,
  MessageSquare,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AiTag, EmptyState, PageHeader, Panel } from "@/components/app/ui-bits";
import { authService, AuthUser } from "@/services/authService";
import { dataService, UserProfile, Goal } from "@/services/dataService";

export const Route = createFileRoute("/_shell/adapt")({
  head: () => ({
    meta: [
      { title: "Progress & Adapt — Trajectify.AI" },
      {
        name: "description",
        content: "See how your weekly progress feeds back into an updated future trajectory.",
      },
      { property: "og:title", content: "Progress & Adapt — Trajectify.AI" },
    ],
  }),
  component: AdaptPage,
});

function AdaptPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl py-16 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-3 text-sm text-muted-foreground">
          Loading trajectory adaptation engine...
        </p>
      </div>
    );
  }

  const activeGoal = profile?.goals.find((g) => g.id === profile.activeGoalId) || profile?.goals[0];

  if (!profile || !activeGoal) {
    return (
      <div className="mx-auto max-w-4xl py-6">
        <PageHeader
          title="Progress & Adapt"
          subtitle="Progress → Feedback → Trajectory Recalculation."
        />
        <EmptyState
          title="No Active Trajectory Found"
          description="Complete your onboarding to activate the dynamic feedback loop that recalibrates your future trajectory every week."
          actionText="Start Profile Onboarding"
          onAction={() => navigate({ to: "/onboarding" })}
          icon={Compass}
        />
      </div>
    );
  }

  const loop = [
    {
      icon: LineIcon,
      t: "Progress",
      d: `${activeGoal.progress}% done, ${activeGoal.streak}-day streak`,
      angle: -90,
      color: "var(--primary)",
    },
    {
      icon: MessageSquare,
      t: "Check-In Feedback",
      d: `${activeGoal.checkIns.length} weekly check-ins recorded`,
      angle: 30,
      color: "var(--ai-highlight)",
    },
    {
      icon: Calculator,
      t: "Recalculation",
      d: `Current probability: ${activeGoal.probability}%`,
      angle: 150,
      color: "var(--success)",
    },
  ];

  const chartData = [
    { m: "Start", before: 10, after: 10 },
    { m: "M1", before: 25, after: 28 },
    { m: "M2", before: 40, after: 46 },
    { m: "M3", before: 55, after: 64 },
    { m: "M4", before: 70, after: 78 },
    { m: "Target", before: 82, after: Math.min(98, activeGoal.probability + 10) },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <PageHeader
        title="Progress & Adapt"
        subtitle={`Every week your real progress reshapes your future trajectory for "${activeGoal.title}".`}
        action={<AiTag>Recalibrated with latest check-in</AiTag>}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Animated Feedback Loop Graphic */}
        <Panel title="Continuous Adaptive Feedback Loop">
          <div className="relative mx-auto aspect-square w-full max-w-sm my-4">
            <motion.svg
              viewBox="0 0 200 200"
              className="absolute inset-0"
              animate={{ rotate: 360 }}
              transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
              aria-hidden="true"
            >
              <circle
                cx="100"
                cy="100"
                r="70"
                fill="none"
                stroke="var(--border)"
                strokeWidth="2"
                strokeDasharray="4 6"
              />
              <circle cx="100" cy="30" r="3.5" fill="var(--primary)" />
            </motion.svg>

            <div className="absolute inset-0 grid place-items-center">
              <div className="grid h-24 w-24 place-items-center rounded-full bg-gradient-primary text-center text-xs font-bold text-primary-foreground shadow-glow">
                Living
                <br />
                Trajectory
              </div>
            </div>

            {loop.map((l) => {
              const r = 40;
              const x = 50 + r * Math.cos((l.angle * Math.PI) / 180);
              const y = 50 + r * Math.sin((l.angle * Math.PI) / 180);
              return (
                <div
                  key={l.t}
                  className="absolute w-32 -translate-x-1/2 -translate-y-1/2 text-center"
                  style={{ left: `${x}%`, top: `${y}%` }}
                >
                  <div
                    className="mx-auto grid h-11 w-11 place-items-center rounded-xl border bg-card shadow-soft"
                    style={{ color: l.color }}
                  >
                    <l.icon className="h-5 w-5" />
                  </div>
                  <p className="mt-1.5 text-xs font-bold text-foreground">{l.t}</p>
                  <p className="text-[10px] text-muted-foreground">{l.d}</p>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Trajectory: Before vs After Recalculation Chart */}
        <Panel title="Trajectory Recalibration: Baseline vs Adjusted">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="m"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
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
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  dataKey="before"
                  name="Initial Baseline"
                  stroke="var(--muted-foreground)"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  dataKey="after"
                  name="Adaptive Trajectory"
                  stroke="var(--primary)"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl bg-muted/60 p-3">
              <p className="font-display font-bold text-sm text-foreground">
                {activeGoal.probability}%
              </p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                Probability
              </p>
            </div>
            <div className="rounded-xl bg-muted/60 p-3">
              <p className="font-display font-bold text-sm text-foreground">
                {activeGoal.targetDate}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                Target Horizon
              </p>
            </div>
            <div className="rounded-xl bg-muted/60 p-3">
              <p className="font-display font-bold text-sm text-foreground">
                {activeGoal.progress}%
              </p>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                Paced Growth
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
