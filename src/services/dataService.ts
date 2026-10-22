/**
 * DataService for Trajectify.AI
 *
 * Centralized data management layer backed by localStorage per logged-in user.
 * All reads, writes, recalculations, check-ins, and roadmap mutations route through here.
 *
 * TODO [Backend Integration - PHP & MySQL]:
 * 1. Replace localStorage with REST API endpoints:
 *    - GET    /api/profile.php            -> Fetch user's profile and active goals
 *    - POST   /api/profile.php            -> Create/update profile from onboarding
 *    - POST   /api/goals.php              -> Add new goal
 *    - PUT    /api/goals/active.php       -> Switch active goal
 *    - PUT    /api/roadmap/task.php       -> Toggle or update milestone tasks
 *    - POST   /api/check-ins.php          -> Save weekly check-in record
 *    - POST   /api/roadmap/apply-diff.php -> Commit accepted AI roadmap adjustments
 *    - DELETE /api/profile/reset.php      -> Wipe user's data
 * 2. Store records in MySQL tables:
 *    - `users` (id, name, email, phone, created_at)
 *    - `goals` (id, user_id, domain, title, hours_per_week, target_date, is_active)
 *    - `skills` (id, goal_id, name, level)
 *    - `milestones` (id, goal_id, month_label, title, outcome, status, sort_order)
 *    - `milestone_tasks` (id, milestone_id, label, is_done, sort_order)
 *    - `check_ins` (id, goal_id, date, notes, actual_hours, mood, blockers, changes)
 */

export interface SkillItem {
  name: string;
  level: number; // 1 to 10
}

export interface MilestoneTask {
  id: string;
  label: string;
  done: boolean;
}

export type MilestoneStatus = "Done" | "In progress" | "Upcoming";

export interface Milestone {
  id: string;
  month: string;
  title: string;
  status: MilestoneStatus;
  outcome: string;
  tasks: MilestoneTask[];
  resources: string[];
}

export interface CheckInRecord {
  id: string;
  date: string;
  notes: string;
  actualHours: number;
  completedTaskIds: string[];
  mood: 1 | 2 | 3 | 4 | 5; // 1 (struggling) to 5 (thriving)
  blockers?: string;
  goalChanges?: string;
}

export interface RoadmapChange {
  id: string;
  type: "move" | "add" | "remove" | "re-time";
  milestoneTitle: string;
  taskLabel: string;
  action: string;
  reason: string;
  accepted?: boolean;
}

export interface DimensionMetric {
  dim: string;
  value: number; // 0 to 100
}

export interface WeeklyHourEntry {
  week: string;
  hours: number;
  target: number;
}

export interface Goal {
  id: string;
  domain: "Career / Skills" | "Fitness" | "Finance" | "Habits";
  title: string;
  description?: string;
  skills: SkillItem[];
  hoursPerWeek: number;
  targetDate: string;
  startDate: string;
  progress: number; // 0-100%
  probability: number; // 0-100%
  streak: number;
  dimensions: DimensionMetric[];
  weeklyHours: WeeklyHourEntry[];
  roadmap: Milestone[];
  checkIns: CheckInRecord[];
}

export interface UserProfile {
  id: string;
  name: string;
  initials: string;
  avatarUrl?: string;
  activeGoalId: string;
  goals: Goal[];
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingInput {
  name: string;
  avatarUrl?: string;
  domain: "Career / Skills" | "Fitness" | "Finance" | "Habits";
  goal: string;
  skills: SkillItem[];
  hoursPerWeek: number;
  targetDate: string;
}

class DataService {
  private getStorageKey(userId: string): string {
    return `trajectify_profile_${userId}`;
  }

  async getProfile(userId: string): Promise<UserProfile | null> {
    if (typeof window === "undefined" || !userId) return null;
    try {
      const data = localStorage.getItem(this.getStorageKey(userId));
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error("Failed to read profile from localStorage:", e);
      return null;
    }
  }

  async saveProfile(profile: UserProfile): Promise<UserProfile> {
    if (typeof window === "undefined" || !profile.id) return profile;
    profile.updatedAt = new Date().toISOString();
    localStorage.setItem(this.getStorageKey(profile.id), JSON.stringify(profile));
    return profile;
  }

