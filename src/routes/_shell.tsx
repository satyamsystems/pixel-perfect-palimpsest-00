import { createFileRoute, Link, Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  GitCompare,
  LayoutDashboard,
  LogOut,
  Map,
  Menu,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  User,
  UserCog,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/app/ThemeToggle";
import { Chat } from "@/components/app/Chat";
import { authService, AuthUser } from "@/services/authService";
import { dataService, UserProfile, Goal } from "@/services/dataService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_shell")({
  component: Shell,
});

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/compare", label: "What-If", icon: GitCompare },
  { to: "/roadmap", label: "Roadmap", icon: Map },
  { to: "/checkin", label: "Check-In", icon: CalendarCheck },
  { to: "/assistant", label: "Assistant", icon: MessageCircle },
  { to: "/onboarding", label: "Profile", icon: UserCog },
] as const;

function Shell() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Mobile / drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Assistant drawer state
  const [assistantOpen, setAssistantOpen] = useState(false);

  // New Goal modal
  const [newGoalModalOpen, setNewGoalModalOpen] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalDomain, setNewGoalDomain] = useState<
    "Career / Skills" | "Fitness" | "Finance" | "Habits"
  >("Career / Skills");
  const [newGoalHours, setNewGoalHours] = useState(12);

  useEffect(() => {
    const unsub = authService.onAuthStateChange(async (user) => {
      setCurrentUser(user);
      if (!user) {
        navigate({ to: "/login" });
        return;
      }

      const p = await dataService.getProfile(user.id);
      setProfile(p);
      setLoading(false);
    });

    return () => unsub();
  }, [navigate]);

  async function handleLogout() {
    await authService.logout();
    toast.success("Logged out successfully.");
    navigate({ to: "/login" });
  }

  async function handleSwitchGoal(goalId: string) {
    if (!currentUser) return;
    const updated = await dataService.switchActiveGoal(currentUser.id, goalId);
    setProfile(updated);
    toast.success("Switched active goal.");
  }

  async function handleCreateNewGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || !newGoalTitle.trim()) return;

    try {
      const updated = await dataService.addGoal(currentUser.id, {
        domain: newGoalDomain,
        title: newGoalTitle.trim(),
        skills: [{ name: "Core Fundamentals", level: 5 }],
        hoursPerWeek: newGoalHours,
        targetDate: "6 months",
      });
      setProfile(updated);
      setNewGoalModalOpen(false);
      setNewGoalTitle("");
      toast.success("New goal created and activated!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create goal.");
    }
  }

  const activeGoal = profile?.goals.find((g) => g.id === profile.activeGoalId) || profile?.goals[0];

  return (
    <div className="flex min-h-screen bg-background">
      {/* DESKTOP SIDEBAR */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-card p-5 lg:flex select-none">
        <Logo size={32} />

        {/* Navigation list */}
        <nav className="mt-8 flex flex-col gap-1.5" aria-label="Main Navigation">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              activeProps={{
                className: "!bg-primary !text-primary-foreground font-semibold shadow-soft",
              }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        {/* Dynamic Trajectory Mini-Widget in Sidebar */}
        <div className="mt-auto rounded-2xl bg-gradient-hero p-4 text-on-dark border border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold tracking-wide uppercase text-primary">
              Trajectory
            </span>
          </div>
          <p className="mt-2 text-sm font-bold truncate">
            {activeGoal ? activeGoal.title : "No active trajectory"}
          </p>
          <p className="mt-1 text-xs opacity-75">
            {activeGoal
              ? `${activeGoal.progress}% completed · ${activeGoal.probability}% probability`
              : "Set up onboarding to model your path"}
          </p>
        </div>
      </aside>

      {/* TABLET DRAWER (Overlay) */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative flex w-72 flex-col bg-card p-6 shadow-2xl border-r"
            >
              <div className="flex items-center justify-between">
                <Logo size={28} />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                  className="rounded-lg p-1.5 hover:bg-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="mt-8 flex flex-col gap-1.5" aria-label="Mobile Drawer Navigation">
                {navItems.map(({ to, label, icon: Icon }) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    activeProps={{
                      className: "!bg-primary !text-primary-foreground font-semibold shadow-soft",
                    }}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{label}</span>
                  </Link>
                ))}
              </nav>

              <div className="mt-auto border-t pt-4">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-xl p-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT AREA */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* TOP BAR / HEADER */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-background/85 px-4 py-3 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="grid h-10 w-10 place-items-center rounded-xl border bg-card hover:bg-muted lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="lg:hidden">
              <Logo size={28} variant="icon" />
            </div>

            {/* Goal Switcher in Top Bar */}
            {profile && profile.goals && profile.goals.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Switch active goal"
                    className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-xs md:text-sm font-semibold hover:border-primary transition max-w-[220px] md:max-w-xs"
                  >
                    <Target className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">{activeGoal?.title || "Select Goal"}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-64 rounded-xl border bg-card p-1 shadow-soft"
                >
                  <DropdownMenuLabel className="text-[11px] text-muted-foreground uppercase tracking-wider px-2 py-1">
                    Your Active Trajectories
                  </DropdownMenuLabel>
                  {profile.goals.map((g) => (
                    <DropdownMenuItem
                      key={g.id}
                      onClick={() => handleSwitchGoal(g.id)}
                      className="flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer"
                    >
                      <div className="truncate mr-2">
                        <p className="font-semibold text-foreground truncate">{g.title}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {g.domain} · {g.progress}%
                        </p>
                      </div>
                      {g.id === activeGoal?.id && (
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setNewGoalModalOpen(true)}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold text-primary cursor-pointer hover:bg-primary/10"
                  >
                    <Plus className="h-4 w-4" /> Add New Goal
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Quick-action & User menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/checkin"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-primary/10 border border-primary/25 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition"
            >
              <CalendarCheck className="h-3.5 w-3.5" /> My Check-In
            </Link>

            <ThemeToggle />

            {/* User Dropdown */}
            {currentUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label={`User profile menu for ${currentUser.name}`}
                    className="grid h-10 w-10 place-items-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground shadow-soft transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {currentUser.initials}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 rounded-xl border bg-card p-1 shadow-soft"
                >
                  <div className="px-3 py-2.5 border-b mb-1">
                    <p className="text-sm font-bold text-foreground truncate">{currentUser.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {currentUser.email || currentUser.phone || "Logged in"}
                    </p>
                  </div>
                  <DropdownMenuItem asChild>
                    <Link
                      to="/onboarding"
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer"
                    >
                      <UserCog className="h-4 w-4" /> Edit Profile & Goals
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      to="/checkin"
                      className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium cursor-pointer"
                    >
                      <CalendarCheck className="h-4 w-4" /> Weekly Check-In
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-destructive cursor-pointer hover:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 px-4 pb-28 pt-6 md:px-8 lg:pb-12">
          <Outlet />
        </main>
      </div>

      {/* MOBILE BOTTOM TAB BAR */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t bg-card/95 py-2 backdrop-blur lg:hidden"
        aria-label="Mobile Bottom Navigation"
      >
        {navItems.slice(0, 5).map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center gap-0.5 px-2 py-1 text-[11px] font-medium text-muted-foreground min-w-[50px] min-h-[44px] justify-center"
            activeProps={{ className: "!text-primary font-bold" }}
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      {/* FLOATING ASSISTANT DRAWER */}
      <AnimatePresence>
        {assistantOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className="fixed bottom-24 right-4 z-50 flex h-[500px] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border bg-card shadow-glow lg:bottom-20"
          >
            <div className="flex items-center justify-between bg-gradient-hero px-4 py-3 text-on-dark">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-primary" /> Trajectify Assistant
              </span>
              <button
                onClick={() => setAssistantOpen(false)}
                aria-label="Close assistant"
                className="rounded-lg p-1 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Chat compact />
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING ASSISTANT TOGGLE BUTTON */}
      <button
        onClick={() => setAssistantOpen((o) => !o)}
        aria-label={assistantOpen ? "Close assistant" : "Open assistant"}
        className="ai-pulse fixed bottom-20 right-4 z-40 grid h-14 w-14 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow lg:bottom-6"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* Add New Goal Modal */}
      <Dialog open={newGoalModalOpen} onOpenChange={setNewGoalModalOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Add a New Trajectory Goal</DialogTitle>
            <DialogDescription className="text-xs">
              Simulate and track an additional career, skill, or habit milestone.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateNewGoal} className="space-y-4 pt-2">
            <div>
              <label htmlFor="ng-domain" className="text-xs font-semibold">
                Domain
              </label>
              <select
                id="ng-domain"
                value={newGoalDomain}
                onChange={(e) =>
                  setNewGoalDomain(
                    e.target.value as "Career / Skills" | "Fitness" | "Finance" | "Habits",
                  )
                }
                className="mt-1.5 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="Career / Skills">Career / Skills</option>
                <option value="Fitness">Fitness</option>
                <option value="Finance">Finance</option>
                <option value="Habits">Habits</option>
              </select>
            </div>
            <div>
              <label htmlFor="ng-title" className="text-xs font-semibold">
                Goal Title
              </label>
              <input
                id="ng-title"
                required
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                placeholder="e.g. Master Machine Learning & PyTorch"
                className="mt-1.5 w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label htmlFor="ng-hours" className="text-xs font-semibold">
                Weekly Hours ({newGoalHours} hrs)
              </label>
              <input
                id="ng-hours"
                type="number"
                min={2}
                max={40}
                value={newGoalHours}
                onChange={(e) => setNewGoalHours(Number(e.target.value))}
                className="mt-1.5 w-full rounded-xl border border-input bg-card px-3.5 py-2 text-sm outline-none focus:border-primary"
              />
            </div>
            <DialogFooter>
              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-soft"
              >
                Create Goal
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
