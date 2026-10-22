import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Briefcase,
  Dumbbell,
  Plus,
  Repeat,
  Wallet,
  X,
  User,
  CheckCircle2,
  Calendar,
  Clock,
  Trash2,
  RotateCcw,
  Sparkles,
  Save,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { authService, AuthUser } from "@/services/authService";
import { dataService, UserProfile, SkillItem, Goal } from "@/services/dataService";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { PageHeader, ProgressRing, Panel } from "@/components/app/ui-bits";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_shell/onboarding")({
  head: () => ({
    meta: [
      { title: "Profile & Goals — Trajectify.AI" },
      {
        name: "description",
        content: "Set up and manage your personal trajectory, goal domains, and skill matrix.",
      },
      { property: "og:title", content: "Profile & Goals — Trajectify.AI" },
    ],
  }),
  component: ProfileAndOnboarding,
});

const DOMAINS = [
  {
    id: "Career / Skills",
    icon: Briefcase,
    desc: "Engineering, Product, Tech & Professional skills",
  },
  { id: "Fitness", icon: Dumbbell, desc: "Strength, Running, Health & Conditioning" },
  { id: "Finance", icon: Wallet, desc: "Wealth building, Investing & Cashflow optimization" },
  { id: "Habits", icon: Repeat, desc: "Deep work, Reading, Consistency & Daily routines" },
] as const;

const TARGET_PRESETS = ["3 months", "6 months", "9 months", "12 months", "End of year"];

const ONBOARDING_DRAFT_KEY = "trajectify_onboarding_draft";

