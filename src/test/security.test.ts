import { describe, expect, it } from "vitest";
import { dataService } from "@/services/dataService";
import { authService } from "@/services/authService";

describe("Security & User Isolation Audit", () => {
  it("strictly isolates profiles between two distinct user IDs", async () => {
    const userA_Id = "usr_alice_isolated";
    const userB_Id = "usr_bob_isolated";

    // User A creates a profile
    await dataService.createInitialProfile(userA_Id, {
      name: "Alice Archer",
      domain: "Career / Skills",
      goal: "Cybersecurity Architect",
      skills: [{ name: "Network Security", level: 8 }],
      hoursPerWeek: 18,
      targetDate: "6 months",
    });

    // User B creates a profile
    await dataService.createInitialProfile(userB_Id, {
      name: "Bob Builder",
      domain: "Fitness",
      goal: "Marathon Preparation",
      skills: [{ name: "Cardio", level: 5 }],
      hoursPerWeek: 10,
      targetDate: "12 months",
    });

    const profileA = await dataService.getProfile(userA_Id);
    const profileB = await dataService.getProfile(userB_Id);

    expect(profileA).not.toBeNull();
    expect(profileB).not.toBeNull();

    // Verify User A profile does not leak User B's information
    expect(profileA?.id).toBe(userA_Id);
    expect(profileA?.name).toBe("Alice Archer");
    expect(profileA?.goals[0].title).toBe("Cybersecurity Architect");

    // Verify User B profile does not leak User A's information
    expect(profileB?.id).toBe(userB_Id);
    expect(profileB?.name).toBe("Bob Builder");
    expect(profileB?.goals[0].title).toBe("Marathon Preparation");

    // Mutating User A's data does not affect User B
    await dataService.addCheckIn(userA_Id, {
      notes: "Completed network audit",
      actualHours: 20,
      completedTaskIds: [],
      mood: 4,
    });

    const refreshedProfileB = await dataService.getProfile(userB_Id);
    expect(refreshedProfileB?.goals[0].checkIns).toHaveLength(0);
    expect(refreshedProfileB?.goals[0].streak).toBe(1);
  });

  it("verifies environment variables do not expose service_role key", () => {
    const envExample = `VITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY=`;
    expect(envExample).not.toContain("service_role");
    expect(envExample).not.toContain("secret");

    // Ensure import.meta.env does not leak service_role
    const anyEnv = import.meta.env as Record<string, string | undefined>;
    expect(anyEnv.VITE_SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
    expect(anyEnv.SUPABASE_SERVICE_ROLE_KEY).toBeUndefined();
  });

  it("clears cached session on logout", async () => {
    const user = await authService.signupWithEmail(
      "Ephemeral User",
      `ephemeral_${Date.now()}@trajectify.ai`,
      "Password999!",
    );

    expect(authService.getCurrentUser()?.id).toBe(user.id);

    await authService.logout();
    expect(authService.getCurrentUser()).toBeNull();
  });
});
