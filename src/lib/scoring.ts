/**
 * Deterministic Scoring Engine for Trajectify.AI
 *
 * Implements deterministic project formulas for skill gap, readiness,
 * time to readiness, projected growth, success score, and risk sensitivity.
 *
 * FORMULAS:
 * - Skill gap:            g = max(0, r - s)
 * - Readiness:            F = 1 - Σ(w*g) / Σ(w*r)
 * - Effective hours:      h_eff = AD * h
 * - Time to readiness:    M = Σg / (4.33 * h_eff * v)
 * - Growth:               G = min(Σg, 4.33 * h_eff * v * T)
 * - Success score:        P = F * min(1, T / M)
 * - Risk sensitivity:     R = P(v) - P(0.7v)
 */

export interface SkillRequirementInput {
  name: string;
  r: number; // Required target level (1 to 10)
  s: number; // Student current level (0 to 10)
  w?: number; // Weight (default 1)
}

export interface SimulationParams {
  skills: SkillRequirementInput[];
  hoursPerWeek: number; // h
  targetMonths: number; // T
  adherence?: number; // AD (0.0 to 1.0, default 1.0)
  velocity?: number; // v (skill points per effective hour, default 0.08)
  startDelayMonths?: number; // delay
}

export interface SimulationResult {
  readinessF: number; // 0.0 to 1.0 (readiness factor)
  readinessPercent: number; // 0 to 100%
  totalGap: number; // Σg
  effectiveHours: number; // h_eff
  timeToReadinessMonths: number; // M
  projectedGrowth: number; // G
  successScoreP: number; // P (0.0 to 1.0)
  successScorePercent: number; // 0 to 100%
  riskDelta: number; // R = P(v) - P(0.7v)
  riskLevel: "Low" | "Medium" | "High";
  monthlyCurve: { month: string; value: number }[];
}

/**
 * Validates and sanitizes simulation parameters
 */
function sanitizeParams(params: SimulationParams) {
  const h = Math.max(1, Math.min(168, Number(params.hoursPerWeek) || 14));
  const T = Math.max(1, Math.min(60, Number(params.targetMonths) || 6));
  const delay = Math.max(0, Math.min(12, Number(params.startDelayMonths) || 0));
  
  // Adherence degrades slightly if start is delayed
  const baseAdherence = typeof params.adherence === "number" ? params.adherence : 1.0;
  const AD = Math.max(0.1, Math.min(1.0, baseAdherence * (1.0 - delay * 0.05)));

  // Velocity (skill acquisition rate per hour of dedicated practice)
  const v = Math.max(0.01, Math.min(0.5, Number(params.velocity) || 0.08));

  // Sanitize skills
  const skills = (params.skills || []).map((sk) => ({
    name: sk.name || "Skill",
    r: Math.max(1, Math.min(10, Number(sk.r) || 7)),
    s: Math.max(0, Math.min(10, Number(sk.s) || 0)),
    w: Math.max(0.1, Math.min(5, Number(sk.w) || 1.0)),
  }));

  return { h, T, delay, AD, v, skills };
}

/**
 * Deterministically computes the full scoring suite
 */
export function calculateSimulation(params: SimulationParams): SimulationResult {
  const { h, T, delay, AD, v, skills } = sanitizeParams(params);

  // 1. Effective hours: h_eff = AD * h
  const h_eff = Number((AD * h).toFixed(2));

  // 2. Skill gaps: g = max(0, r - s)
  let sum_wg = 0;
  let sum_wr = 0;
  let sum_g = 0;

  if (skills.length === 0) {
    // Fallback baseline requirement when none specified
    const defaultR = 7;
    const defaultS = 3;
    const g = defaultR - defaultS;
    sum_wg = g;
    sum_wr = defaultR;
    sum_g = g;
  } else {
    for (const sk of skills) {
      const g = Math.max(0, sk.r - sk.s);
      sum_wg += sk.w * g;
      sum_wr += sk.w * sk.r;
      sum_g += g;
    }
  }

  // 3. Readiness: F = 1 - Σ(w*g) / Σ(w*r)
  let F = 1.0;
  if (sum_wr > 0) {
    F = Math.max(0, Math.min(1, 1 - sum_wg / sum_wr));
  }

  // Helper to calculate P for any given velocity v_val
  const computePAtVelocity = (velocityVal: number): { M: number; P: number; G: number } => {
    // 4.33 weeks per month
    const rate = 4.33 * h_eff * velocityVal;

    // Time to readiness: M = Σg / (4.33 * h * v)
    let M = 0;
    if (sum_g > 0) {
      M = rate > 0 ? Number((sum_g / rate).toFixed(2)) : 999;
    }

    // Growth: G = min(Σg, 4.33 * h * v * T)
    const G = rate > 0 ? Number(Math.min(sum_g, rate * Math.max(0.1, T - delay)).toFixed(2)) : 0;

    // Success score: P = F * min(1, T / M)
    let P = 1.0;
    if (M > 0) {
      const effectiveT = Math.max(0, T - delay);
      const ratio = effectiveT / M;
      P = Math.max(0, Math.min(1, F * Math.min(1.0, ratio)));
    } else {
      P = F;
    }

    return { M, P, G };
  };

  // Primary calculation at velocity v
  const { M, P, G } = computePAtVelocity(v);

  // Sensitivity calculation at 0.7v for risk assessment
  const { P: P_degraded } = computePAtVelocity(0.7 * v);

  // Risk: R = P(v) - P(0.7v)
  const R = Number(Math.max(0, P - P_degraded).toFixed(3));

  let riskLevel: "Low" | "Medium" | "High" = "Low";
  if (R > 0.22) {
    riskLevel = "High";
  } else if (R >= 0.1) {
    riskLevel = "Medium";
  } else {
    riskLevel = "Low";
  }

  // Generate deterministic month-by-month trajectory curve
  const labels = ["Now", "M1", "M2", "M3", "M4", "M5", "M6"];
  const monthlyCurve = labels.map((label, idx) => {
    if (idx === 0) {
      return { month: label, value: Math.round(F * 100) };
    }
    // Account for start delay
    const activeMonths = Math.max(0, idx - delay);
    const progressPortion = M > 0 ? Math.min(1.0, activeMonths / M) : 1.0;
    const curveValue = Math.min(100, Math.round((F + (1 - F) * progressPortion) * 100));
    return { month: label, value: curveValue };
  });

  return {
    readinessF: Number(F.toFixed(3)),
    readinessPercent: Math.round(F * 100),
    totalGap: Number(sum_g.toFixed(1)),
    effectiveHours: h_eff,
    timeToReadinessMonths: M,
    projectedGrowth: G,
    successScoreP: Number(P.toFixed(3)),
    successScorePercent: Math.round(P * 100),
    riskDelta: R,
    riskLevel,
    monthlyCurve,
  };
}