  async resetData(userId: string): Promise<void> {
    if (typeof window === "undefined" || !userId) return;
    localStorage.removeItem(this.getStorageKey(userId));
    localStorage.removeItem("trajectify_onboarding_draft");
    localStorage.removeItem("trajectify_checkin_draft");
  }

  // Create an initial tailored trajectory from the onboarding wizard
  async createInitialProfile(userId: string, input: OnboardingInput): Promise<UserProfile> {
    const goalId = "goal_" + Math.random().toString(36).slice(2, 9);
    const roadmap = this.generateRoadmapForGoal(
      input.domain,
      input.goal,
      input.skills,
      input.hoursPerWeek,
      input.targetDate,
    );

    const calculatedDimensions: DimensionMetric[] = [
      { dim: "Skills", value: Math.min(95, Math.max(30, input.skills.length * 15)) },
      { dim: "Time", value: Math.min(95, Math.round((input.hoursPerWeek / 20) * 80)) },
      { dim: "Consistency", value: 75 },
      { dim: "Market alignment", value: 82 },
      { dim: "Risk resilience", value: 65 },
      { dim: "Momentum", value: 80 },
    ];

    const weeklyHours: WeeklyHourEntry[] = [
      {
        week: "W1",
        hours: Math.max(1, Math.round(input.hoursPerWeek * 0.7)),
        target: input.hoursPerWeek,
      },
      { week: "W2", hours: input.hoursPerWeek, target: input.hoursPerWeek },
    ];

    const goal: Goal = {
      id: goalId,
      domain: input.domain,
      title: input.goal,
      skills: input.skills,
      hoursPerWeek: input.hoursPerWeek,
      targetDate: input.targetDate,
      startDate: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      progress: 5,
      probability: Math.min(94, Math.max(50, 60 + Math.round(input.hoursPerWeek * 1.5))),
      streak: 1,
      dimensions: calculatedDimensions,
      weeklyHours,
      roadmap,
      checkIns: [],
    };

    const parts = input.name.trim().split(/\s+/);
    const initials = (
      parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : input.name.slice(0, 2)
    ).toUpperCase();

    const profile: UserProfile = {
      id: userId,
      name: input.name,
      initials,
      avatarUrl: input.avatarUrl,
      activeGoalId: goalId,
      goals: [goal],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.saveProfile(profile);
    // Clear draft
    if (typeof window !== "undefined") {
      localStorage.removeItem("trajectify_onboarding_draft");
    }
    return profile;
  }

  // Toggle tasks in a milestone
  async toggleTask(
    userId: string,
    milestoneId: string,
    taskId: string,
  ): Promise<UserProfile | null> {
    const profile = await this.getProfile(userId);
    if (!profile) return null;

    const goal = profile.goals.find((g) => g.id === profile.activeGoalId);
    if (!goal) return profile;

    let totalTasks = 0;
    let completedTasks = 0;

    goal.roadmap = goal.roadmap.map((m) => {
      const updatedTasks = m.tasks.map((t) => {
        if (m.id === milestoneId && t.id === taskId) {
          return { ...t, done: !t.done };
        }
        return t;
      });

      const doneCount = updatedTasks.filter((t) => t.done).length;
      totalTasks += updatedTasks.length;
      completedTasks += doneCount;

      let status: MilestoneStatus = m.status;
      if (doneCount === updatedTasks.length && updatedTasks.length > 0) {
        status = "Done";
      } else if (doneCount > 0) {
        status = "In progress";
      }

      return {
        ...m,
        tasks: updatedTasks,
        status,
      };
    });

    // Recalculate progress
    if (totalTasks > 0) {
      goal.progress = Math.round((completedTasks / totalTasks) * 100);
      goal.probability = Math.min(98, Math.max(40, 50 + Math.round(goal.progress * 0.45)));
    }

    return await this.saveProfile(profile);
  }

  // Record a weekly check-in
  async addCheckIn(
    userId: string,
    checkInInput: {
      notes: string;
      actualHours: number;
      completedTaskIds: string[];
      mood: 1 | 2 | 3 | 4 | 5;
      blockers?: string;
      goalChanges?: string;
    },
  ): Promise<{ profile: UserProfile; newCheckIn: CheckInRecord }> {
    const profile = await this.getProfile(userId);
    if (!profile) throw new Error("Profile not found");

    const goal = profile.goals.find((g) => g.id === profile.activeGoalId);
    if (!goal) throw new Error("Active goal not found");

    const newCheckIn: CheckInRecord = {
      id: "chk_" + Math.random().toString(36).slice(2, 9),
      date: new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      ...checkInInput,
    };

    goal.checkIns = [newCheckIn, ...(goal.checkIns || [])];

    // Mark completed tasks on roadmap
    if (checkInInput.completedTaskIds?.length) {
      const set = new Set(checkInInput.completedTaskIds);
      goal.roadmap = goal.roadmap.map((m) => ({
        ...m,
        tasks: m.tasks.map((t) => (set.has(t.id) ? { ...t, done: true } : t)),
      }));
    }

    // Append to weekly hours chart
    const weekLabel = `W${(goal.weeklyHours?.length || 0) + 1}`;
    goal.weeklyHours = [
      ...(goal.weeklyHours || []),
      {
        week: weekLabel,
        hours: checkInInput.actualHours,
        target: goal.hoursPerWeek,
      },
    ].slice(-8); // Keep last 8 weeks

    // Update streak & probability
    goal.streak = (goal.streak || 0) + 1;
    const hourDelta = checkInInput.actualHours - goal.hoursPerWeek;
    if (hourDelta >= 0) {
      goal.probability = Math.min(98, goal.probability + 2);
    } else if (hourDelta < -4) {
      goal.probability = Math.max(35, goal.probability - 2);
    }

    const saved = await this.saveProfile(profile);
    if (typeof window !== "undefined") {
      localStorage.removeItem("trajectify_checkin_draft");
    }

    return { profile: saved, newCheckIn };
  }

  // Apply accepted changes proposed by AI
  async applyRoadmapChanges(userId: string, changes: RoadmapChange[]): Promise<UserProfile> {
    const profile = await this.getProfile(userId);
    if (!profile) throw new Error("Profile not found");

    const goal = profile.goals.find((g) => g.id === profile.activeGoalId);
    if (!goal) return profile;

    changes.forEach((c) => {
      const milestone = goal.roadmap.find(
        (m) => m.title.toLowerCase() === c.milestoneTitle.toLowerCase(),
      );
      if (milestone) {
        if (c.type === "add") {
          milestone.tasks.push({
            id: "tsk_" + Math.random().toString(36).slice(2, 7),
            label: c.taskLabel,
            done: false,
          });
        } else if (c.type === "remove") {
          milestone.tasks = milestone.tasks.filter(
            (t) => t.label.toLowerCase() !== c.taskLabel.toLowerCase(),
          );
        } else if (c.type === "move" || c.type === "re-time") {
          const task = milestone.tasks.find(
            (t) => t.label.toLowerCase() === c.taskLabel.toLowerCase(),
          );
          if (task && c.action.toLowerCase().includes("done")) {
            task.done = true;
          }
        }
      }
    });

    return await this.saveProfile(profile);
  }

  // Goal Switcher & Multi-Goal support
  async addGoal(
    userId: string,
    goalInput: {
      domain: "Career / Skills" | "Fitness" | "Finance" | "Habits";
      title: string;
      skills: SkillItem[];
      hoursPerWeek: number;
      targetDate: string;
    },
  ): Promise<UserProfile> {
    const profile = await this.getProfile(userId);
    if (!profile) throw new Error("Profile not found");

    const newGoalId = "goal_" + Math.random().toString(36).slice(2, 9);
    const roadmap = this.generateRoadmapForGoal(
      goalInput.domain,
      goalInput.title,
      goalInput.skills,
      goalInput.hoursPerWeek,
      goalInput.targetDate,
    );

    const newGoal: Goal = {
      id: newGoalId,
      domain: goalInput.domain,
      title: goalInput.title,
      skills: goalInput.skills,
      hoursPerWeek: goalInput.hoursPerWeek,
      targetDate: goalInput.targetDate,
      startDate: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      progress: 0,
      probability: 70,
      streak: 0,
      dimensions: [
        { dim: "Skills", value: 45 },
        { dim: "Time", value: 70 },
        { dim: "Consistency", value: 65 },
        { dim: "Market alignment", value: 80 },
        { dim: "Risk resilience", value: 60 },
        { dim: "Momentum", value: 70 },
      ],
      weeklyHours: [{ week: "W1", hours: 0, target: goalInput.hoursPerWeek }],
      roadmap,
      checkIns: [],
    };

    profile.goals.push(newGoal);
    profile.activeGoalId = newGoalId;
    return await this.saveProfile(profile);
  }

  async switchActiveGoal(userId: string, goalId: string): Promise<UserProfile> {
    const profile = await this.getProfile(userId);
    if (!profile) throw new Error("Profile not found");
    if (profile.goals.some((g) => g.id === goalId)) {
      profile.activeGoalId = goalId;
      return await this.saveProfile(profile);
    }
    return profile;
  }

  async deleteGoal(userId: string, goalId: string): Promise<UserProfile> {
    const profile = await this.getProfile(userId);
    if (!profile) throw new Error("Profile not found");
    profile.goals = profile.goals.filter((g) => g.id !== goalId);
    if (profile.activeGoalId === goalId && profile.goals.length > 0) {
      profile.activeGoalId = profile.goals[0].id;
    }
    return await this.saveProfile(profile);
  }

  // Dynamic roadmap synthesis based on domain and goal description
  generateRoadmapForGoal(
    domain: string,
    goal: string,
    skills: SkillItem[],
    hours: number,
    targetDate: string,
  ): Milestone[] {
    const now = new Date();
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const curMonthIdx = now.getMonth();

    const getMonthStr = (offset: number) => {
      const idx = (curMonthIdx + offset) % 12;
      return `Month ${offset + 1} · ${months[idx]}`;
    };

    if (domain === "Fitness") {
      return [
        {
          id: "m-1",
          month: getMonthStr(0),
          title: "Foundation & Baseline Conditioning",
          status: "In progress",
          outcome: "Establish consistent 3x weekly workout habit and baseline stamina.",
          tasks: [
            {
              id: "t-1",
              label: "Perform full fitness baseline test (cardio & strength)",
              done: false,
            },
            {
              id: "t-2",
              label: "Establish daily hydration (2.5L) & sleep schedule (7.5h)",
              done: false,
            },
            { id: "t-3", label: "Complete 12 guided conditioning workouts", done: false },
            {
              id: "t-4",
              label: "Dial in basic post-workout nutrition & protein targets",
              done: false,
            },
          ],
          resources: ["MyFitnessPal", "Nike Training Club", "ExRx Exercise Directory"],
        },
        {
          id: "m-2",
          month: getMonthStr(1),
          title: "Hypertrophy & Progressive Overload",
          status: "Upcoming",
          outcome: "Increase core compound lifts by 10-15% with strict form.",
          tasks: [
            {
              id: "t-5",
              label: "Track weekly resistance training loads across main compounds",
              done: false,
            },
            { id: "t-6", label: "Incorporate dedicated dynamic mobility sessions", done: false },
            { id: "t-7", label: "Conduct mid-cycle body metric assessment", done: false },
          ],
          resources: ["Stronger By Science Guides", "Renaissance Periodization"],
        },
        {
          id: "m-3",
          month: getMonthStr(2),
          title: "Peak Endurance & Habit Consolidation",
          status: "Upcoming",
          outcome: "Hit targeted milestone endurance and sustain energy levels.",
          tasks: [
            { id: "t-8", label: "Execute peak benchmark challenge", done: false },
            { id: "t-9", label: "Finalize sustainable maintenance training regimen", done: false },
          ],
          resources: ["Strava", "FoundMyFitness Protocol"],
        },
      ];
    }

    if (domain === "Finance") {
      return [
        {
          id: "m-1",
          month: getMonthStr(0),
          title: "Cashflow Audit & Emergency Buffer",
          status: "In progress",
          outcome: "Map all expense streams and build a 1-month liquid safety cushion.",
          tasks: [
            { id: "t-1", label: "Audit past 90 days bank & card statements", done: false },
            {
              id: "t-2",
              label: "Categorize fixed vs variable spending into zero-based budget",
              done: false,
            },
            {
              id: "t-3",
              label: "Automate emergency fund deposits to high-yield account",
              done: false,
            },
            { id: "t-4", label: "Eliminate recurring unused subscriptions", done: false },
          ],
          resources: ["YNAB (You Need A Budget)", "Bogleheads Wiki", "Investopedia"],
        },
        {
          id: "m-2",
          month: getMonthStr(1),
          title: "Debt Optimization & Tax Planning",
          status: "Upcoming",
          outcome: "Consolidate high-interest liabilities and structure tax-advantaged accounts.",
          tasks: [
            {
              id: "t-5",
              label: "Target highest interest rate obligations via avalanche method",
              done: false,
            },
            {
              id: "t-6",
              label: "Maximize annual retirement/tax-saving account contributions",
              done: false,
            },
            { id: "t-7", label: "Review insurance & health coverage deductibles", done: false },
          ],
          resources: ["Morningstar Guides", "The Simple Path to Wealth"],
        },
        {
          id: "m-3",
          month: getMonthStr(2),
          title: "Automated Wealth Allocation",
          status: "Upcoming",
          outcome: "Establish hands-off recurring index investment engine.",
          tasks: [
            {
              id: "t-8",
              label: "Deploy automated monthly broad-market index fund purchases",
              done: false,
            },
            { id: "t-9", label: "Establish quarterly rebalancing checklist", done: false },
          ],
          resources: ["Kiplinger Personal Finance", "Financial Times Money"],
        },
      ];
    }

    // Default: Career / Skills or Habits
    const skillNames = skills.map((s) => s.name).join(", ") || "Foundations";
    return [
      {
        id: "m-1",
        month: getMonthStr(0),
        title: "Core Foundations & Tooling",
        status: "In progress",
        outcome: `Solidify base architecture, version control, and fundamentals around ${skillNames}.`,
        tasks: [
          {
            id: "t-1",
            label: `Complete core syntax & deep dive on ${skills[0]?.name || "fundamentals"}`,
            done: false,
          },
          {
            id: "t-2",
            label: "Set up production-grade dev environment & Git workflows",
            done: false,
          },
          { id: "t-3", label: "Ship first interactive mini-project with unit tests", done: false },
          { id: "t-4", label: "Publish progress notes & repository on GitHub", done: false },
        ],
        resources: ["MDN Web Docs", "Official Documentation", "FreeCodeCamp"],
      },
      {
        id: "m-2",
        month: getMonthStr(1),
        title: "Intermediate Patterns & State Management",
        status: "Upcoming",
        outcome: "Construct scalable, typed architectures and integrate remote APIs.",
        tasks: [
          {
            id: "t-5",
            label: `Deep dive into modern patterns for ${skills[1]?.name || "applications"}`,
            done: false,
          },
          { id: "t-6", label: "Implement async query management & client caching", done: false },
          { id: "t-7", label: "Build and deploy end-to-end milestone prototype", done: false },
        ],
        resources: ["Frontend Masters", "Total TypeScript", "TanStack Documentation"],
      },
      {
        id: "m-3",
        month: getMonthStr(2),
        title: "Full-Stack Integration & Architecture",
        status: "Upcoming",
        outcome: "Connect front-end client with backend services, auth, and database persistence.",
        tasks: [
          {
            id: "t-8",
            label: "Design relational database schema and RESTful endpoints",
            done: false,
          },
          { id: "t-9", label: "Implement JWT authentication and security headers", done: false },
          {
            id: "t-10",
            label: "Configure automated CI/CD pipeline and automated test suite",
            done: false,
          },
        ],
        resources: ["Prisma Guides", "Node.js Best Practices", "OWASP Top 10"],
      },
      {
        id: "m-4",
        month: getMonthStr(3),
        title: "Capstone Project & Real-World Readiness",
        status: "Upcoming",
        outcome: `Deploy flagship capstone portfolio application and prepare for target (${targetDate || "Q4"}).`,
        tasks: [
          {
            id: "t-11",
            label: "Polish capstone UI/UX with smooth micro-interactions",
            done: false,
          },
          {
            id: "t-12",
            label: "Conduct peer code reviews and stress-test performance",
            done: false,
          },
          {
            id: "t-13",
            label: "Prepare technical walkthrough video & public case study",
            done: false,
          },
        ],
        resources: ["System Design Primer", "NeetCode 150", "Tech Interview Handbook"],
      },
    ];
  }
}

export const dataService = new DataService();
