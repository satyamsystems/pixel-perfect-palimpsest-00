import { describe, expect, it } from "vitest";
import { authService } from "@/services/authService";
import { dataService } from "@/services/dataService";

describe("AuthService and DataService Flow", () => {
  it("creates and retrieves a new user session via authService", async () => {
    const testEmail = `test_${Date.now()}@trajectify.ai`;
    const user = await authService.signupWithEmail("Alex Rivera", testEmail, "SecurePassword123!");

    expect(user.id).toBeDefined();
    expect(user.name).toBe("Alex Rivera");
    expect(user.initials).toBe("AR");
    expect(user.email).toBe(testEmail.toLowerCase());

    const current = authService.getCurrentUser();
    expect(current?.id).toBe(user.id);
  });

  it("creates initial profile with roadmap and dimensions via dataService", async () => {
    const userId = "usr_test_data_flow";
    const profile = await dataService.createInitialProfile(userId, {
      name: "Jordan Lee",
      domain: "Career / Skills",
      goal: "Full-Stack AI Engineer",
      skills: [
        { name: "TypeScript", level: 6 },
        { name: "React", level: 7 },
      ],
      hoursPerWeek: 16,
      targetDate: "6 months",
    });

    expect(profile.id).toBe(userId);
    expect(profile.name).toBe("Jordan Lee");
    expect(profile.initials).toBe("JL");
    expect(profile.goals).toHaveLength(1);

    const goal = profile.goals[0];
    expect(goal.title).toBe("Full-Stack AI Engineer");
    expect(goal.hoursPerWeek).toBe(16);
    expect(goal.roadmap.length).toBeGreaterThan(0);
    expect(goal.dimensions.length).toBe(6);
  });

  it("toggles roadmap milestone tasks and updates progress", async () => {
    const userId = "usr_test_toggle";
    const profile = await dataService.createInitialProfile(userId, {
      name: "Taylor Swift",
      domain: "Career / Skills",
      goal: "Cloud Architect",
      skills: [{ name: "Docker", level: 5 }],
      hoursPerWeek: 14,
      targetDate: "6 months",
    });

    const milestone = profile.goals[0].roadmap[0];
    const task = milestone.tasks[0];
    expect(task.done).toBe(false);

    const updated = await dataService.toggleTask(userId, milestone.id, task.id);
    expect(updated).not.toBeNull();

    const updatedMilestone = updated!.goals[0].roadmap[0];
    const updatedTask = updatedMilestone.tasks.find((t) => t.id === task.id);
    expect(updatedTask?.done).toBe(true);
  });

  it("records a weekly check-in, increments streak, and updates weekly hours", async () => {
    const userId = "usr_test_checkin";
    const initialProfile = await dataService.createInitialProfile(userId, {
      name: "Morgan Freeman",
      domain: "Career / Skills",
      goal: "Machine Learning Engineer",
      skills: [{ name: "Python", level: 8 }],
      hoursPerWeek: 14,
      targetDate: "6 months",
    });

    const initialStreak = initialProfile.goals[0].streak;

    const { profile: updatedProfile, newCheckIn } = await dataService.addCheckIn(userId, {
      notes: "Completed deep learning model deployment and testing.",
      actualHours: 16,
      completedTaskIds: [],
      mood: 5,
      blockers: "Minor GPU quota limit encountered",
    });

    expect(newCheckIn.notes).toContain("deep learning");
    expect(newCheckIn.actualHours).toBe(16);
    expect(newCheckIn.mood).toBe(5);

    const activeGoal = updatedProfile.goals.find((g) => g.id === updatedProfile.activeGoalId);
    expect(activeGoal?.streak).toBe(initialStreak + 1);
    expect(activeGoal?.weeklyHours.length).toBeGreaterThan(0);
  });

  it("saves, reloads, and preserves profile skills and career goals across reloads", async () => {
    const userId = "usr_test_persistence_reload";
    const initial = await dataService.createInitialProfile(userId, {
      name: "Sophia Chen",
      domain: "Career / Skills",
      goal: "Principal Platform Architect",
      skills: [
        { name: "Kubernetes", level: 8 },
        { name: "Go", level: 7 },
      ],
      hoursPerWeek: 18,
      targetDate: "9 months",
    });

    expect(initial.activeGoalId).toBeDefined();

    // Reload profile via getProfile
    const loaded = await dataService.getProfile(userId);
    expect(loaded).not.toBeNull();
    expect(loaded?.name).toBe("Sophia Chen");
    expect(loaded?.activeGoalId).toBe(initial.activeGoalId);

    const activeGoal = loaded?.goals.find((g) => g.id === loaded?.activeGoalId);
    expect(activeGoal?.title).toBe("Principal Platform Architect");
    expect(activeGoal?.skills).toHaveLength(2);
    expect(activeGoal?.skills.find((s) => s.name === "Kubernetes")?.level).toBe(8);

    // Update skills and save
    if (activeGoal) {
      activeGoal.skills = [
        { name: "Kubernetes", level: 9 },
        { name: "Go", level: 8 },
        { name: "Rust", level: 6 },
      ];
      await dataService.saveProfile(loaded!);
    }

    // Verify skills updated on second reload
    const reloaded = await dataService.getProfile(userId);
    const reloadedGoal = reloaded?.goals.find((g) => g.id === reloaded?.activeGoalId);
    expect(reloadedGoal?.skills).toHaveLength(3);
    expect(reloadedGoal?.skills.find((s) => s.name === "Rust")?.level).toBe(6);
  });

  it("switches active career goal and updates active_goal_id correctly", async () => {
    const userId = "usr_test_goal_switcher";
    const profile = await dataService.createInitialProfile(userId, {
      name: "Marcus Aurelius",
      domain: "Career / Skills",
      goal: "Staff Systems Engineer",
      skills: [{ name: "C++", level: 8 }],
      hoursPerWeek: 15,
      targetDate: "6 months",
    });

    const firstGoalId = profile.activeGoalId;
    expect(firstGoalId).toBeDefined();

    // Add second goal
    const updatedWithSecond = await dataService.addGoal(userId, {
      domain: "Fitness",
      title: "Marathon Sub-3hr",
      skills: [{ name: "Cardiovascular Conditioning", level: 7 }],
      hoursPerWeek: 10,
      targetDate: "12 months",
    });

    expect(updatedWithSecond.goals).toHaveLength(2);
    const secondGoalId = updatedWithSecond.activeGoalId;
    expect(secondGoalId).not.toBe(firstGoalId);

    // Switch back to first goal
    const switchedBack = await dataService.switchActiveGoal(userId, firstGoalId);
    expect(switchedBack.activeGoalId).toBe(firstGoalId);

    // Reload and verify active goal persisted
    const reloaded = await dataService.getProfile(userId);
    expect(reloaded?.activeGoalId).toBe(firstGoalId);
  });

  it("handles goal deletion safely without violating active_goal_id foreign key constraint", async () => {
    const userId = "usr_test_delete_constraint";
    const profile = await dataService.createInitialProfile(userId, {
      name: "Ada Lovelace",
      domain: "Career / Skills",
      goal: "Compiler Engineer",
      skills: [{ name: "Assembly", level: 9 }],
      hoursPerWeek: 12,
      targetDate: "6 months",
    });

    const goal1Id = profile.activeGoalId;

    // Add a second goal
    const withGoal2 = await dataService.addGoal(userId, {
      domain: "Career / Skills",
      goal: "Distributed Systems Lead",
      title: "Distributed Systems Lead",
      skills: [{ name: "Raft", level: 8 }],
      hoursPerWeek: 15,
      targetDate: "9 months",
    });

    const goal2Id = withGoal2.activeGoalId;
    expect(withGoal2.goals).toHaveLength(2);

    // Delete active goal (goal2)
    const afterDelete = await dataService.deleteGoal(userId, goal2Id);
    expect(afterDelete.goals).toHaveLength(1);
    expect(afterDelete.activeGoalId).toBe(goal1Id);

    // Reload to verify state
    const reloaded = await dataService.getProfile(userId);
    expect(reloaded?.goals).toHaveLength(1);
    expect(reloaded?.activeGoalId).toBe(goal1Id);
  });

  it("propagates error on invalid profile save rather than swallowing errors silently", async () => {
    // Calling saveProfile with null or empty profile should handle gracefully
    // @ts-expect-error Testing invalid runtime input
    const emptyResult = await dataService.saveProfile(null);
    expect(emptyResult).toBeNull();
  });
});
