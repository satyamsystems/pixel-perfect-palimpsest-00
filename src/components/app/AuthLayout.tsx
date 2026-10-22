import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, TrendingUp, Compass, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { TrajectoryArt } from "@/components/brand/TrajectoryArt";

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* LEFT BRANDING PANEL (Desktop split screen) */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between overflow-hidden bg-gradient-hero p-12 text-on-dark">
        {/* Top bar with Logo */}
        <div className="relative z-10 flex items-center justify-between">
          <Logo theme="light" size={36} />
          <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-semibold">
            <span className="h-2 w-2 rounded-full bg-primary" /> v1.0 Live
          </span>
        </div>

        {/* Center illustration & Value Proposition */}
        <div className="relative z-10 my-auto max-w-lg py-8">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary">
            <Compass className="h-4 w-4" /> Predictive Life Engine
          </span>
          <h1 className="mt-3 font-display text-4xl xl:text-5xl font-extrabold tracking-tight leading-[1.1]">
            Simulate your future. <span className="text-gradient">Decide today.</span>
          </h1>
          <p className="mt-4 text-base opacity-85 leading-relaxed">
            Stop guessing your career trajectory. Model multidimensional paths, test what-if
            scenarios, and adapt in real time with AI roadmaps.
          </p>

          {/* Interactive glowing trajectory graphic */}
          <div className="mt-8 rounded-2xl glass p-5">
            <TrajectoryArt className="w-full h-auto" />
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 text-xs">
            <div className="flex items-center gap-2 opacity-90">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              <span>Multi-path probability & risk engine</span>
            </div>
            <div className="flex items-center gap-2 opacity-90">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
              <span>Adaptive weekly roadmap recalculations</span>
            </div>
          </div>
        </div>

        {/* Bottom copyright & attribution */}
        <div className="relative z-10 flex items-center justify-between text-xs opacity-70">
          <span>© 2026 Trajectify.AI</span>
          <span>Decisions engineered with data</span>
        </div>
      </div>

      {/* RIGHT AUTH CARD (Single column on mobile, card on desktop) */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-14 overflow-y-auto">
        <header className="flex items-center justify-between mb-8">
          <div className="lg:hidden">
            <Logo size={32} />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-md card-surface p-7 sm:p-9 shadow-soft rounded-2xl border">
            {children}
          </div>
        </main>

        <footer className="mt-8 text-center text-xs text-muted-foreground">
          <p>
            By continuing, you agree to Trajectify.AI's{" "}
            <a href="#" className="underline hover:text-foreground">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="#" className="underline hover:text-foreground">
              Privacy Policy
            </a>
            .
          </p>
        </footer>
      </div>
    </div>
  );
}
