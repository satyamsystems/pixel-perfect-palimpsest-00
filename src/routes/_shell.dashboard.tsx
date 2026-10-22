import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Circle, Clock, Flame, Target, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AiTag, PageHeader, Panel, ProgressRing } from "@/components/app/ui-bits";
import { dimensions, roadmap, student, weeklyHours } from "@/lib/mock-data";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Trajectify.AI" },
      { name: "description", content: "Track goal progress, probability, 6-dimension profile and milestones." },
      { property: "og:title", content: "Dashboard — Trajectify.AI" },
      { property: "og:description", content: "Your progress dashboard on Trajectify.AI." },
    ],
  }),
  component: Dashboard,
});

const tip = { contentStyle: { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 } };

function Gauge({ value }: { value: number }) {
  const angle = (value / 100) * 180;
  const rad = (Math.PI * (180 - angle)) / 180;
  const x = 100 + 80 * Math.cos(rad);
  const y = 100 - 80 * Math.sin(rad);
  return (
    <svg viewBox="0 0 200 115" className="w-full max-w-[220px]" role="img" aria-label={`Goal probability ${value}%`}>
      <defs>
        <linearGradient id="gauge" x1="0" x2="1">
          <stop offset="0" stopColor="var(--amber)" />
          <stop offset="0.5" stopColor="var(--electric)" />
          <stop offset="1" stopColor="var(--mint)" />
        </linearGradient>
      </defs>
      <path d="M20 100 A80 80 0 0 1 180 100" stroke="var(--muted)" strokeWidth="14" fill="none" strokeLinecap="round" />
      <path d={`M20 100 A80 80 0 0 1 ${x} ${y}`} stroke="url(#gauge)" strokeWidth="14" fill="none" strokeLinecap="round" className="draw-path" />
      <circle cx={x} cy={y} r="7" fill="var(--card)" stroke="var(--electric)" strokeWidth="3" />
      <text x="100" y="92" textAnchor="middle" fontSize="30" fontWeight="700" fill="var(--foreground)" fontFamily="var(--font-display)">{value}%</text>
    </svg>
  );
}

function Dashboard() {
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const streakGrid = Array.from({ length: 28 }, (_, i) => (i % 9 === 4 ? 0 : i % 5 === 0 ? 1 : i > 15 ? 3 : 2));
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={`Good afternoon, ${student.name.split(" ")[0]}`} subtitle="Here's where your trajectory stands today." action={<AiTag>Updated 2h ago</AiTag>} />

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel className="bg-gradient-hero text-on-dark lg:col-span-2">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm opacity-70">Active goal · {student.domain}</p>
              <h2 className="mt-1 text-2xl font-bold">{student.goal}</h2>
              <div className="mt-4 flex flex-wrap gap-4 text-sm opacity-85">
                <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {student.hoursPerWeek} hrs/week</span>
                <span className="flex items-center gap-1.5"><Target className="h-4 w-4" /> Target {student.targetDate}</span>
                <span className="flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-mint" /> 4 days ahead</span>
              </div>
            </div>
            <div className="glass rounded-2xl p-3">
              <ProgressRing value={student.progress} label="complete" color="var(--mint)" />
            </div>
          </div>
        </Panel>

        <Panel title="Goal achievement probability">
          <div className="flex flex-col items-center">
            <Gauge value={student.probability} />
            <p className="mt-2 text-center text-sm text-muted-foreground"><span className="font-semibold text-foreground">+6%</span> since last month</p>
          </div>
        </Panel>

        <Panel title="6-dimension profile">
          <div className="h-64">
            <ResponsiveContainer>
              <RadarChart data={dimensions} outerRadius="62%">
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="dim" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <Radar dataKey="value" stroke="var(--violet)" fill="var(--violet)" fillOpacity={0.3} strokeWidth={2} />
                <Tooltip {...tip} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Weekly time invested" className="lg:col-span-2" action={<span className="text-xs text-muted-foreground">Target 14 hrs</span>}>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={weeklyHours}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="week" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip {...tip} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="hours" fill="var(--electric)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Milestone timeline" className="lg:col-span-2" action={<Link to="/roadmap" className="text-sm font-semibold text-electric">Full roadmap</Link>}>
          <ol className="relative space-y-4 border-l-2 border-border pl-6">
            {roadmap.map((m) => (
              <li key={m.month} className="relative">
                <span className="absolute -left-[33px] top-0.5 grid h-5 w-5 place-items-center rounded-full bg-card">
                  {m.status === "Done" ? <CheckCircle2 className="h-5 w-5 text-mint" /> : m.status === "In progress" ? <Circle className="h-5 w-5 fill-electric text-electric" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                </span>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{m.month}</p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>

        <div className="flex flex-col gap-5">
          <Panel ai title="Next best action" action={<AiTag />}>
            <p className="font-semibold">Finish “Data fetching with TanStack Query”</p>
            <p className="mt-1 text-sm text-muted-foreground">Completing this unlocks your task-manager project and raises goal probability by ~3%.</p>
            <Link to="/roadmap" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Start now <ArrowRight className="h-4 w-4" />
            </Link>
          </Panel>
          <Panel title="Consistency" action={<span className="flex items-center gap-1 text-sm font-semibold"><Flame className="h-4 w-4 text-amber" /> {student.streak}-day streak</span>}>
            <div className="grid grid-cols-7 gap-1.5">
              {days.map((d, i) => <span key={i} className="text-center text-[10px] text-muted-foreground">{d}</span>)}
              {streakGrid.map((v, i) => (
                <span key={i} className="aspect-square rounded-md" style={{ background: v === 0 ? "var(--muted)" : `color-mix(in oklab, var(--mint) ${v * 30}%, var(--muted))` }} />
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
