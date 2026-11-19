import { describe, expect, it } from "vitest";
import { calculateSimulation, SkillRequirementInput } from "@/lib/scoring";

describe("Deterministic Scoring Engine (What-If Analysis)", () => {
  it("calculates zero gap when current skill equals or exceeds requirement (g = max(0, r - s))", () => {
    const skills: SkillRequirementInput[] = [
      { name: "React", r: 8, s: 8 },
      { name: "TypeScript", r: 7, s: 9 }, // Exceeds requirement
    ];

    const result = calculateSimulation({
      skills,
      hoursPerWeek: 14,
      targetMonths: 6,
    });

    expect(result.totalGap).toBe(0);
    expect(result.readinessF).toBe(1.0);
    expect(result.readinessPercent).toBe(100);
    expect(result.timeToReadinessMonths).toBe(0);
    expect(result.successScoreP).toBe(1.0);
    expect(result.successScorePercent).toBe(100);
    expect(result.riskLevel).toBe("Low");
  });

  it("calculates correct readiness F = 1 - Σ(w*g) / Σ(w*r)", () => {
    const skills: SkillRequirementInput[] = [
      { name: "Frontend", r: 10, s: 5, w: 1 }, // g = 5, w*g = 5, w*r = 10
      { name: "Backend", r: 10, s: 5, w: 1 }, // g = 5, w*g = 5, w*r = 10
    ];
    // sum_wg = 10, sum_wr = 20 => F = 1 - 10/20 = 0.5 (50%)

    const result = calculateSimulation({
      skills,
      hoursPerWeek: 15,
      targetMonths: 6,
    });

    expect(result.readinessF).toBe(0.5);
    expect(result.readinessPercent).toBe(50);
    expect(result.totalGap).toBe(10);
  });

  it("calculates time to readiness M = Σg / (4.33 * h_eff * v) accurately", () => {
    const skills: SkillRequirementInput[] = [
      { name: "Python", r: 10, s: 3, w: 1 }, // g = 7, F = 0.3
    ];
    const h = 20;
    const v = 0.1;
    // rate = 4.33 * 20 * 0.1 = 8.66 skill units per month
    // M = 7 / 8.66 = ~0.81 months

    const result = calculateSimulation({
      skills,
      hoursPerWeek: h,
      targetMonths: 6,
      velocity: v,
      adherence: 1.0,
      startDelayMonths: 0,
    });

    expect(result.timeToReadinessMonths).toBeCloseTo(0.81, 1);
    expect(result.successScoreP).toBeGreaterThan(0);
  });

  it("safely handles zero denominators and invalid inputs", () => {
    // Empty skills
    const emptyResult = calculateSimulation({
      skills: [],
      hoursPerWeek: 0, // Should be clamped to min 1
      targetMonths: 0, // Should be clamped to min 1
    });

    expect(Number.isFinite(emptyResult.readinessF)).toBe(true);
    expect(Number.isFinite(emptyResult.successScoreP)).toBe(true);
    expect(emptyResult.successScorePercent).toBeGreaterThanOrEqual(0);
    expect(emptyResult.successScorePercent).toBeLessThanOrEqual(100);
  });

  it("correctly penalizes start delay in effective timeline", () => {
    const skills: SkillRequirementInput[] = [
      { name: "PostgreSQL", r: 10, s: 2, w: 1 }, // g = 8, F = 0.2
    ];

    // Tight 2-month target where time is constraining factor
    const immediate = calculateSimulation({
      skills,
      hoursPerWeek: 8,
      targetMonths: 2,
      startDelayMonths: 0,
    });

    const delayed = calculateSimulation({
      skills,
      hoursPerWeek: 8,
      targetMonths: 2,
      startDelayMonths: 1, // 1 month delay on a 2-month window
    });

    expect(delayed.successScoreP).toBeLessThan(immediate.successScoreP);
    expect(delayed.effectiveHours).toBeLessThan(immediate.effectiveHours);
  });

  it("evaluates risk sensitivity R = P(v) - P(0.7v)", () => {
    const skills: SkillRequirementInput[] = [
      { name: "System Design", r: 10, s: 2, w: 1 },
      { name: "Data Structures", r: 10, s: 2, w: 1 },
    ];

    const result = calculateSimulation({
      skills,
      hoursPerWeek: 10,
      targetMonths: 4,
      velocity: 0.08,
    });

    expect(result.riskDelta).toBeGreaterThanOrEqual(0);
    expect(["Low", "Medium", "High"]).toContain(result.riskLevel);
  });

  it("generates deterministic 7-point trajectory curve", () => {
    const skills: SkillRequirementInput[] = [
      { name: "DevOps", r: 8, s: 4, w: 1 },
    ];

    const result = calculateSimulation({
      skills,
      hoursPerWeek: 16,
      targetMonths: 6,
    });

    expect(result.monthlyCurve).toHaveLength(7);
    expect(result.monthlyCurve[0].month).toBe("Now");
    expect(result.monthlyCurve[6].month).toBe("M6");
    // Curve should be non-decreasing over time
    for (let i = 1; i < result.monthlyCurve.length; i++) {
      expect(result.monthlyCurve[i].value).toBeGreaterThanOrEqual(result.monthlyCurve[i - 1].value);
    }
  });
});
