import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  CalendarCheck,
  Compass,
  Eye,
  GitCompare,
  Heart,
  LineChart,
  Map,
  MessageCircle,
  MessagesSquare,
  RefreshCw,
  Sparkles,
  Target,
  User,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { TrajectoryArt } from "@/components/brand/TrajectoryArt";
import { authService, AuthUser } from "@/services/authService";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Trajectify.AI | Simulate your future. Decide today." },
      {
        name: "description",
        content:
          "Trajectify.AI simulates your future, compares career paths, and generates an adaptive month-by-month roadmap based on your real weekly hours.",
      },
      { property: "og:title", content: "Trajectify.AI | Simulate your future. Decide today." },
      {
        property: "og:description",
        content:
          "Compare paths, get an AI roadmap, track progress, and adapt your trajectory every week.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Trajectify.AI | Simulate your future. Decide today." },
      {
        name: "twitter:description",
        content:
          "Simulate your future. Decide today. Trajectify.AI maps your goals, simulates career paths, and keeps you on an adaptive roadmap.",
      },
    ],
  }),
  component: Landing,
});

const fade = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
};

const problem = [
  {
    icon: MessagesSquare,
    t: "Says",
    d: "“Everyone around me is learning something different. I don't know what to commit to.”",
  },
  {
    icon: Brain,
    t: "Thinks",
    d: "“What if I spend 6 months on the wrong skills and fall behind the market?”",
  },
  {
    icon: Eye,
    t: "Does",
    d: "Jumps between scattered courses, leaves projects unfinished, rarely measures progress.",
  },
  {
    icon: Heart,
    t: "Feels",
    d: "Anxious, overwhelmed, and unsure whether today's hours will actually pay off.",
  },
];

const features = [
  {
    icon: User,
    t: "Personal Profile Engine",
    d: "Captures your target goal, skill ratings, and available hours to model your starting baseline across 6 dimensions.",
  },
  {
    icon: GitCompare,
    t: "What-If Simulator",
    d: "Compare future paths side by side: live probability curves, time horizons, risks, and projected skill growth.",
  },
  {
    icon: Map,
    t: "Adaptive AI Roadmap",
    d: "A structured month-by-month plan with weekly tasks, curated resources, and clear tangible deliverables.",
  },
  {
    icon: CalendarCheck,
    t: "Weekly Check-In & Assistant",
    d: "Record actual hours, energy levels, and completed tasks to receive structured AI updates that keep your roadmap fresh.",
  },
];

const steps = [
  { icon: User, t: "Your Profile", d: "Goal, skills & available hours" },
  { icon: Target, t: "Goal Analysis", d: "Domain & 6-dimension baseline" },
  { icon: Brain, t: "AI Synthesis", d: "Roadmap & What-If models" },
  { icon: LineChart, t: "Weekly Check-In", d: "Hours, mood & shipped tasks" },
  { icon: RefreshCw, t: "Adaptive Recalibration", d: "Updated living trajectory" },
];

