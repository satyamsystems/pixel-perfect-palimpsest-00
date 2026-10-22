import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, GitCompare, LayoutDashboard, Map, MessageCircle, RefreshCw, Search, Sparkles, UserCog, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { Chat } from "@/components/app/Chat";
import { student } from "@/lib/mock-data";

export const Route = createFileRoute("/_shell")({
  component: Shell,
});

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/compare", label: "What-If", icon: GitCompare },
  { to: "/roadmap", label: "Roadmap", icon: Map },
  { to: "/assistant", label: "Assistant", icon: MessageCircle },
  { to: "/adapt", label: "Adapt", icon: RefreshCw },
  { to: "/onboarding", label: "Profile", icon: UserCog },
] as const;

function Shell() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-sidebar p-5 lg:flex">
        <Logo />
        <nav className="mt-8 flex flex-col gap-1" aria-label="Main">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-sidebar-accent hover:text-foreground"
              activeProps={{ className: "!bg-gradient-primary !text-primary-foreground shadow-soft" }}
            >
              <Icon className="h-4 w-4" /> {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-gradient-hero p-4 text-on-dark">
          <Sparkles className="h-5 w-5 text-mint" />
          <p className="mt-2 text-sm font-semibold">Trajectory updated</p>
          <p className="mt-1 text-xs opacity-75">You're 4 days ahead of plan this month.</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur md:px-8">
          <div className="lg:hidden"><Logo /></div>
          <div className="relative ml-auto hidden max-w-md flex-1 md:block lg:ml-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <label htmlFor="search" className="sr-only">Search</label>
            <input id="search" placeholder="Search milestones, skills, resources…" className="w-full rounded-xl border bg-card py-2.5 pl-9 pr-3 text-sm outline-none focus:border-electric" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <button aria-label="Notifications" className="relative grid h-10 w-10 place-items-center rounded-xl border bg-card">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber" />
            </button>
            <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground" aria-label={student.name}>
              {student.initials}
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 pb-28 pt-6 md:px-8 lg:pb-10">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t bg-card/95 py-2 backdrop-blur lg:hidden" aria-label="Mobile">
        {nav.slice(0, 5).map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-medium text-muted-foreground" activeProps={{ className: "!text-electric" }}>
            <Icon className="h-5 w-5" /> {label}
          </Link>
        ))}
      </nav>

      {/* Floating assistant */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            className="fixed bottom-36 right-4 z-50 flex h-[480px] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border bg-card shadow-glow lg:bottom-24"
          >
            <div className="flex items-center justify-between bg-gradient-hero px-4 py-3 text-on-dark">
              <span className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-mint" /> Trajectify Assistant</span>
              <button onClick={() => setOpen(false)} aria-label="Close assistant"><X className="h-4 w-4" /></button>
            </div>
            <Chat compact />
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Open assistant"
        className="ai-pulse fixed bottom-20 right-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow lg:bottom-6"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
    </div>
  );
}
