import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Calculator, LineChart as LineIcon, MessageSquare } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AiTag, PageHeader, Panel } from "@/components/app/ui-bits";

export const Route = createFileRoute("/_shell/adapt")({
  head: () => ({
    meta: [
      { title: "Progress & Adapt — Trajectify.AI" },
      { name: "description", content: "See how your progress feeds back into an updated trajectory." },
      { property: "og:title", content: "Progress & Adapt — Trajectify.AI" },
      { property: "og:description", content: "Progress → Feedback → Recalculation." },
    ],
  }),
  component: Adapt,
});

const data = ["May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov"].map((m, i) => ({
  m,
  before: [10, 22, 34, 45, 56, 66, 74][i],
  after: [10, 24, 39, 52, 64, 75, 82][i],
}));

const loop = [
  { icon: LineIcon, t: "Progress", d: "62% done, 12-day streak", angle: -90, color: "var(--electric)" },
  { icon: MessageSquare, t: "Feedback", d: "React module faster than planned", angle: 30, color: "var(--violet)" },
  { icon: Calculator, t: "Recalculation", d: "Probability 68% → 74%", angle: 150, color: "var(--mint)" },
];

function Adapt() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Progress & Adapt" subtitle="Every week your real progress reshapes your future trajectory." action={<AiTag>Last recalculated today</AiTag>} />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Feedback loop">
          <div className="relative mx-auto aspect-square w-full max-w-sm">
            <motion.svg viewBox="0 0 200 200" className="absolute inset-0" animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} aria-hidden>
              <circle cx="100" cy="100" r="70" fill="none" stroke="var(--border)" strokeWidth="2" strokeDasharray="4 6" />
              <circle cx="100" cy="30" r="3" fill="var(--violet)" />
            </motion.svg>
            <div className="absolute inset-0 grid place-items-center">
              <div className="grid h-24 w-24 place-items-center rounded-full bg-gradient-primary text-center text-xs font-semibold text-primary-foreground shadow-glow">Your<br />trajectory</div>
            </div>
            {loop.map((l) => {
              const r = 40;
              const x = 50 + r * Math.cos((l.angle * Math.PI) / 180);
              const y = 50 + r * Math.sin((l.angle * Math.PI) / 180);
              return (
                <div key={l.t} className="absolute w-32 -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${x}%`, top: `${y}%` }}>
                  <div className="mx-auto grid h-11 w-11 place-items-center rounded-xl border bg-card shadow-soft" style={{ color: l.color }}><l.icon className="h-5 w-5" /></div>
                  <p className="mt-1 text-sm font-semibold">{l.t}</p>
                  <p className="text-[11px] text-muted-foreground">{l.d}</p>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel title="Trajectory: before vs after update">
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={data}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="m" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line dataKey="before" name="Before" stroke="var(--muted-foreground)" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                <Line dataKey="after" name="After update" stroke="var(--mint)" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[["Probability", "68% → 74%"], ["Finish date", "Dec → Nov"], ["Skill score", "+8 pts"]].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-muted p-3"><p className="font-display font-bold">{v}</p><p className="text-[11px] text-muted-foreground">{k}</p></div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
