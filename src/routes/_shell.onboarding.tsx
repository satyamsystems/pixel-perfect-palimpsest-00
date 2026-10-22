import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Briefcase, Dumbbell, Plus, Repeat, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { PageHeader, ProgressRing } from "@/components/app/ui-bits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_shell/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your profile — Trajectify.AI" },
      { name: "description", content: "Tell Trajectify your goal, skills and available time." },
      { property: "og:title", content: "Set up your profile — Trajectify.AI" },
      { property: "og:description", content: "Build your personal profile in under 2 minutes." },
    ],
  }),
  component: Onboarding,
});

const domains = [
  { id: "Career / Skills", icon: Briefcase },
  { id: "Fitness", icon: Dumbbell },
  { id: "Finance", icon: Wallet },
  { id: "Habits", icon: Repeat },
];
const stepNames = ["Domain", "Goal", "Skills", "Time", "Review"];

function Onboarding() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [domain, setDomain] = useState("Career / Skills");
  const [goal, setGoal] = useState("Become a Full-Stack Web Developer in 6 months");
  const [skills, setSkills] = useState([
    { name: "HTML/CSS", level: 7 },
    { name: "JavaScript", level: 5 },
    { name: "Python", level: 4 },
  ]);
  const [newSkill, setNewSkill] = useState("");
  const [hours, setHours] = useState(14);

  const strength = Math.min(100, (domain ? 15 : 0) + (goal.length > 10 ? 25 : 0) + Math.min(35, skills.length * 9) + (hours >= 6 ? 25 : 10));

  const body = [
    <div key="d" className="grid gap-3 sm:grid-cols-2">
      {domains.map((d) => (
        <button key={d.id} onClick={() => setDomain(d.id)} className={cn("card-surface lift flex items-center gap-3 p-5 text-left", domain === d.id && "ring-2 ring-electric")}>
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-violet"><d.icon className="h-5 w-5" /></div>
          <span className="font-semibold">{d.id}</span>
        </button>
      ))}
    </div>,
    <div key="g">
      <label htmlFor="goal" className="text-sm font-medium">Describe your goal</label>
      <textarea id="goal" value={goal} onChange={(e) => setGoal(e.target.value)} rows={4} className="mt-2 w-full rounded-xl border bg-card p-4 outline-none focus:border-electric" />
      <p className="mt-2 text-xs text-muted-foreground">Tip: include a role and a time frame.</p>
    </div>,
    <div key="s" className="space-y-4">
      {skills.map((s, i) => (
        <div key={s.name} className="card-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="rounded-full bg-electric/15 px-3 py-1 text-sm font-semibold text-electric">{s.name}</span>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Level {s.level}/10</span>
              <button aria-label={`Remove ${s.name}`} onClick={() => setSkills(skills.filter((_, j) => j !== i))}><X className="h-4 w-4" /></button>
            </div>
          </div>
          <Slider value={[s.level]} min={1} max={10} step={1} onValueChange={(v) => setSkills(skills.map((x, j) => (j === i ? { ...x, level: v[0] } : x)))} aria-label={`${s.name} level`} />
        </div>
      ))}
      <form onSubmit={(e) => { e.preventDefault(); if (newSkill.trim()) { setSkills([...skills, { name: newSkill.trim(), level: 3 }]); setNewSkill(""); } }} className="flex gap-2">
        <label htmlFor="ns" className="sr-only">Add skill</label>
        <input id="ns" value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="Add a skill, e.g. Git" className="flex-1 rounded-xl border bg-card px-4 py-2.5 text-sm outline-none focus:border-electric" />
        <button className="flex items-center gap-1 rounded-xl border bg-card px-4 text-sm font-semibold"><Plus className="h-4 w-4" /> Add</button>
      </form>
    </div>,
    <div key="t" className="card-surface p-6">
      <div className="mb-4 flex items-baseline justify-between"><span className="font-medium">Available time per week</span><span className="font-display text-3xl font-bold">{hours} hrs</span></div>
      <Slider value={[hours]} min={2} max={40} step={1} onValueChange={(v) => setHours(v[0])} aria-label="Hours per week" />
      <p className="mt-4 text-sm text-muted-foreground">≈ {Math.round((hours / 7) * 10) / 10} hrs/day. Most students reaching this goal invest 12–18 hrs/week.</p>
    </div>,
    <div key="r" className="card-surface divide-y">
      {[["Domain", domain], ["Goal", goal], ["Skills", skills.map((s) => `${s.name} (${s.level})`).join(", ")], ["Time", `${hours} hrs/week`]].map(([k, v]) => (
        <div key={k} className="flex gap-4 p-4"><span className="w-20 shrink-0 text-sm text-muted-foreground">{k}</span><span className="text-sm font-medium">{v}</span></div>
      ))}
    </div>,
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Personal Profile Engine" subtitle={`Step ${step + 1} of 5 · ${stepNames[step]}`} />
      <Progress value={((step + 1) / 5) * 100} className="mb-8 h-2" />
      <div className="grid gap-8 lg:grid-cols-[1fr_240px]">
        <div>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              {body[step]}
            </motion.div>
          </AnimatePresence>
          <div className="mt-8 flex justify-between">
            <button disabled={step === 0} onClick={() => setStep(step - 1)} className="rounded-xl border bg-card px-5 py-2.5 text-sm font-semibold disabled:opacity-40">Back</button>
            <button
              onClick={() => { if (step < 4) setStep(step + 1); else { toast.success("Trajectory generated!", { description: "Your roadmap and simulations are ready." }); nav({ to: "/dashboard" }); } }}
              className="rounded-xl bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              {step < 4 ? "Continue" : "Generate my trajectory"}
            </button>
          </div>
        </div>
        <aside className="card-surface h-fit p-5 text-center">
          <p className="mb-3 text-sm font-semibold">Profile strength</p>
          <ProgressRing value={strength} color="var(--violet)" />
          <p className="mt-3 text-xs text-muted-foreground">Add more skills to sharpen your simulation.</p>
        </aside>
      </div>
    </div>
  );
}
