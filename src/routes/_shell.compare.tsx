import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Award, Clock } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Slider } from "@/components/ui/slider";
import { AiTag, PageHeader, Panel, RiskBadge } from "@/components/app/ui-bits";
import { paths } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/compare")({
  head: () => ({
    meta: [
      { title: "What-If Comparison — Trajectify.AI" },
      { name: "description", content: "Compare career paths side by side with live projections." },
      { property: "og:title", content: "What-If Comparison — Trajectify.AI" },
      { property: "og:description", content: "Simulate different paths and see which future fits you." },
    ],
  }),
  component: Compare,
});

const colors = ["var(--mint)", "var(--electric)", "var(--amber)"];
const months = ["Now", "M1", "M2", "M3", "M4", "M5", "M6"];

function Compare() {
  const [hours, setHours] = useState(14);
  const [delay, setDelay] = useState(0);
  const factor = hours / 14;

  const computed = useMemo(
    () =>
      paths.map((p) => {
        const prob = Math.max(10, Math.min(97, Math.round(p.probability * (0.6 + 0.4 * factor) - delay * 3)));
        const time = Math.max(2, Math.round((p.months / factor) * 10) / 10);
        const data = months.map((m, i) => ({ m, v: Math.min(100, Math.round(p.base[i] * (0.55 + 0.45 * factor) - (i > 0 ? delay * 2 : 0))) }));
        return { ...p, prob, time, data };
      }),
    [factor, delay],
  );
  const best = computed.reduce((a, b) => (b.prob > a.prob ? b : a));

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="What-If Comparison" subtitle="Adjust your inputs and watch each possible future update live." />

      <Panel title="Decision sliders" className="mb-5">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <div className="mb-3 flex justify-between text-sm"><span>Hours per week</span><span className="font-semibold">{hours} hrs</span></div>
            <Slider value={[hours]} min={4} max={30} step={1} onValueChange={(v) => setHours(v[0])} aria-label="Hours per week" />
          </div>
          <div>
            <div className="mb-3 flex justify-between text-sm"><span>Start date</span><span className="font-semibold">{delay === 0 ? "This week" : `In ${delay} month${delay > 1 ? "s" : ""}`}</span></div>
            <Slider value={[delay]} min={0} max={4} step={1} onValueChange={(v) => setDelay(v[0])} aria-label="Start delay in months" />
          </div>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-3">
        {computed.map((p, i) => (
          <Panel key={p.id} className={cn("relative", p.id === best.id && "ring-2 ring-violet")}>
            {p.id === best.id && (
              <span className="absolute -top-3 left-5 inline-flex items-center gap-1 rounded-full bg-gradient-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-glow">
                <Award className="h-3.5 w-3.5" /> Recommended path
              </span>
            )}
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-semibold">{p.name}</h2>
              <RiskBadge risk={p.risk} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-muted p-3"><p className="font-display text-xl font-bold">{p.prob}%</p><p className="text-[11px] text-muted-foreground">Goal probability</p></div>
              <div className="rounded-xl bg-muted p-3"><p className="font-display text-xl font-bold">{p.skillGrowth}</p><p className="text-[11px] text-muted-foreground">Skill growth</p></div>
              <div className="rounded-xl bg-muted p-3"><p className="flex items-center justify-center gap-1 font-display text-xl font-bold"><Clock className="h-4 w-4" />{p.time}</p><p className="text-[11px] text-muted-foreground">Months</p></div>
            </div>
            <div className="mt-4 h-36">
              <ResponsiveContainer>
                <LineChart data={p.data}>
                  <XAxis dataKey="m" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
                  <Line type="monotone" dataKey="v" name="Projected growth" stroke={colors[i]} strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        ))}
      </div>

      <Panel ai className="mt-5" title="Why this path?" action={<AiTag />}>
        <p className="text-sm leading-relaxed">
          <span className="font-semibold">{best.name}</span> gives you the highest goal probability ({best.prob}%) at {hours} hrs/week. It builds directly on your
          HTML/CSS and JavaScript foundations, has strong junior hiring demand in Pune and Bengaluru, and carries {best.risk.toLowerCase()} risk because every month ends with a shippable project.
        </p>
      </Panel>
    </div>
  );
}
