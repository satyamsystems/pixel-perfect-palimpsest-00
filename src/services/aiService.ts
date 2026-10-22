/**
 * AIService for Trajectify.AI
 *
 * Handles AI Assistant conversations and Weekly Check-In roadmap analysis.
 * Injects the user's active goal, roadmap milestones, progress %, weekly hours,
 * and skill matrix into every prompt.
 *
 * PRODUCTION NOTE:
 * In a production architecture, LLM calls and API keys MUST be handled server-side
 * (e.g., via PHP endpoint `POST /api/ai/assistant.php` and `POST /api/ai/checkin.php`).
 * Client-side API key usage is only for development/prototyping.
 */

import type { CheckInRecord, Goal, Milestone, RoadmapChange, UserProfile } from "./dataService";

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant" | "system";
  text: string;
  timestamp?: string;
}

export interface CheckInAnalysisResult {
  summary: string;
  suggestedChanges: RoadmapChange[];
  updatedProbability: number;
  encouragement: string;
}

class AIService {
  private getGeminiKey(): string | undefined {
    return (
      import.meta.env.VITE_GEMINI_API_KEY ||
      (typeof window !== "undefined"
        ? (window as unknown as { __VITE_GEMINI_API_KEY?: string }).__VITE_GEMINI_API_KEY
        : undefined)
    );
  }

  private getOpenAIKey(): string | undefined {
    return import.meta.env.VITE_OPENAI_API_KEY;
  }

  hasConfiguredKey(): boolean {
    return Boolean(this.getGeminiKey() || this.getOpenAIKey());
  }

  /**
   * Builds rich system context based on the user's actual profile and active goal.
   */
  private buildSystemContext(profile?: UserProfile | null, goal?: Goal | null): string {
    if (!profile || !goal) {
      return "The user has not completed onboarding or created a goal yet. Encourage them to complete onboarding to start simulating their future.";
    }

    const completedMilestones = goal.roadmap.filter((m) => m.status === "Done").length;
    const totalMilestones = goal.roadmap.length;
    const currentMilestone =
      goal.roadmap.find((m) => m.status === "In progress") || goal.roadmap[0];
    const skillList = goal.skills.map((s) => `${s.name} (Lvl ${s.level}/10)`).join(", ");
    const recentHours = goal.weeklyHours.map((w) => `${w.week}: ${w.hours}h`).join(", ");

    return `
You are the Trajectify.AI Personal Assistant — an empowering, highly intelligent career & goal simulator.
Current User Context:
- User Name: ${profile.name}
- Active Goal: "${goal.title}" (${goal.domain})
- Target Date: ${goal.targetDate}
- Weekly Target: ${goal.hoursPerWeek} hrs/week
- Recent Investment: ${recentHours || "Starting out"}
- Progress: ${goal.progress}% (${completedMilestones}/${totalMilestones} milestones completed)
- Goal Probability: ${goal.probability}%
- Current Streak: ${goal.streak} days
- Current Skills: ${skillList || "None listed"}
- Active Milestone: "${currentMilestone?.title || "Foundations"}"
- Active Milestone Expected Outcome: "${currentMilestone?.outcome || "Initial learning"}"

Guidance:
1. Always ground your advice directly in the user's specific goal, roadmap, and hours.
2. Keep answers concise, actionable, and encouraging (2-4 paragraphs max).
3. If they ask about changing hours, predict realistic trade-offs on their probability and target completion date.
4. Tone: Senior mentor, analytical yet warm.
`.trim();
  }

