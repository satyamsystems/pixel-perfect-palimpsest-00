import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Brain, Compass, Eye, GitCompare, Heart, LineChart, Map, MessageCircle, MessagesSquare, RefreshCw, Target, User } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { TrajectoryArt } from "@/components/brand/TrajectoryArt";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Trajectify.AI — Simulate your future. Decide today." },
      { name: "description", content: "AI-powered platform that simulates a student's future, compares career paths and builds a month-by-month roadmap." },
      { property: "og:title", content: "Trajectify.AI — Simulate your future. Decide today." },
      { property: "og:description", content: "Compare paths, get an AI roadmap and track progress toward your goal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const fade = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };

const problem = [
  { icon: MessagesSquare, t: "Says", d: "“Everyone's learning something different. I don't know what to pick.”" },
  { icon: Brain, t: "Thinks", d: "“What if I spend 6 months on the wrong skill and fall behind?”" },
  { icon: Eye, t: "Does", d: "Jumps between YouTube courses, never finishes, rarely tracks progress." },
  { icon: Heart, t: "Feels", d: "Anxious, overwhelmed and unsure whether today's effort pays off." },
];
const features = [
  { icon: User, t: "Personal Profile Engine", d: "Captures your goal, skills, and time to model your starting point across 6 dimensions." },
  { icon: GitCompare, t: "What-If Simulator", d: "Compare paths side by side: probability, time, risk and projected growth." },
  { icon: Map, t: "AI Roadmap", d: "A month-by-month plan with weekly tasks, resources and expected outcomes." },
  { icon: LineChart, t: "Progress & Assistant", d: "Track milestones, keep streaks, and ask your plan questions anytime." },
];
const steps = [
  { icon: User, t: "User", d: "Goal + current state" },
  { icon: Target, t: "Goal Analysis", d: "Domain + 6 dimensions" },
  { icon: Brain, t: "AI Engine", d: "Roadmap + what-if" },
  { icon: LineChart, t: "Progress", d: "Track milestones" },
  { icon: RefreshCw, t: "Adapt", d: "Update trajectory" },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden bg-gradient-hero text-on-dark">
        <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Logo light />
          <nav className="hidden items-center gap-8 text-sm opacity-80 md:flex">
            <a href="#problem" className="hover:opacity-100">Problem</a>
            <a href="#features" className="hover:opacity-100">Features</a>
            <a href="#how" className="hover:opacity-100">How it works</a>
          </nav>
          <Link to="/dashboard" className="glass rounded-xl px-4 py-2 text-sm font-semibold">Open app</Link>
        </header>
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 pb-24 pt-12 lg:grid-cols-2 lg:pt-20">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="glass inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold">
              <span className="h-2 w-2 rounded-full bg-mint" /> Simulate your future. Decide today.
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-[1.05] md:text-6xl">
              Simulate your future to guide <span className="text-gradient">today's decisions</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg opacity-80">
              Set a goal, compare possible paths, and get a living month-by-month roadmap that adapts as you grow.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/onboarding" className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-6 py-3.5 font-semibold text-primary-foreground shadow-glow transition hover:-translate-y-0.5">
                Start your trajectory <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/dashboard" className="glass inline-flex items-center gap-2 rounded-xl px-6 py-3.5 font-semibold">
                <Compass className="h-4 w-4" /> View demo dashboard
              </Link>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }} className="glass rounded-3xl p-4">
            <TrajectoryArt className="w-full" />
          </motion.div>
        </div>
      </section>

      <section id="problem" className="mx-auto max-w-7xl px-6 py-24">
        <motion.div {...fade} className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-electric">The problem</p>
          <h2 className="mt-2 text-3xl font-bold md:text-4xl">Students make big decisions with no way to see where they lead.</h2>
        </motion.div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {problem.map((p, i) => (
            <motion.div key={p.t} {...fade} transition={{ delay: i * 0.08, duration: 0.5 }} className="card-surface lift p-6">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-violet"><p.icon className="h-5 w-5" /></div>
              <h3 className="mt-4 text-lg font-semibold">{p.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{p.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="features" className="bg-secondary/60 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div {...fade} className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-electric">Four modules</p>
            <h2 className="mt-2 text-3xl font-bold md:text-4xl">Everything you need to choose, plan and grow.</h2>
          </motion.div>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {features.map((f, i) => (
              <motion.div key={f.t} {...fade} transition={{ delay: i * 0.08, duration: 0.5 }} className="card-surface lift flex gap-5 p-7">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground"><f.icon className="h-5 w-5" /></div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Module {i + 1}</p>
                  <h3 className="mt-1 text-xl font-semibold">{f.t}</h3>
                  <p className="mt-2 text-muted-foreground">{f.d}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-7xl px-6 py-24">
        <motion.h2 {...fade} className="text-center text-3xl font-bold md:text-4xl">How it works</motion.h2>
        <div className="relative mt-14 grid gap-6 md:grid-cols-5">
          <div className="absolute left-0 right-0 top-7 hidden h-0.5 bg-gradient-primary opacity-40 md:block" />
          {steps.map((s, i) => (
            <motion.div key={s.t} {...fade} transition={{ delay: i * 0.1, duration: 0.5 }} className="relative text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border bg-card text-electric shadow-soft"><s.icon className="h-6 w-6" /></div>
              <p className="mt-4 font-display font-semibold">{i + 1}. {s.t}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-16 text-center">
          <Link to="/onboarding" className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-6 py-3.5 font-semibold text-primary-foreground shadow-soft">
            Start your trajectory <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="bg-gradient-hero text-on-dark">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-12 md:flex-row md:items-center md:justify-between">
          <div>
            <Logo light />
            <p className="mt-3 max-w-sm text-sm opacity-70">Simulate your future. Decide today.</p>
          </div>
          <div className="text-sm opacity-80 md:text-right">
            <p className="flex items-center gap-2 md:justify-end"><MessageCircle className="h-4 w-4" /> Built by Team Trajectify</p>
            <p className="mt-1">A student project at MIT-ADT University, Pune</p>
            <p className="mt-1 opacity-60">© 2026 Trajectify.AI</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
