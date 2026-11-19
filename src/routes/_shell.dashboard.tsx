import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Circle,
  Clock,
  Compass,
  Flame,
  LineChart as LineChartIcon,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  ComposedChart,
} from "recharts";
import { AiTag, EmptyState, PageHeader, Panel, ProgressRing } from "@/components/app/ui-bits";
import { authService, AuthUser } from "@/services/authService";
import { dataService, UserProfile, Goal } from "@/services/dataService";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Trajectify.AI" },
      {
        name: "description",
        content:
          "Track goal progress, trajectory probability, 6-dimension profile and living milestones.",
      },
      { property: "og:title", content: "Dashboard — Trajectify.AI" },
    ],
  }),
  component: DashboardPage,
});

const tipStyle = {
  contentStyle: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    fontSize: 12,
    color: "var(--foreground)",
    boxShadow: "var(--shadow-soft)",
  },
};

function Gauge({ value }: { value: number }) {
  const angle = Math.min(180, Math.max(0, (value / 100) * 180));
  const rad = (Math.PI * (180 - angle)) / 180;
  const x = 100 + 80 * Math.cos(rad);
  const y = 100 - 80 * Math.sin(rad);

  return (
    <svg
      viewBox="0 0 200 115"
      className="w-full max-w-[220px]"
      role="img"
      aria-label={`Goal achievement probability: ${value}%`}
    >
      <defs>
        <linearGradient id="gauge-grad" x1="0" x2="1">
          <stop offset="0%" stopColor="var(--warning)" />
          <stop offset="50%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--success)" />
        </linearGradient>
      </defs>
      <path
        d="M20 100 A80 80 0 0 1 180 100"
        stroke="var(--muted)"
        strokeWidth="14"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M20 100 A80 80 0 0 1 ${x} ${y}`}
        stroke="url(#gauge-grad)"
        strokeWidth="14"
        fill="none"
        strokeLinecap="round"
        className="draw-path"
      />
      <circle cx={x} cy={y} r="7" fill="var(--card)" stroke="var(--primary)" strokeWidth="3" />
      <text
        x="100"
        y="92"
        textAnchor="middle"
        fontSize="30"
        fontWeight="800"
        fill="var(--foreground)"
        fontFamily="var(--font-display)"
      >
        {value}%
      </text>
    </svg>
  );
}

function DashboardPage() {
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

    dataService.getStudentDashboardData(cur.id).then((p) => {
      setProfile(p);
      setLoading(false);
    });
  }, [navigate]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl py-16 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-3 text-sm text-muted-foreground">Loading your trajectory dashboard...</p>
      </div>
    );
  }

  const activeGoal = profile?.goals.find((g) => g.id === profile.activeGoalId) || profile?.goals[0];

  // EMPTY STATE (Until a profile is created)
  if (!profile || !activeGoal) {
    return (
      <div className="mx-auto max-w-4xl py-6">
        <PageHeader
          title={`Welcome, ${user?.name ? user.name.split(" ")[0] : "Friend"}`}
          subtitle="Your personal future simulation canvas is ready."
        />
        <EmptyState
          title="No Active Trajectory Found"
          description="You haven't calibrated your goal, skills, or roadmap yet. Complete the quick 2-minute onboarding to generate your multidimensional trajectory."
          actionText="Start Profile Onboarding"
          onAction={() => navigate({ to: "/onboarding" })}
          icon={Compass}
        />
      </div>
    );
  }

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";

  const nextTask =
    activeGoal.roadmap.flatMap((m) => m.tasks).find((t) => !t.done)?.label ||
    "All scheduled milestone deliverables completed!";

  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const streakGrid = Array.from({ length: 28 }, (_, i) =>
    i % 8 === 3 ? 0 : i % 5 === 0 ? 1 : i > 14 ? 3 : 2,
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title={`${greeting}, ${user?.name ? user.name.split(" ")[0] : "there"}`}
        subtitle="Here is where your trajectory stands today."
        action={
          <div className="flex items-center gap-2.5">
            <Link
              to="/checkin"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-soft transition hover:opacity-95"
            >
              <CalendarCheck className="h-4 w-4" /> Weekly Check-In
            </Link>
            <AiTag>Live Calibration</AiTag>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Active Goal Hero Card */}
        <Panel className="bg-gradient-hero text-on-dark lg:col-span-2 border border-white/10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Active Goal · {activeGoal.domain}
              </span>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                {activeGoal.title}
              </h2>
              <div className="flex flex-wrap gap-4 text-xs opacity-90 pt-2">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" /> {activeGoal.hoursPerWeek} hrs/week
                </span>
                <span className="flex items-center gap-1.5">
                  <Target className="h-4 w-4 text-accent" /> Target: {activeGoal.targetDate}
                </span>
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-success" /> Streak: {activeGoal.streak} days
                </span>
              </div>
            </div>
            <div className="glass rounded-2xl p-3 shrink-0 self-start md:self-auto">
              <ProgressRing value={activeGoal.progress} label="complete" color="var(--primary)" />
            </div>
          </div>
        </Panel>

        {/* Goal Achievement Probability */}
        <Panel title="Achievement Probability">
          <div className="flex flex-col items-center justify-center pt-2">
            <Gauge value={activeGoal.probability} />
            <div className="mt-2 text-center text-xs text-muted-foreground">
              <span className="font-bold text-foreground">
                {activeGoal.probability >= 75 ? "High Confidence" : "Moderate Confidence"}
              </span>{" "}
              based on current pace and skill baseline.
            </div>
          </div>
        </Panel>

        {/* 6-Dimension Profile Radar */}
        <Panel title="6-Dimension Readiness Matrix">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={activeGoal.dimensions} outerRadius="62%">
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis
                  dataKey="dim"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontWeight: 500 }}
                />
                <Radar
                  dataKey="value"
                  name="Proficiency"
                  stroke="var(--ai-highlight)"
                  fill="var(--ai-highlight)"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
                <Tooltip {...tipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Weekly Time Invested & Hours Trend */}
        <Panel
          title="Weekly Time Investment & Trend"
          className="lg:col-span-2"
          action={
            <span className="text-xs text-muted-foreground font-medium">
              Target: {activeGoal.hoursPerWeek} hrs
            </span>
          }
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeGoal.weeklyHours}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="week"
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
                <Tooltip {...tipStyle} cursor={{ fill: "var(--muted)", opacity: 0.5 }} />
                <Bar
                  dataKey="hours"
                  name="Hours Logged"
                  fill="var(--primary)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Milestone Timeline preview */}
        <Panel
          title="Milestone Timeline"
          className="lg:col-span-2"
          action={
            <Link to="/roadmap" className="text-xs font-semibold text-primary hover:underline">
              Full AI Roadmap →
            </Link>
          }
        >
          <ol className="relative space-y-4 border-l-2 border-border pl-6">
            {activeGoal.roadmap.map((m) => (
              <li key={m.id} className="relative">
                <span className="absolute -left-[33px] top-0.5 grid h-5 w-5 place-items-center rounded-full bg-card">
                  {m.status === "Done" ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : m.status === "In progress" ? (
                    <Circle className="h-5 w-5 fill-primary text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </span>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground">{m.title}</p>
                  <p className="text-xs text-muted-foreground font-mono">{m.month}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{m.outcome}</p>
              </li>
            ))}
          </ol>
        </Panel>

        {/* Next Best Action & Consistency */}
        <div className="flex flex-col gap-5">
          <Panel ai title="Next Best Action" action={<AiTag />}>
            <p className="text-sm font-bold text-foreground">"{nextTask}"</p>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
              Completing this primary milestone task keeps your momentum high and stabilizes goal
              achievement probability.
            </p>
            <div className="mt-4 flex gap-2">
              <Link
                to="/roadmap"
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-soft"
              >
                Open Roadmap <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Panel>

          <Panel
            title="Consistency Streak"
            action={
              <span className="flex items-center gap-1 text-xs font-bold text-foreground">
                <Flame className="h-4 w-4 text-warning" /> {activeGoal.streak}-day streak
              </span>
            }
          >
            <div className="grid grid-cols-7 gap-1.5">
              {days.map((d, i) => (
                <span key={i} className="text-center text-[10px] text-muted-foreground">
                  {d}
                </span>
              ))}
              {streakGrid.map((v, i) => (
                <span
                  key={i}
                  className="aspect-square rounded-md transition"
                  style={{
                    background:
                      v === 0
                        ? "var(--muted)"
                        : `color-mix(in srgb, var(--primary) ${v * 28}%, var(--muted))`,
                  }}
                />
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