  /**
   * Ask the AI Assistant with profile context
   */
  async askAssistant(
    question: string,
    history: ChatMessage[],
    profile?: UserProfile | null,
    goal?: Goal | null,
  ): Promise<string> {
    const geminiKey = this.getGeminiKey();
    const systemPrompt = this.buildSystemContext(profile, goal);

    if (geminiKey) {
      try {
        const contents = [
          { role: "user", parts: [{ text: `[System Instructions: ${systemPrompt}]` }] },
          ...history.slice(-6).map((m) => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.text }],
          })),
          { role: "user", parts: [{ text: question }] },
        ];

        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents }),
          },
        );

        if (!resp.ok) {
          throw new Error(`Gemini API error: ${resp.status} ${resp.statusText}`);
        }

        const data = await resp.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) return reply;
      } catch (err) {
        console.warn("Live Gemini request failed, using intelligent fallback:", err);
      }
    }

    // Smart Local Intelligence Engine (Fallback when no key is configured or offline)
    await new Promise((r) => setTimeout(r, 700));
    const q = question.toLowerCase();

    if (!goal) {
      return "Hi there! I don't see an active trajectory yet. Head over to the Profile or Onboarding engine to set up your primary goal, and I'll tailor all simulations and roadmap advice to you.";
    }

    if (
      q.includes("track") ||
      q.includes("progress") ||
      q.includes("ahead") ||
      q.includes("behind")
    ) {
      const pace = goal.progress >= 20 ? "ahead of schedule" : "on a solid foundational pace";
      return `Based on your profile, you are currently at **${goal.progress}% progress** toward your goal of *"${goal.title}"*. Your achievement probability is modeled at **${goal.probability}%** with a ${goal.streak}-day consistency streak. Keep focusing on your active milestone *" ${goal.roadmap[0]?.title || "Foundations"} "* to maintain momentum!`;
    }

    if (
      q.includes("less") ||
      q.includes("hours") ||
      q.includes("time") ||
      q.includes("study") ||
      q.includes("busy")
    ) {
      const reduced = Math.max(2, goal.hoursPerWeek - 4);
      return `If you decrease your weekly commitment from **${goal.hoursPerWeek} hrs** to **${reduced} hrs/week**, our simulator projects your milestone completion date will shift outward by approximately 3 to 5 weeks, and achievement probability adjusts from ${goal.probability}% down to roughly ${Math.max(40, goal.probability - 9)}%. Consider trimming auxiliary research tasks rather than hands-on project building to preserve high retention.`;
    }

    if (
      q.includes("week") ||
      q.includes("what should i do") ||
      q.includes("next") ||
      q.includes("today")
    ) {
      const activeMilestone =
        goal.roadmap.find((m) => m.status === "In progress") || goal.roadmap[0];
      const nextTask =
        activeMilestone?.tasks.find((t) => !t.done)?.label || "Review project deliverables";
      return `This week for *"${goal.title}"*, your primary focus is **${activeMilestone?.title}**:\n\n1. Target action: **${nextTask}**.\n2. Dedicate at least **${Math.round(goal.hoursPerWeek / 3)} hours** across 3 focused blocks.\n3. Make sure to complete your weekly check-in this Sunday so we can adapt your trajectory.`;
    }

    return `Based on your profile for *"${goal.title}"*, consistency is your biggest leverage factor. You have **${goal.skills.length} core skills** mapped and a target weekly investment of **${goal.hoursPerWeek} hours**. Focus on finishing verified milestone deliverables before branching into supplementary tools.`;
  }

  /**
   * Analyze Weekly Check-in and generate structured roadmap adjustments
   */
  async analyzeCheckIn(
    checkIn: {
      notes: string;
      actualHours: number;
      completedTaskIds: string[];
      mood: 1 | 2 | 3 | 4 | 5;
      blockers?: string;
      goalChanges?: string;
    },
    currentRoadmap: Milestone[],
    profile?: UserProfile | null,
    goal?: Goal | null,
  ): Promise<CheckInAnalysisResult> {
    const geminiKey = this.getGeminiKey();
    const prompt = `
Analyze this weekly user check-in for goal: "${goal?.title || "Skill Development"}".
Target hours: ${goal?.hoursPerWeek || 14}h. Actual hours studied: ${checkIn.actualHours}h.
Mood (1-5): ${checkIn.mood}/5.
User notes: "${checkIn.notes}".
Reported blockers: "${checkIn.blockers || "None"}".
Current roadmap milestones: ${JSON.stringify(
      currentRoadmap.map((m) => ({ title: m.title, tasks: m.tasks.map((t) => t.label) })),
    )}

Respond strictly with valid JSON conforming to this schema:
{
  "summary": "1-2 sentence analysis of user effort and pace",
  "suggestedChanges": [
    {
      "id": "change-1",
      "type": "move" | "add" | "remove" | "re-time",
      "milestoneTitle": "Exact milestone title from roadmap",
      "taskLabel": "Concise task description",
      "action": "Description of modification",
      "reason": "Clear justification based on hours and blockers"
    }
  ],
  "updatedProbability": 78,
  "encouragement": "Empowering concluding advice"
}
`.trim();

    if (geminiKey) {
      try {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: "application/json" },
            }),
          },
        );

        if (resp.ok) {
          const data = await resp.json();
          const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.summary && Array.isArray(parsed.suggestedChanges)) {
              return {
                summary: parsed.summary,
                suggestedChanges: parsed.suggestedChanges.map(
                  (c: Partial<RoadmapChange>, i: number) => ({
                    id: c.id || `chg_${i}`,
                    type: (c.type as RoadmapChange["type"]) || "re-time",
                    milestoneTitle:
                      c.milestoneTitle || currentRoadmap[0]?.title || "Active Milestone",
                    taskLabel: c.taskLabel || "Milestone adjustment",
                    action: c.action || "Adjust task timeline",
                    reason: c.reason || "Paced according to weekly performance",
                  }),
                ),
                updatedProbability:
                  parsed.updatedProbability || Math.min(95, (goal?.probability || 70) + 2),
                encouragement: parsed.encouragement || "Great work pushing through this week!",
              };
            }
          }
        }
      } catch (e) {
        console.warn("AI check-in parsing failed, using rule-based analysis:", e);
      }
    }

    // Deterministic Rule-Based Fallback
    await new Promise((r) => setTimeout(r, 600));

    const targetH = goal?.hoursPerWeek || 14;
    const diff = checkIn.actualHours - targetH;
    const activeMilestone = currentRoadmap[0] || { title: "Core Foundations" };
    const nextMilestone = currentRoadmap[1] || activeMilestone;

    const suggestedChanges: RoadmapChange[] = [];

    if (diff >= 3) {
      suggestedChanges.push({
        id: "c-1",
        type: "move",
        milestoneTitle: activeMilestone.title,
        taskLabel: "Advanced practical challenge",
        action: "Accelerate to current week",
        reason: `You logged ${checkIn.actualHours} hrs (+${diff}h over target), qualifying for accelerated progress.`,
      });
      suggestedChanges.push({
        id: "c-2",
        type: "add",
        milestoneTitle: nextMilestone.title,
        taskLabel: "Bonus portfolio benchmark project",
        action: "Add ambitious extension task",
        reason: "Surplus momentum allows embedding an extra capstone deliverable.",
      });
    } else if (diff <= -4) {
      suggestedChanges.push({
        id: "c-1",
        type: "re-time",
        milestoneTitle: activeMilestone.title,
        taskLabel: "Non-critical syntax exploration",
        action: "Defer or mark optional",
        reason: `Reduced study time (${checkIn.actualHours}h vs ${targetH}h target). Streamlining tasks protects core learning.`,
      });
    } else {
      suggestedChanges.push({
        id: "c-1",
        type: "re-time",
        milestoneTitle: activeMilestone.title,
        taskLabel: "Deepen core hands-on exercises",
        action: "Refine milestone checkpoints",
        reason: "Maintained steady alignment with your weekly commitment.",
      });
    }

    const updatedProbability = Math.min(
      96,
      Math.max(35, (goal?.probability || 70) + (diff >= 0 ? 2 : -2) + (checkIn.mood >= 4 ? 1 : 0)),
    );

    return {
      summary: `You logged ${checkIn.actualHours} hours this week (target: ${targetH}h) with an energy score of ${checkIn.mood}/5. ${
        diff >= 0
          ? "You're outpacing the baseline trajectory!"
          : "You maintained consistency despite time constraints."
      }`,
      suggestedChanges,
      updatedProbability,
      encouragement:
        checkIn.mood >= 4
          ? "High energy and focused execution! Keep this rhythm steady as you enter the next milestone."
          : "Every focused hour counts toward mastery. Keep communication open with your schedule to avoid burnout.",
    };
  }
}

export const aiService = new AIService();