function ProfileAndOnboarding() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Active view: "edit" (if profile exists) or "wizard"
  const [activeTab, setActiveTab] = useState<"edit" | "wizard">("wizard");

  // Wizard Steps:
  // 0: Name + Avatar
  // 1: Goal Domain & Description
  // 2: Skills with Level Sliders
  // 3: Weekly Available Hours
  // 4: Target Date
  // 5: Review & Confirm
  const [step, setStep] = useState(0);

  // Wizard & Edit State
  const [name, setName] = useState("");
  const [avatarInitials, setAvatarInitials] = useState("");
  const [domain, setDomain] = useState<"Career / Skills" | "Fitness" | "Finance" | "Habits">(
    "Career / Skills",
  );
  const [goal, setGoal] = useState("");
  const [skills, setSkills] = useState<SkillItem[]>([
    { name: "Frontend Development", level: 6 },
    { name: "JavaScript", level: 5 },
  ]);
  const [newSkillName, setNewSkillName] = useState("");
  const [hours, setHours] = useState(14);
  const [targetDate, setTargetDate] = useState("6 months");

  // Reset dialog
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  // Load existing user & profile
  useEffect(() => {
    const cur = authService.getCurrentUser();
    setUser(cur);
    if (!cur) {
      navigate({ to: "/login" });
      return;
    }

    setName(cur.name || "");
    setAvatarInitials(cur.initials || "U");

    dataService.getProfile(cur.id).then((p) => {
      setProfile(p);
      if (p) {
        setActiveTab("edit");
        const activeGoal = p.goals.find((g) => g.id === p.activeGoalId) || p.goals[0];
        if (activeGoal) {
          setName(p.name);
          setAvatarInitials(p.initials);
          setDomain(activeGoal.domain);
          setGoal(activeGoal.title);
          setSkills(activeGoal.skills || []);
          setHours(activeGoal.hoursPerWeek || 14);
          setTargetDate(activeGoal.targetDate || "6 months");
        }
      } else {
        setActiveTab("wizard");
        // Check for onboarding draft
        try {
          const draft = localStorage.getItem(ONBOARDING_DRAFT_KEY);
          if (draft) {
            const parsed = JSON.parse(draft);
            if (parsed.name) setName(parsed.name);
            if (parsed.domain) setDomain(parsed.domain);
            if (parsed.goal) setGoal(parsed.goal);
            if (parsed.skills) setSkills(parsed.skills);
            if (parsed.hours) setHours(parsed.hours);
            if (parsed.targetDate) setTargetDate(parsed.targetDate);
            if (typeof parsed.step === "number") setStep(parsed.step);
          }
        } catch (e) {
          console.warn("Failed to read onboarding draft:", e);
        }
      }
      setLoading(false);
    });
  }, [navigate]);

  // Autosave wizard draft
  useEffect(() => {
    if (loading || activeTab !== "wizard") return;
    const draft = {
      name,
      domain,
      goal,
      skills,
      hours,
      targetDate,
      step,
    };
    try {
      localStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn("Failed to persist onboarding draft:", e);
    }
  }, [name, domain, goal, skills, hours, targetDate, step, loading, activeTab]);

  // Dynamic Profile Strength Score (0 - 100)
  const strengthScore = Math.min(
    100,
    (name.trim().length > 1 ? 15 : 0) +
      (domain ? 15 : 0) +
      (goal.trim().length > 8 ? 25 : 0) +
      Math.min(30, skills.length * 10) +
      (hours >= 4 ? 15 : 5),
  );

  function handleAddSkill() {
    if (!newSkillName.trim()) return;
    if (skills.some((s) => s.name.toLowerCase() === newSkillName.trim().toLowerCase())) {
      toast.error("Skill already exists in your list.");
      return;
    }
    setSkills([...skills, { name: newSkillName.trim(), level: 5 }]);
    setNewSkillName("");
  }

  function handleRemoveSkill(idx: number) {
    setSkills(skills.filter((_, i) => i !== idx));
  }

  function handleSkillLevelChange(idx: number, level: number) {
    setSkills(skills.map((s, i) => (i === idx ? { ...s, level } : s)));
  }

  async function handleFinishWizard() {
    if (!user) return;
    if (!name.trim()) {
      toast.error("Please enter your name.");
      setStep(0);
      return;
    }
    if (!goal.trim()) {
      toast.error("Please describe your goal.");
      setStep(1);
      return;
    }

    try {
      setLoading(true);
      const newProfile = await dataService.createInitialProfile(user.id, {
        name: name.trim(),
        domain,
        goal: goal.trim(),
        skills,
        hoursPerWeek: hours,
        targetDate,
      });

      // Update session user name if changed
      await authService.updateUser({ name: name.trim() });

      setProfile(newProfile);
      toast.success("Trajectory generated successfully!", {
        description: "Your living roadmap and scenario simulator are ready.",
      });
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create profile.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfileEdits() {
    if (!user || !profile) return;
    if (!goal.trim()) {
      toast.error("Goal title cannot be empty.");
      return;
    }

    try {
      setLoading(true);
      const activeGoal =
        profile.goals.find((g) => g.id === profile.activeGoalId) || profile.goals[0];
      if (activeGoal) {
        activeGoal.domain = domain;
        activeGoal.title = goal.trim();
        activeGoal.skills = skills;
        activeGoal.hoursPerWeek = hours;
        activeGoal.targetDate = targetDate;
      }

      profile.name = name.trim();
      profile.initials = (
        name.trim().split(" ").length >= 2
          ? name.trim().split(" ")[0][0] + name.trim().split(" ").slice(-1)[0][0]
          : name.trim().slice(0, 2)
      ).toUpperCase();

      await dataService.saveProfile(profile);
      await authService.updateUser({ name: name.trim() });

      toast.success("Profile updated successfully!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetData() {
    if (!user) return;
    try {
      setLoading(true);
      await dataService.resetData(user.id);
      setProfile(null);
      setGoal("");
      setSkills([]);
      setStep(0);
      setActiveTab("wizard");
      toast.success("Your data has been reset.", {
        description: "You can now build a brand new trajectory.",
      });
      setResetDialogOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to reset data.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-3 text-sm text-muted-foreground">Loading profile engine...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl pb-16">
      <PageHeader
        title="Personal Profile Engine"
        subtitle="Model your goals, skills, and commitment to drive accurate trajectory simulations."
        action={
          profile ? (
            <div className="flex gap-2">
              <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <AlertDialogTrigger asChild>
                  <button className="flex items-center gap-1.5 rounded-xl border border-destructive/30 px-3.5 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition">
                    <Trash2 className="h-3.5 w-3.5" /> Reset my data
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-display">
                      Reset All Trajectory Data?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-xs leading-relaxed">
                      This will permanently remove your goals, roadmap progress, check-in history,
                      and dimensions from this account. You will start fresh with onboarding.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleResetData}
                      className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Yes, reset my data
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : undefined
        }
      />

      {profile && (
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "edit" | "wizard")}
          className="mb-8"
        >
          <TabsList className="grid w-full max-w-xs grid-cols-2 rounded-xl bg-muted p-1">
            <TabsTrigger value="edit" className="rounded-lg text-xs font-semibold py-2">
              Edit Profile
            </TabsTrigger>
            <TabsTrigger value="wizard" className="rounded-lg text-xs font-semibold py-2">
              New Trajectory Wizard
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* ================= EDIT PROFILE MODE ================= */}
      {profile && activeTab === "edit" ? (
        <div className="grid gap-8 lg:grid-cols-[1fr_260px]">
          <div className="space-y-6">
            <Panel title="Personal Information">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="p-name" className="text-xs font-semibold">
                    Full Name
                  </label>
                  <input
                    id="p-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label htmlFor="p-domain" className="text-xs font-semibold">
                    Goal Domain
                  </label>
                  <select
                    id="p-domain"
                    value={domain}
                    onChange={(e) =>
                      setDomain(
                        e.target.value as "Career / Skills" | "Fitness" | "Finance" | "Habits",
                      )
                    }
                    className="mt-1.5 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none focus:border-primary cursor-pointer"
                  >
                    {DOMAINS.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </Panel>

            <Panel title="Active Goal Description">
              <label htmlFor="p-goal" className="text-xs text-muted-foreground mb-1 block">
                Primary objective modeled by Trajectify:
              </label>
              <textarea
                id="p-goal"
                rows={3}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full rounded-xl border border-input bg-card p-3.5 text-sm outline-none focus:border-primary"
              />
            </Panel>

            <Panel title="Skills Matrix">
              <p className="text-xs text-muted-foreground mb-4">
                Update proficiency ratings or append new skills to refine your simulations:
              </p>
              <div className="space-y-3 mb-4">
                {skills.map((s, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border bg-card/60 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-primary">{s.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">Lvl {s.level}/10</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(idx)}
                          aria-label={`Remove ${s.name}`}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <Slider
                      value={[s.level]}
                      min={1}
                      max={10}
                      step={1}
                      onValueChange={(v) => handleSkillLevelChange(idx, v[0] ?? 5)}
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  placeholder="Add skill (e.g. Next.js, System Architecture)"
                  className="flex-1 rounded-xl border border-input bg-card px-3.5 py-2 text-xs outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className="rounded-xl border bg-card px-4 py-2 text-xs font-semibold hover:border-primary inline-flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </Panel>

            <div className="grid gap-6 sm:grid-cols-2">
              <Panel title="Weekly Time Commitment">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-xs text-muted-foreground">Available hours</span>
                  <span className="font-display font-bold text-xl text-primary">
                    {hours} hrs/week
                  </span>
                </div>
                <Slider
                  value={[hours]}
                  min={2}
                  max={40}
                  step={1}
                  onValueChange={(v) => setHours(v[0] ?? 14)}
                />
              </Panel>

              <Panel title="Target Completion Horizon">
                <label htmlFor="p-target" className="text-xs text-muted-foreground mb-1.5 block">
                  Target deadline or duration:
                </label>
                <input
                  id="p-target"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  placeholder="e.g. 6 months, November 2026"
                  className="w-full rounded-xl border border-input bg-card px-3.5 py-2 text-xs outline-none focus:border-primary"
                />
              </Panel>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <button
                type="button"
                onClick={handleSaveProfileEdits}
                className="rounded-xl bg-gradient-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-95 inline-flex items-center gap-2"
              >
                <Save className="h-4 w-4" /> Save Profile Changes
              </button>
            </div>
          </div>

          {/* SIDEBAR METRICS */}
          <aside className="space-y-5">
            <div className="card-surface p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Profile Strength
              </p>
              <ProgressRing value={strengthScore} color="var(--primary)" />
              <p className="mt-3 text-xs text-muted-foreground">
                {strengthScore >= 80
                  ? "Excellent profile calibration for simulation accuracy."
                  : "Add more skills and details to optimize forecast fidelity."}
              </p>
            </div>

            <div className="card-surface p-4 text-xs text-muted-foreground space-y-2">
              <p className="font-semibold text-foreground">Data Storage</p>
              <p>
                All goals and milestones are stored securely in your private browser sandbox and
                ready for PHP/MySQL database sync.
              </p>
            </div>
          </aside>
        </div>
      ) : (
        /* ================= FIRST-RUN ONBOARDING WIZARD ================= */
        <div className="grid gap-8 lg:grid-cols-[1fr_260px]">
          <div>
            <div className="mb-6 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Step {step + 1} of 6:{" "}
                <strong className="text-foreground">
                  {
                    [
                      "Identity",
                      "Domain & Goal",
                      "Skills Matrix",
                      "Weekly Hours",
                      "Target Date",
                      "Review & Launch",
                    ][step]
                  }
                </strong>
              </span>
              <span>{Math.round(((step + 1) / 6) * 100)}%</span>
            </div>
            <Progress value={((step + 1) / 6) * 100} className="mb-8 h-2" />

            <AnimatePresence mode="wait">
              {/* STEP 0: Identity & Name */}
              {step === 0 && (
                <motion.div
                  key="step-0"
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }}
                  className="space-y-4"
                >
                  <Panel title="Step 1: Your Name & Profile Persona">
                    <p className="text-xs text-muted-foreground mb-4">
                      How should Trajectify address you across your roadmaps and AI sessions?
                    </p>
                    <label htmlFor="w-name" className="text-xs font-semibold">
                      Your Full Name
                    </label>
                    <input
                      id="w-name"
                      required
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        const parts = e.target.value.trim().split(" ");
                        if (parts.length >= 2) {
                          setAvatarInitials((parts[0][0] + parts.slice(-1)[0][0]).toUpperCase());
                        }
                      }}
                      placeholder="e.g. Maya Chen"
                      className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-base outline-none focus:border-primary"
                    />

                    <div className="mt-6 flex items-center gap-4">
                      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-primary text-lg font-bold text-primary-foreground shadow-soft">
                        {avatarInitials || (name ? name.slice(0, 2).toUpperCase() : "U")}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          Avatar Initials Badge
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Automatically rendered across your navigation and streak boards.
                        </p>
                      </div>
                    </div>
                  </Panel>
                </motion.div>
              )}

              {/* STEP 1: Goal Domain & Description */}
              {step === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }}
                  className="space-y-5"
                >
                  <Panel title="Step 2: Choose Your Domain">
                    <div className="grid gap-3 sm:grid-cols-2 mb-6">
                      {DOMAINS.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setDomain(d.id)}
                          className={`flex items-start gap-3.5 p-4 rounded-xl border text-left transition ${
                            domain === d.id
                              ? "border-primary bg-primary/10 shadow-soft ring-2 ring-primary/40"
                              : "bg-card hover:border-primary/40"
                          }`}
                        >
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                            <d.icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-foreground">{d.id}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{d.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>

                    <label htmlFor="w-goal" className="text-xs font-semibold block mb-1">
                      Describe your target trajectory outcome:
                    </label>
                    <textarea
                      id="w-goal"
                      rows={3}
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      placeholder="e.g. Become a Senior Full-Stack Engineer and deploy a revenue-generating SaaS application."
                      className="w-full rounded-xl border border-input bg-card p-3.5 text-sm outline-none focus:border-primary"
                    />
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Tip: Include specific competencies, roles, or shippable benchmarks.
                    </p>
                  </Panel>
                </motion.div>
              )}

              {/* STEP 2: Current Skills as chips with sliders */}
              {step === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }}
                  className="space-y-4"
                >
                  <Panel title="Step 3: Current Skills Matrix">
                    <p className="text-xs text-muted-foreground mb-4">
                      Add your current skills and calibrate proficiency from 1 (Novice) to 10
                      (Mastery).
                    </p>

                    <div className="space-y-3 mb-5">
                      {skills.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No skills added yet.</p>
                      ) : (
                        skills.map((s, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl border bg-card flex flex-col gap-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-primary">{s.name}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground">
                                  Lvl {s.level}/10
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSkill(idx)}
                                  className="text-muted-foreground hover:text-destructive"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            <Slider
                              value={[s.level]}
                              min={1}
                              max={10}
                              step={1}
                              onValueChange={(v) => handleSkillLevelChange(idx, v[0] ?? 5)}
                            />
                          </div>
                        ))
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        value={newSkillName}
                        onChange={(e) => setNewSkillName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddSkill();
                          }
                        }}
                        placeholder="Add a skill, e.g. TypeScript, React, SQL..."
                        className="flex-1 rounded-xl border border-input bg-card px-3.5 py-2.5 text-xs outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={handleAddSkill}
                        className="rounded-xl border bg-card px-4 py-2 text-xs font-semibold hover:border-primary inline-flex items-center gap-1"
                      >
                        <Plus className="h-4 w-4" /> Add
                      </button>
                    </div>
                  </Panel>
                </motion.div>
              )}

              {/* STEP 3: Weekly Available Hours */}
              {step === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }}
                  className="space-y-4"
                >
                  <Panel title="Step 4: Weekly Available Hours">
                    <p className="text-xs text-muted-foreground mb-4">
                      How much focused time can you realistically invest each week?
                    </p>
                    <div className="flex justify-between items-baseline mb-3">
                      <span className="text-xs text-muted-foreground">Time Commitment</span>
                      <span className="font-display font-extrabold text-3xl text-primary">
                        {hours}{" "}
                        <span className="text-base font-semibold text-muted-foreground">
                          hrs/week
                        </span>
                      </span>
                    </div>
                    <Slider
                      value={[hours]}
                      min={2}
                      max={40}
                      step={1}
                      onValueChange={(v) => setHours(v[0] ?? 14)}
                    />
                    <div className="mt-4 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
                      ≈ {Math.round((hours / 7) * 10) / 10} hours per day. Most students and career
                      changers achieve peak retention between 12 and 18 hours/week.
                    </div>
                  </Panel>
                </motion.div>
              )}

              {/* STEP 4: Target Date */}
              {step === 4 && (
                <motion.div
                  key="step-4"
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }}
                  className="space-y-4"
                >
                  <Panel title="Step 5: Target Completion Date">
                    <p className="text-xs text-muted-foreground mb-4">
                      When do you plan to achieve this milestone?
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-5">
                      {TARGET_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setTargetDate(preset)}
                          className={`p-3 rounded-xl border text-xs font-semibold transition ${
                            targetDate === preset
                              ? "border-primary bg-primary/10 text-primary"
                              : "bg-card hover:border-primary/50"
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>

                    <label htmlFor="w-custom-target" className="text-xs font-semibold block mb-1">
                      Or specify a custom date or deadline:
                    </label>
                    <input
                      id="w-custom-target"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      placeholder="e.g. December 2026, or Q3 Review"
                      className="w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary"
                    />
                  </Panel>
                </motion.div>
              )}

              {/* STEP 5: Review & Confirm */}
              {step === 5 && (
                <motion.div
                  key="step-5"
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }}
                  className="space-y-4"
                >
                  <Panel title="Step 6: Review & Launch Trajectory">
                    <p className="text-xs text-muted-foreground mb-4">
                      Confirm your setup parameters before Trajectify synthesizes your living
                      roadmap:
                    </p>

                    <div className="divide-y rounded-xl border bg-card">
                      <div className="flex justify-between p-3.5 text-xs">
                        <span className="text-muted-foreground">User Name</span>
                        <span className="font-bold text-foreground">{name}</span>
                      </div>
                      <div className="flex justify-between p-3.5 text-xs">
                        <span className="text-muted-foreground">Domain</span>
                        <span className="font-bold text-foreground">{domain}</span>
                      </div>
                      <div className="flex justify-between p-3.5 text-xs">
                        <span className="text-muted-foreground">Primary Goal</span>
                        <span className="font-bold text-foreground max-w-xs text-right truncate">
                          {goal}
                        </span>
                      </div>
                      <div className="flex justify-between p-3.5 text-xs">
                        <span className="text-muted-foreground">Mapped Skills</span>
                        <span className="font-bold text-foreground">
                          {skills.length > 0
                            ? skills.map((s) => s.name).join(", ")
                            : "General Foundations"}
                        </span>
                      </div>
                      <div className="flex justify-between p-3.5 text-xs">
                        <span className="text-muted-foreground">Pace</span>
                        <span className="font-bold text-foreground">{hours} hrs/week</span>
                      </div>
                      <div className="flex justify-between p-3.5 text-xs">
                        <span className="text-muted-foreground">Target Date</span>
                        <span className="font-bold text-foreground">{targetDate}</span>
                      </div>
                    </div>
                  </Panel>
                </motion.div>
              )}
            </AnimatePresence>

            {/* WIZARD NAVIGATION BUTTONS */}
            <div className="mt-8 flex items-center justify-between border-t pt-4">
              <button
                type="button"
                disabled={step === 0}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="rounded-xl border bg-card px-5 py-2.5 text-xs font-semibold hover:border-primary disabled:opacity-40"
              >
                Back
              </button>

              {step < 5 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 0 && !name.trim()) {
                      toast.error("Please enter your name.");
                      return;
                    }
                    if (step === 1 && !goal.trim()) {
                      toast.error("Please describe your goal.");
                      return;
                    }
                    setStep((s) => s + 1);
                  }}
                  className="rounded-xl bg-gradient-primary px-6 py-2.5 text-xs font-semibold text-primary-foreground shadow-soft transition hover:opacity-95"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinishWizard}
                  className="rounded-xl bg-gradient-primary px-7 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-95 inline-flex items-center gap-2"
                >
                  <Sparkles className="h-4 w-4" /> Generate My Trajectory
                </button>
              )}
            </div>
          </div>

          {/* WIZARD SIDEBAR SCORE */}
          <aside className="space-y-4">
            <div className="card-surface p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Profile Strength
              </p>
              <ProgressRing value={strengthScore} color="var(--primary)" />
              <p className="mt-3 text-xs text-muted-foreground">
                {strengthScore >= 80
                  ? "High calibration. All simulator features unlocked."
                  : "Complete all steps to model your trajectory with full fidelity."}
              </p>
            </div>

            <div className="rounded-xl border bg-muted/50 p-4 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Autosaved Draft</p>
              <p>Your inputs are preserved locally as you advance through the wizard.</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