function Landing() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setCurrentUser(authService.getCurrentUser());
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-hero text-on-dark border-b border-white/10">
        <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Logo theme="light" size={34} />
          <nav className="hidden items-center gap-8 text-sm opacity-85 font-medium md:flex">
            <a href="#problem" className="hover:opacity-100 transition">
              Problem
            </a>
            <a href="#features" className="hover:opacity-100 transition">
              Modules
            </a>
            <a href="#how" className="hover:opacity-100 transition">
              How It Works
            </a>
          </nav>
          <div className="flex items-center gap-3">
            {currentUser ? (
              <Link
                to="/dashboard"
                className="glass rounded-xl px-5 py-2.5 text-xs font-bold transition hover:bg-white/20"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:inline-block text-xs font-semibold hover:opacity-100 opacity-80 px-3 py-2"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="rounded-xl bg-gradient-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-soft transition hover:opacity-95"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 pb-24 pt-12 lg:grid-cols-2 lg:pt-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-bold text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" /> Simulate your future. Decide
              today.
            </span>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.08] tracking-tight md:text-6xl text-white">
              Simulate your future to guide <span className="text-gradient">today's decisions</span>
            </h1>
            <p className="mt-6 max-w-lg text-base md:text-lg opacity-85 leading-relaxed">
              Set your target goal, compare possible paths side by side, and get a living
              month-by-month roadmap that adapts every week as you invest real hours.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={currentUser ? "/dashboard" : "/signup"}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-6 py-3.5 text-sm font-bold text-primary-foreground shadow-glow transition hover:-translate-y-0.5"
              >
                Start your trajectory <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/dashboard"
                className="glass inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition hover:bg-white/20"
              >
                <Compass className="h-4 w-4 text-primary" /> Open Application
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="glass rounded-3xl p-5"
          >
            <TrajectoryArt className="w-full h-auto" />
          </motion.div>
        </div>
      </section>

      {/* PROBLEM SECTION */}
      <section id="problem" className="mx-auto max-w-7xl px-6 py-24">
        <motion.div {...fade} className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            The Uncertainty Challenge
          </p>
          <h2 className="mt-2 font-display text-3xl font-extrabold md:text-4xl">
            People make critical decisions with no way to see where they lead.
          </h2>
        </motion.div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {problem.map((p, i) => (
            <motion.div
              key={p.t}
              {...fade}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="card-surface lift p-6 flex flex-col justify-between"
            >
              <div>
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <p.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-foreground">{p.t}</h3>
                <p className="mt-2 text-xs md:text-sm text-muted-foreground leading-relaxed">
                  {p.d}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FOUR MODULES */}
      <section id="features" className="bg-secondary/40 py-24 border-y">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div {...fade} className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-widest text-primary">
              Core Architecture
            </p>
            <h2 className="mt-2 font-display text-3xl font-extrabold md:text-4xl">
              Everything you need to choose, plan, and grow.
            </h2>
          </motion.div>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {features.map((f, i) => (
              <motion.div
                key={f.t}
                {...fade}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="card-surface lift flex gap-5 p-7"
              >
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-soft">
                  <f.icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-primary tracking-wider">
                    Module {i + 1}
                  </p>
                  <h3 className="mt-1 font-display text-xl font-bold text-foreground">{f.t}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.d}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-7xl px-6 py-24">
        <motion.h2
          {...fade}
          className="text-center font-display text-3xl font-extrabold md:text-4xl"
        >
          How Trajectify Works
        </motion.h2>
        <p className="text-center text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          A continuous loop that turns daily consistency into predictable outcomes.
        </p>

        <div className="relative mt-16 grid gap-6 md:grid-cols-5">
          <div className="absolute left-0 right-0 top-7 hidden h-0.5 bg-gradient-primary opacity-30 md:block" />
          {steps.map((s, i) => (
            <motion.div
              key={s.t}
              {...fade}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="relative text-center"
            >
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border bg-card text-primary shadow-soft">
                <s.icon className="h-6 w-6" />
              </div>
              <p className="mt-4 font-display font-bold text-foreground text-sm">
                {i + 1}. {s.t}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{s.d}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link
            to={currentUser ? "/dashboard" : "/signup"}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-7 py-3.5 font-bold text-sm text-primary-foreground shadow-soft hover:opacity-95 transition"
          >
            Start your trajectory <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gradient-hero text-on-dark border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-12 md:flex-row md:items-center md:justify-between">
          <div>
            <Logo theme="light" size={32} />
            <p className="mt-3 max-w-sm text-xs opacity-75 leading-relaxed">
              Simulate your future. Decide today. Predictive decision platform engineered for career
              and skill acceleration.
            </p>
          </div>
          <div className="text-xs opacity-80 md:text-right space-y-1">
            <p className="flex items-center gap-1.5 md:justify-end font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Engineered by Team Trajectify
            </p>
            <p className="opacity-70">A student initiative at MIT-ADT University, Pune</p>
            <p className="opacity-50 pt-1">© 2026 Trajectify.AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
