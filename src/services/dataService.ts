/**
 * DataService for Trajectify.AI
 *
 * Centralized data management layer backed by Supabase PostgreSQL with seamless
 * localStorage caching and offline fallback.
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";

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

export interface WhatIfSimulation {
  id?: string;
  scenarioName: string;
  hoursPerWeek: number;
  delayMonths: number;
  projectedProbability: number;
  projectedCompletionMonths: number;
  riskLevel: "Low" | "Medium" | "High";
  skillGrowthScore: number;
  comparisonData?: Record<string, unknown>;
}

class DataService {
  private memStore: Map<string, string> = new Map();

  private getStorageKey(userId: string): string {
    return `trajectify_profile_${userId}`;
  }

  private getItem(key: string): string | null {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return this.memStore.get(key) || null;
      }
    }
    return this.memStore.get(key) || null;
  }

  private setItem(key: string, value: string): void {
    this.memStore.set(key, value);
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // ignore
      }
    }
  }

  private removeItem(key: string): void {
    this.memStore.delete(key);
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // ignore
      }
    }
  }

  // Helper to test if a string is a valid UUID
  private isUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  // Read Profile (Supabase with explicit error propagation)
  async getProfile(userId: string): Promise<UserProfile | null> {
    if (!userId) return null;

    // 1. If Supabase is configured and userId is a valid UUID, query Supabase directly
    if (isSupabaseConfigured() && this.isUUID(userId)) {
      try {
        const profile = await this.fetchProfileFromSupabase(userId);
        if (profile) {
          this.setItem(this.getStorageKey(userId), JSON.stringify(profile));
        }
        return profile;
      } catch (err) {
        console.error("Database query failed while fetching student profile:", err);
        throw err;
      }
    }

    // 2. Fallback only when Supabase is not configured (local preview mode)
    try {
      const data = this.getItem(this.getStorageKey(userId));
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error("Failed to read profile from cache:", e);
      return null;
    }
  }

  // Fetch and reconstruct complete UserProfile from Supabase relational tables
  private async fetchProfileFromSupabase(userId: string): Promise<UserProfile | null> {
    // 1. Fetch student_profiles
    const { data: profileRow, error: pError } = await supabase
      .from("student_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (pError) {
      throw new Error(`Failed to fetch student profile: ${pError.message}`);
    }
    if (!profileRow) {
      return null;
    }

    // 2. Fetch career_goals
    const { data: goalRows, error: gError } = await supabase
      .from("career_goals")
      .select("*")
      .eq("student_id", userId)
      .order("created_at", { ascending: false });

    if (gError) {
      throw new Error(`Failed to fetch career goals: ${gError.message}`);
    }

    // Fetch all student skills for this student
    const { data: studentSkillRows, error: ssQueryErr } = await supabase
      .from("student_skills")
      .select("skill_id, level, verified, skills(id, name, category)")
      .eq("student_id", userId);

    if (ssQueryErr) {
      console.error("Failed to fetch student skills from Supabase:", ssQueryErr);
    }

    const assessedSkills: SkillItem[] = (studentSkillRows || [])
      .map((ss) => {
        const skillObj = Array.isArray(ss.skills) ? ss.skills[0] : ss.skills;
        const name = (skillObj as unknown as { name?: string })?.name;
        return name ? { name, level: ss.level } : null;
      })
      .filter((s): s is SkillItem => s !== null);

    if (!goalRows || goalRows.length === 0) {
      // Profile exists but no goals created yet
      return {
        id: profileRow.id,
        name: profileRow.full_name,
        initials: profileRow.initials || "ST",
        avatarUrl: profileRow.avatar_url || undefined,
        activeGoalId: profileRow.active_goal_id || "",
        goals: [],
        createdAt: profileRow.created_at,
        updatedAt: profileRow.updated_at,
      };
    }

    // 3. For each goal, fetch roadmaps, milestones, tasks, and check-ins
    const assembledGoals: Goal[] = [];

    for (const g of goalRows) {
      // Fetch skills from goal_requirements
      const { data: reqRows } = await supabase
        .from("goal_requirements")
        .select("skill_name, target_level")
        .eq("goal_id", g.id);

      let skills: SkillItem[] = (reqRows || []).map((r) => {
        const matchingAssessed = assessedSkills.find(
          (as) => as.name.trim().toLowerCase() === r.skill_name.trim().toLowerCase(),
        );
        return {
          name: r.skill_name,
          level: matchingAssessed ? matchingAssessed.level : r.target_level,
        };
      });

      // If goal has no requirements but student has assessed skills, populate from student_skills
      if (skills.length === 0 && assessedSkills.length > 0) {
        skills = assessedSkills;
      }

      // Fetch roadmaps
      const { data: roadmapRows } = await supabase
        .from("roadmaps")
        .select("id")
        .eq("goal_id", g.id)
        .eq("student_id", userId)
        .limit(1);

      const roadmapId = roadmapRows?.[0]?.id;
      let milestones: Milestone[] = [];

      if (roadmapId) {
        // Fetch milestones
        const { data: milestoneRows } = await supabase
          .from("roadmap_milestones")
          .select("*")
          .eq("roadmap_id", roadmapId)
          .order("sort_order", { ascending: true });

        if (milestoneRows && milestoneRows.length > 0) {
          const milestoneIds = milestoneRows.map((m) => m.id);

          // Fetch all tasks for these milestones
          const { data: taskRows } = await supabase
            .from("milestone_tasks")
            .select("*")
            .in("milestone_id", milestoneIds)
            .order("sort_order", { ascending: true });

          milestones = milestoneRows.map((m) => {
            const mTasks: MilestoneTask[] = (taskRows || [])
              .filter((t) => t.milestone_id === m.id)
              .map((t) => ({
                id: t.id,
                label: t.label,
                done: Boolean(t.is_done),
              }));

            return {
              id: m.id,
              month: m.month_label,
              title: m.title,
              status: m.status as MilestoneStatus,
              outcome: m.outcome,
              tasks: mTasks,
              resources: Array.isArray(m.resources) ? (m.resources as string[]) : [],
            };
          });
        }
      }

      // Fetch progress_logs (check-ins)
      const { data: logRows } = await supabase
        .from("progress_logs")
        .select("*")
        .eq("goal_id", g.id)
        .eq("student_id", userId)
        .order("log_date", { ascending: false });

      const checkIns: CheckInRecord[] = (logRows || []).map((l) => ({
        id: l.id,
        date: new Date(l.log_date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        notes: l.notes || "",
        actualHours: Number(l.actual_hours) || 0,
        completedTaskIds: Array.isArray(l.completed_task_ids) ? (l.completed_task_ids as string[]) : [],
        mood: (l.mood as 1 | 2 | 3 | 4 | 5) || 3,
        blockers: l.blockers || undefined,
        goalChanges: l.goal_changes || undefined,
      }));

      // Fallback default dimensions if empty
      const dimensions: DimensionMetric[] = Array.isArray(g.dimensions) && g.dimensions.length > 0
        ? (g.dimensions as DimensionMetric[])
        : [
            { dim: "Skills", value: Math.min(95, Math.max(30, skills.length * 15)) },
            { dim: "Time", value: Math.min(95, Math.round((g.hours_per_week / 20) * 80)) },
            { dim: "Consistency", value: 75 },
            { dim: "Market alignment", value: 82 },
            { dim: "Risk resilience", value: 65 },
            { dim: "Momentum", value: 80 },
          ];

      // Fallback weekly hours
      const weeklyHours: WeeklyHourEntry[] = Array.isArray(g.weekly_hours_history) && g.weekly_hours_history.length > 0
        ? (g.weekly_hours_history as WeeklyHourEntry[])
        : [
            { week: "W1", hours: Math.max(1, Math.round(g.hours_per_week * 0.7)), target: g.hours_per_week },
            { week: "W2", hours: g.hours_per_week, target: g.hours_per_week },
          ];

      assembledGoals.push({
        id: g.id,
        domain: g.domain,
        title: g.title,
        description: g.description || undefined,
        skills,
        hoursPerWeek: g.hours_per_week,
        targetDate: g.target_date,
        startDate: new Date(g.start_date || g.created_at).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        progress: g.progress_percentage || 0,
        probability: g.probability_score || 70,
        streak: g.streak || 0,
        dimensions,
        weeklyHours,
        roadmap: milestones,
        checkIns,
      });
    }

    const activeGoalId = profileRow.active_goal_id || (assembledGoals[0] ? assembledGoals[0].id : "");

    return {
      id: profileRow.id,
      name: profileRow.full_name,
      initials: profileRow.initials || "ST",
      avatarUrl: profileRow.avatar_url || undefined,
      activeGoalId,
      goals: assembledGoals,
      createdAt: profileRow.created_at,
      updatedAt: profileRow.updated_at,
    };
  }

  // Save profile to local storage cache & Supabase
  async saveProfile(profile: UserProfile): Promise<UserProfile> {
    if (!profile || !profile.id) return profile;
    profile.updatedAt = new Date().toISOString();
    this.setItem(this.getStorageKey(profile.id), JSON.stringify(profile));

    if (isSupabaseConfigured() && this.isUUID(profile.id)) {
      try {
        // 1. Upsert student_profiles
        const { error: pErr } = await supabase
          .from("student_profiles")
          .upsert({
            id: profile.id,
            full_name: profile.name,
            initials: profile.initials,
            avatar_url: profile.avatarUrl || null,
          });

        if (pErr) {
          throw new Error(`Failed to upsert student profile: ${pErr.message}`);
        }

        const activeGoal =
          profile.goals.find((g) => g.id === profile.activeGoalId) || profile.goals[0];

        if (activeGoal) {
          let goalId = activeGoal.id;

          if (this.isUUID(goalId)) {
            const { error: gErr } = await supabase
              .from("career_goals")
              .update({
                domain: activeGoal.domain,
                title: activeGoal.title,
                hours_per_week: activeGoal.hoursPerWeek,
                target_date: activeGoal.targetDate,
                progress_percentage: activeGoal.progress,
                probability_score: activeGoal.probability,
                streak: activeGoal.streak,
              })
              .eq("id", goalId)
              .eq("student_id", profile.id);

            if (gErr) {
              throw new Error(`Failed to update career goal: ${gErr.message}`);
            }
          } else {
            // Goal ID was local/non-UUID, insert into career_goals
            const { data: newG, error: gInsertErr } = await supabase
              .from("career_goals")
              .insert({
                student_id: profile.id,
                domain: activeGoal.domain,
                title: activeGoal.title,
                hours_per_week: activeGoal.hoursPerWeek,
                target_date: activeGoal.targetDate,
                progress_percentage: activeGoal.progress,
                probability_score: activeGoal.probability,
                streak: activeGoal.streak,
                is_active: true,
                dimensions: activeGoal.dimensions,
                weekly_hours_history: activeGoal.weeklyHours,
              })
              .select("id")
              .single();

            if (gInsertErr || !newG) {
              throw new Error(gInsertErr?.message || "Failed to persist goal to database.");
            }
            goalId = newG.id;
            activeGoal.id = goalId;
            profile.activeGoalId = goalId;
          }

          // Ensure active_goal_id is linked on student_profiles AFTER goal exists (respecting foreign key)
          const { error: aErr } = await supabase
            .from("student_profiles")
            .update({ active_goal_id: goalId })
            .eq("id", profile.id);

          if (aErr) {
            throw new Error(`Failed to link active goal: ${aErr.message}`);
          }

          // Sync goal_requirements and student_skills
          if (activeGoal.skills && activeGoal.skills.length > 0) {
            // Delete existing goal_requirements for this goal before re-inserting
            await supabase.from("goal_requirements").delete().eq("goal_id", goalId);

            for (const sk of activeGoal.skills) {
              if (!sk.name || !sk.name.trim()) continue;
              const cleanName = sk.name.trim();
              const cleanLevel = Math.max(1, Math.min(10, Number(sk.level) || 5));

              const { data: skillRow } = await supabase
                .from("skills")
                .select("id")
                .ilike("name", cleanName)
                .maybeSingle();

              let skillId = skillRow?.id;
              if (!skillId) {
                const { data: createdSkill } = await supabase
                  .from("skills")
                  .insert({ name: cleanName, category: activeGoal.domain, is_system: false })
                  .select("id")
                  .maybeSingle();
                if (createdSkill?.id) {
                  skillId = createdSkill.id;
                } else {
                  const { data: retrySkill } = await supabase
                    .from("skills")
                    .select("id")
                    .ilike("name", cleanName)
                    .maybeSingle();
                  skillId = retrySkill?.id;
                }
              }

              // Save to goal_requirements
              const { error: reqErr } = await supabase.from("goal_requirements").insert({
                goal_id: goalId,
                skill_id: skillId || null,
                skill_name: cleanName,
                target_level: cleanLevel,
                priority: "required",
              });
              if (reqErr) {
                console.warn("goal_requirements insert warning:", reqErr.message);
              }

              // Upsert to student_skills with profile.id as student_id
              if (skillId) {
                const { error: ssErr } = await supabase.from("student_skills").upsert(
                  {
                    student_id: profile.id,
                    skill_id: skillId,
                    level: cleanLevel,
                  },
                  { onConflict: "student_id,skill_id" },
                );

                if (ssErr) {
                  throw new Error(`Failed to save student skill "${cleanName}": ${ssErr.message}`);
                }
              }
            }
          }
        }
      } catch (e) {
        console.error("Error saving profile edits to Supabase:", e);
        throw e;
      }
    }

    return profile;
  }

  // Retrieve standardized skills catalog from Supabase
  async getSkillsCatalog(): Promise<{ id: string; name: string; category: string }[]> {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("skills")
          .select("id, name, category")
          .order("name", { ascending: true });

        if (!error && data && data.length > 0) {
          return data;
        }
      } catch (e) {
        console.warn("Error fetching skills catalog from Supabase:", e);
      }
    }

    return [
      { id: "1", name: "React", category: "Frontend" },
      { id: "2", name: "TypeScript", category: "Engineering" },
      { id: "3", name: "JavaScript", category: "Frontend" },
      { id: "4", name: "Node.js", category: "Backend" },
      { id: "5", name: "PostgreSQL", category: "Database" },
      { id: "6", name: "Python", category: "Data & AI" },
      { id: "7", name: "System Design", category: "Engineering" },
    ];
  }

  // Aggregated student dashboard data via verified RPC contract
  async getStudentDashboardData(userId: string): Promise<UserProfile | null> {
    if (isSupabaseConfigured() && this.isUUID(userId)) {
      try {
        const { data, error } = await supabase.rpc("get_student_dashboard");
        if (!error && data?.profile) {
          // If RPC succeeded and profile is populated, sync profile
          return await this.fetchProfileFromSupabase(userId);
        }
      } catch (e) {
        console.warn("get_student_dashboard RPC error, falling back to fetchProfileFromSupabase:", e);
      }
    }
    return this.getProfile(userId);
  }

  // Reset Data
  async resetData(userId: string): Promise<void> {
    this.removeItem(this.getStorageKey(userId));
    this.removeItem("trajectify_onboarding_draft");
    this.removeItem("trajectify_checkin_draft");

    if (isSupabaseConfigured() && this.isUUID(userId)) {
      try {
        await supabase.from("career_goals").delete().eq("student_id", userId);
        await supabase.from("student_skills").delete().eq("student_id", userId);
        await supabase.from("what_if_comparisons").delete().eq("student_id", userId);
        await supabase
          .from("student_profiles")
          .update({ active_goal_id: null })
          .eq("id", userId);
      } catch (e) {
        console.error("Error resetting data in Supabase:", e);
      }
    }
  }

  // Create an initial tailored trajectory from the onboarding wizard
  async createInitialProfile(userId: string, input: OnboardingInput): Promise<UserProfile> {
    const parts = input.name.trim().split(/\s+/);
    const initials = (
      parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : input.name.slice(0, 2)
    ).toUpperCase();

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

    const initialProbability = Math.min(94, Math.max(50, 60 + Math.round(input.hoursPerWeek * 1.5)));

    // 1. If Supabase configured, persist to database
    if (isSupabaseConfigured() && this.isUUID(userId)) {
      try {
        // 1. Upsert student_profiles
        const { error: pError } = await supabase.from("student_profiles").upsert({
          id: userId,
          full_name: input.name.trim(),
          avatar_url: input.avatarUrl || null,
          initials,
        });

        if (pError) {
          throw new Error(`Failed to save student profile: ${pError.message}`);
        }

        // 2. Insert career_goals with student_id = userId
        const { data: newGoalRow, error: gError } = await supabase
          .from("career_goals")
          .insert({
            student_id: userId,
            domain: input.domain,
            title: input.goal,
            hours_per_week: input.hoursPerWeek,
            target_date: input.targetDate,
            progress_percentage: 5,
            probability_score: initialProbability,
            streak: 1,
            is_active: true,
            dimensions: calculatedDimensions,
            weekly_hours_history: weeklyHours,
          })
          .select("id")
          .single();

        if (gError || !newGoalRow) {
          throw new Error(gError?.message || "Failed to create goal in database.");
        }

        const goalId = newGoalRow.id;

        // 3. Update active_goal_id on student_profiles AFTER goal exists (respecting fk_student_profiles_active_goal)
        const { error: aError } = await supabase
          .from("student_profiles")
          .update({ active_goal_id: goalId })
          .eq("id", userId);

        if (aError) {
          throw new Error(`Failed to activate goal on profile: ${aError.message}`);
        }

        // 4. Insert skills into goal_requirements and student_skills
        for (const s of input.skills) {
          if (!s.name || !s.name.trim()) continue;
          const cleanName = s.name.trim();
          const cleanLevel = Math.max(1, Math.min(10, Number(s.level) || 5));

          // Look up skill catalog or insert custom skill
          const { data: skillCatalog } = await supabase
            .from("skills")
            .select("id")
            .ilike("name", cleanName)
            .maybeSingle();

          let skillId = skillCatalog?.id;
          if (!skillId) {
            const { data: createdSkill } = await supabase
              .from("skills")
              .insert({ name: cleanName, category: input.domain, is_system: false })
              .select("id")
              .maybeSingle();
            if (createdSkill?.id) {
              skillId = createdSkill.id;
            } else {
              const { data: retrySkill } = await supabase
                .from("skills")
                .select("id")
                .ilike("name", cleanName)
                .maybeSingle();
              skillId = retrySkill?.id;
            }
          }

          // Insert into goal_requirements
          const { error: reqErr } = await supabase.from("goal_requirements").insert({
            goal_id: goalId,
            skill_id: skillId || null,
            skill_name: cleanName,
            target_level: cleanLevel,
            priority: "required",
          });
          if (reqErr) {
            console.warn("goal_requirements insert warning:", reqErr.message);
          }

          // Insert into student_skills with authenticated userId as student_id
          if (skillId) {
            const { error: ssErr } = await supabase.from("student_skills").upsert(
              {
                student_id: userId,
                skill_id: skillId,
                level: cleanLevel,
              },
              { onConflict: "student_id,skill_id" },
            );
            if (ssErr) {
              throw new Error(`Failed to save student skill "${cleanName}": ${ssErr.message}`);
            }
          }
        }

        // Insert roadmap
        const { data: roadmapRow } = await supabase
          .from("roadmaps")
          .insert({
            student_id: userId,
            goal_id: goalId,
            title: input.goal,
            total_milestones: roadmap.length,
            completed_milestones: 0,
          })
          .select("id")
          .single();

        if (roadmapRow) {
          // Insert milestones and tasks
          for (let mIdx = 0; mIdx < roadmap.length; mIdx++) {
            const m = roadmap[mIdx];
            const { data: milestoneRow } = await supabase
              .from("roadmap_milestones")
              .insert({
                roadmap_id: roadmapRow.id,
                student_id: userId,
                month_label: m.month,
                sort_order: mIdx + 1,
                title: m.title,
                status: m.status,
                outcome: m.outcome,
                resources: m.resources,
              })
              .select("id")
              .single();

            if (milestoneRow && m.tasks) {
              const taskInserts = m.tasks.map((t, tIdx) => ({
                milestone_id: milestoneRow.id,
                student_id: userId,
                label: t.label,
                is_done: Boolean(t.done),
                sort_order: tIdx + 1,
              }));
              await supabase.from("milestone_tasks").insert(taskInserts);
            }
          }
        }

        // Fetch freshly created profile from Supabase
        const freshProfile = await this.fetchProfileFromSupabase(userId);
        if (freshProfile) {
          this.setItem(this.getStorageKey(userId), JSON.stringify(freshProfile));
          this.removeItem("trajectify_onboarding_draft");
          return freshProfile;
        }
        throw new Error("Initial profile was inserted, but verification fetch failed.");
      } catch (err) {
        console.error("Database error creating initial profile:", err);
        throw err;
      }
    }

    // 2. Local fallback
    const goalId = "goal_" + Math.random().toString(36).slice(2, 9);
    const goal: Goal = {
      id: goalId,
      domain: input.domain,
      title: input.goal,
      skills: input.skills,
      hoursPerWeek: input.hoursPerWeek,
      targetDate: input.targetDate,
      startDate: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
      progress: 5,
      probability: initialProbability,
      streak: 1,
      dimensions: calculatedDimensions,
      weeklyHours,
      roadmap,
      checkIns: [],
    };

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
    this.removeItem("trajectify_onboarding_draft");
    return profile;
  }

  // Toggle tasks in a milestone (Supabase RPC + Local fallback)
  async toggleTask(
    userId: string,
    milestoneId: string,
    taskId: string,
  ): Promise<UserProfile | null> {
    // 1. If Supabase configured and taskId is a valid UUID, use toggle_milestone_task RPC
    if (isSupabaseConfigured() && this.isUUID(taskId)) {
      try {
        const { error } = await supabase.rpc("toggle_milestone_task", {
          p_task_id: taskId,
        });

        if (error) {
          throw new Error(`Database task update failed: ${error.message}`);
        }

        const updatedProfile = await this.fetchProfileFromSupabase(userId);
        if (updatedProfile) {
          this.setItem(this.getStorageKey(userId), JSON.stringify(updatedProfile));
          return updatedProfile;
        }
        throw new Error("Task updated, but unable to re-fetch updated profile.");
      } catch (err) {
        console.error("Error toggling task via Supabase:", err);
        throw err;
      }
    }

    // 2. Local fallback
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
      } else {
        status = "Upcoming";
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

  // Record a weekly check-in (Supabase RPC + Local fallback)
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

    // 1. If Supabase is configured and goalId is valid UUID, use Supabase RPC
    if (isSupabaseConfigured() && this.isUUID(goal.id)) {
      try {
        const { data, error } = await supabase.rpc("log_weekly_checkin", {
          p_goal_id: goal.id,
          p_actual_hours: checkInInput.actualHours,
          p_mood: checkInInput.mood,
          p_notes: checkInInput.notes || null,
          p_blockers: checkInInput.blockers || null,
          p_goal_changes: checkInInput.goalChanges || null,
          p_completed_task_ids: checkInInput.completedTaskIds || [],
        });

        if (error) {
          throw new Error(`Database check-in failed: ${error.message}`);
        }

        if (data) {
          const freshProfile = await this.fetchProfileFromSupabase(userId);
          const newCheckIn: CheckInRecord = {
            id: (data as { logId?: string }).logId || "chk_" + Math.random().toString(36).slice(2, 9),
            date: new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }),
            ...checkInInput,
          };

          if (freshProfile) {
            this.setItem(this.getStorageKey(userId), JSON.stringify(freshProfile));
            return { profile: freshProfile, newCheckIn };
          }
          throw new Error("Check-in logged, but unable to re-fetch updated profile.");
        }
      } catch (err) {
        console.error("log_weekly_checkin RPC error:", err);
        throw err;
      }
    }

    // 2. Local fallback
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
    ].slice(-8);

    // Update streak & probability
    goal.streak = (goal.streak || 0) + 1;
    const hourDelta = checkInInput.actualHours - goal.hoursPerWeek;
    if (hourDelta >= 0) {
      goal.probability = Math.min(98, goal.probability + 2);
    } else if (hourDelta < -4) {
      goal.probability = Math.max(35, goal.probability - 2);
    }

    const saved = await this.saveProfile(profile);
    this.removeItem("trajectify_checkin_draft");

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

    const roadmap = this.generateRoadmapForGoal(
      goalInput.domain,
      goalInput.title,
      goalInput.skills,
      goalInput.hoursPerWeek,
      goalInput.targetDate,
    );

    const calculatedDimensions: DimensionMetric[] = [
      { dim: "Skills", value: 45 },
      { dim: "Time", value: 70 },
      { dim: "Consistency", value: 65 },
      { dim: "Market alignment", value: 80 },
      { dim: "Risk resilience", value: 60 },
      { dim: "Momentum", value: 70 },
    ];

    const weeklyHours: WeeklyHourEntry[] = [{ week: "W1", hours: 0, target: goalInput.hoursPerWeek }];

    // 1. If Supabase configured
    if (isSupabaseConfigured() && this.isUUID(userId)) {
      try {
        // Set all existing goals for this student to is_active = false
        await supabase
          .from("career_goals")
          .update({ is_active: false })
          .eq("student_id", userId);

        const { data: createdGoal, error: gError } = await supabase
          .from("career_goals")
          .insert({
            student_id: userId,
            domain: goalInput.domain,
            title: goalInput.title,
            hours_per_week: goalInput.hoursPerWeek,
            target_date: goalInput.targetDate,
            progress_percentage: 0,
            probability_score: 70,
            streak: 0,
            is_active: true,
            dimensions: calculatedDimensions,
            weekly_hours_history: weeklyHours,
          })
          .select("id")
          .single();

        if (gError || !createdGoal) {
          throw new Error(gError?.message || "Failed to create career goal in database.");
        }

        const newGoalId = createdGoal.id;

        // Update active_goal_id on student_profiles AFTER goal exists (respecting foreign-key fk_student_profiles_active_goal)
        const { error: linkErr } = await supabase
          .from("student_profiles")
          .update({ active_goal_id: newGoalId })
          .eq("id", userId);

        if (linkErr) {
          throw new Error(`Failed to activate goal on profile: ${linkErr.message}`);
        }

        // Save skills into student_skills and goal_requirements
        for (const s of goalInput.skills || []) {
          if (!s.name || !s.name.trim()) continue;
          const cleanName = s.name.trim();
          const cleanLevel = Math.max(1, Math.min(10, Number(s.level) || 5));

          const { data: skillRow } = await supabase
            .from("skills")
            .select("id")
            .ilike("name", cleanName)
            .maybeSingle();

          let skillId = skillRow?.id;
          if (!skillId) {
            const { data: createdSkill } = await supabase
              .from("skills")
              .insert({ name: cleanName, category: goalInput.domain, is_system: false })
              .select("id")
              .maybeSingle();
            if (createdSkill?.id) {
              skillId = createdSkill.id;
            } else {
              const { data: retrySkill } = await supabase
                .from("skills")
                .select("id")
                .ilike("name", cleanName)
                .maybeSingle();
              skillId = retrySkill?.id;
            }
          }

          // Insert into goal_requirements
          const { error: reqErr } = await supabase.from("goal_requirements").insert({
            goal_id: newGoalId,
            skill_id: skillId || null,
            skill_name: cleanName,
            target_level: cleanLevel,
            priority: "required",
          });
          if (reqErr) {
            console.warn("goal_requirements insert warning:", reqErr.message);
          }

          // Insert into student_skills with authenticated userId as student_id
          if (skillId) {
            const { error: ssErr } = await supabase.from("student_skills").upsert(
              {
                student_id: userId,
                skill_id: skillId,
                level: cleanLevel,
              },
              { onConflict: "student_id,skill_id" },
            );
            if (ssErr) {
              throw new Error(`Failed to save student skill "${cleanName}": ${ssErr.message}`);
            }
          }
        }

        // Insert roadmap
        const { data: roadmapRow } = await supabase
          .from("roadmaps")
          .insert({
            student_id: userId,
            goal_id: newGoalId,
            title: goalInput.title,
            total_milestones: roadmap.length,
          })
          .select("id")
          .single();

        if (roadmapRow) {
          for (let i = 0; i < roadmap.length; i++) {
            const m = roadmap[i];
            const { data: mRow } = await supabase
              .from("roadmap_milestones")
              .insert({
                roadmap_id: roadmapRow.id,
                student_id: userId,
                month_label: m.month,
                sort_order: i + 1,
                title: m.title,
                status: m.status,
                outcome: m.outcome,
                resources: m.resources,
              })
              .select("id")
              .single();

            if (mRow && m.tasks) {
              await supabase.from("milestone_tasks").insert(
                m.tasks.map((t, idx) => ({
                  milestone_id: mRow.id,
                  student_id: userId,
                  label: t.label,
                  is_done: Boolean(t.done),
                  sort_order: idx + 1,
                })),
              );
            }
          }
        }

        const fresh = await this.fetchProfileFromSupabase(userId);
        if (fresh) {
          this.setItem(this.getStorageKey(userId), JSON.stringify(fresh));
          return fresh;
        }
      } catch (e) {
        console.error("Error adding goal in Supabase:", e);
        throw e;
      }
    }

    // 2. Local fallback
    const newGoalId = "goal_" + Math.random().toString(36).slice(2, 9);
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
      dimensions: calculatedDimensions,
      weeklyHours,
      roadmap,
      checkIns: [],
    };

    profile.goals.push(newGoal);
    profile.activeGoalId = newGoalId;
    return await this.saveProfile(profile);
  }

  async switchActiveGoal(userId: string, goalId: string): Promise<UserProfile> {
    if (isSupabaseConfigured() && this.isUUID(userId) && this.isUUID(goalId)) {
      try {
        // 1. Set all other goals to is_active = false
        await supabase
          .from("career_goals")
          .update({ is_active: false })
          .eq("student_id", userId);

        // 2. Set selected goal to is_active = true
        await supabase
          .from("career_goals")
          .update({ is_active: true })
          .eq("id", goalId)
          .eq("student_id", userId);

        // 3. Update active_goal_id on student_profiles (respecting foreign key)
        const { error: pErr } = await supabase
          .from("student_profiles")
          .update({ active_goal_id: goalId })
          .eq("id", userId);

        if (pErr) {
          throw new Error(`Failed to activate goal on profile: ${pErr.message}`);
        }

        const fresh = await this.fetchProfileFromSupabase(userId);
        if (fresh) {
          this.setItem(this.getStorageKey(userId), JSON.stringify(fresh));
          return fresh;
        }
      } catch (e) {
        console.error("Error switching active goal in Supabase:", e);
        throw e;
      }
    }

    const profile = await this.getProfile(userId);
    if (!profile) throw new Error("Profile not found");
    if (profile.goals.some((g) => g.id === goalId)) {
      profile.activeGoalId = goalId;
      return await this.saveProfile(profile);
    }
    return profile;
  }

  async deleteGoal(userId: string, goalId: string): Promise<UserProfile> {
    if (isSupabaseConfigured() && this.isUUID(userId) && this.isUUID(goalId)) {
      try {
        // Clear active_goal_id first if this goal is active to respect foreign key constraint
        await supabase
          .from("student_profiles")
          .update({ active_goal_id: null })
          .eq("id", userId)
          .eq("active_goal_id", goalId);

        await supabase.from("career_goals").delete().eq("id", goalId).eq("student_id", userId);
        const fresh = await this.fetchProfileFromSupabase(userId);
        if (fresh) {
          // If other goals remain, set the first as active
          if (fresh.goals.length > 0 && !fresh.activeGoalId) {
            await this.switchActiveGoal(userId, fresh.goals[0].id);
            return (await this.fetchProfileFromSupabase(userId)) || fresh;
          }
          this.setItem(this.getStorageKey(userId), JSON.stringify(fresh));
          return fresh;
        }
      } catch (e) {
        console.error("Error deleting goal in Supabase:", e);
        throw e;
      }
    }

    const profile = await this.getProfile(userId);
    if (!profile) throw new Error("Profile not found");
    profile.goals = profile.goals.filter((g) => g.id !== goalId);
    if (profile.activeGoalId === goalId && profile.goals.length > 0) {
      profile.activeGoalId = profile.goals[0].id;
    }
    return await this.saveProfile(profile);
  }

  // What-If Simulation persistence
  async saveWhatIfComparison(
    userId: string,
    goalId: string,
    simulation: WhatIfSimulation,
  ): Promise<void> {
    if (isSupabaseConfigured() && this.isUUID(userId)) {
      try {
        const { error } = await supabase.from("what_if_comparisons").insert({
          student_id: userId,
          goal_id: this.isUUID(goalId) ? goalId : null,
          scenario_name: simulation.scenarioName,
          hours_per_week: simulation.hoursPerWeek,
          delay_months: simulation.delayMonths,
          projected_probability: simulation.projectedProbability,
          projected_completion_months: simulation.projectedCompletionMonths,
          risk_level: simulation.riskLevel,
          skill_growth_score: simulation.skillGrowthScore,
          comparison_data: simulation.comparisonData || {},
        });
        if (error) {
          console.error("Failed to save what-if simulation to Supabase:", error);
          throw new Error(`Failed to save simulation: ${error.message}`);
        }
      } catch (e) {
        console.error("Failed to save what-if simulation to Supabase:", e);
        throw e;
      }
    }
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
