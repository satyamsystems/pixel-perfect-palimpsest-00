// Mock data layer. Replace these exports with API/LLM calls later.
export const student = {
  name: "Aarav Mehta",
  initials: "AM",
  college: "MIT-ADT University, Pune",
  year: "3rd year B.Tech CSE",
  goal: "Become a Full-Stack Web Developer in 6 months",
  domain: "Career / Skills",
  hoursPerWeek: 14,
  startDate: "May 2026",
  targetDate: "Nov 2026",
  progress: 62,
  probability: 74,
  streak: 12,
};

export const dimensions = [
  { dim: "Skills", value: 68 },
  { dim: "Time", value: 72 },
  { dim: "Consistency", value: 81 },
  { dim: "Market demand", value: 88 },
  { dim: "Risk", value: 42 },
  { dim: "Momentum", value: 76 },
];

export const weeklyHours = [
  { week: "W1", hours: 10, target: 14 },
  { week: "W2", hours: 13, target: 14 },
  { week: "W3", hours: 9, target: 14 },
  { week: "W4", hours: 15, target: 14 },
  { week: "W5", hours: 14, target: 14 },
  { week: "W6", hours: 17, target: 14 },
  { week: "W7", hours: 12, target: 14 },
  { week: "W8", hours: 16, target: 14 },
];

export type Status = "Done" | "In progress" | "Upcoming";

export const roadmap: {
  month: string;
  title: string;
  status: Status;
  outcome: string;
  tasks: { label: string; done: boolean }[];
  resources: string[];
}[] = [
  {
    month: "Month 1 · May",
    title: "Web foundations",
    status: "Done",
    outcome: "Ship a responsive personal portfolio with semantic HTML & modern CSS.",
    tasks: [
      { label: "HTML semantics & accessibility basics", done: true },
      { label: "CSS Flexbox, Grid and responsive layouts", done: true },
      { label: "Git & GitHub workflow", done: true },
      { label: "Deploy portfolio v1", done: true },
    ],
    resources: ["MDN Web Docs", "Kevin Powell – CSS", "The Odin Project"],
  },
  {
    month: "Month 2 · Jun",
    title: "JavaScript deep dive",
    status: "Done",
    outcome: "Build 3 interactive JS mini-projects without frameworks.",
    tasks: [
      { label: "ES6+, closures, async/await", done: true },
      { label: "DOM & Fetch API", done: true },
      { label: "Weather app with public API", done: true },
      { label: "30 DSA warm-up problems", done: true },
    ],
    resources: ["javascript.info", "Frontend Masters – JS: The Hard Parts"],
  },
  {
    month: "Month 3 · Jul",
    title: "React & TypeScript",
    status: "In progress",
    outcome: "Build a typed React task manager with routing and state.",
    tasks: [
      { label: "React fundamentals & hooks", done: true },
      { label: "TypeScript for React", done: true },
      { label: "Data fetching with TanStack Query", done: false },
      { label: "Task manager project", done: false },
    ],
    resources: ["react.dev", "Total TypeScript – Beginner", "TanStack docs"],
  },
  {
    month: "Month 4 · Aug",
    title: "Backend with Node & databases",
    status: "Upcoming",
    outcome: "REST API with auth and PostgreSQL, fully tested.",
    tasks: [
      { label: "Node.js & Express basics", done: false },
      { label: "SQL & PostgreSQL modelling", done: false },
      { label: "JWT authentication", done: false },
      { label: "API testing with Vitest", done: false },
    ],
    resources: ["Node.js docs", "SQLBolt", "Prisma guides"],
  },
  {
    month: "Month 5 · Sep",
    title: "Full-stack capstone",
    status: "Upcoming",
    outcome: "Deploy a full-stack app with real users and CI/CD.",
    tasks: [
      { label: "Plan capstone: campus marketplace", done: false },
      { label: "Build frontend + API", done: false },
      { label: "CI/CD with GitHub Actions", done: false },
      { label: "Collect feedback from 20 users", done: false },
    ],
    resources: ["Vercel docs", "GitHub Actions guide"],
  },
  {
    month: "Month 6 · Oct",
    title: "Interview & job readiness",
    status: "Upcoming",
    outcome: "Apply to 40 roles with a polished portfolio and resume.",
    tasks: [
      { label: "System design basics", done: false },
      { label: "100 DSA problems (mixed)", done: false },
      { label: "Mock interviews ×6", done: false },
      { label: "Resume & LinkedIn refresh", done: false },
    ],
    resources: ["Pramp", "NeetCode 150", "Tech Interview Handbook"],
  },
];

export const paths = [
  {
    id: "web",
    name: "Learn Web Dev",
    skillGrowth: 82,
    probability: 78,
    months: 6,
    risk: "Low" as const,
    base: [20, 32, 45, 57, 68, 78, 85],
  },
  {
    id: "ds",
    name: "Learn Data Science",
    skillGrowth: 74,
    probability: 61,
    months: 8,
    risk: "Medium" as const,
    base: [15, 24, 33, 43, 52, 60, 67],
  },
  {
    id: "placements",
    name: "Prepare for Placements",
    skillGrowth: 58,
    probability: 69,
    months: 4,
    risk: "High" as const,
    base: [25, 38, 50, 58, 63, 66, 68],
  },
];

export const suggestedPrompts = [
  "Am I on track?",
  "What if I study 5 hrs less?",
  "What should I do this week?",
];

// Stub for future LLM endpoint.
export async function askAssistant(q: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 900));
  const l = q.toLowerCase();
  if (l.includes("track"))
    return "You're 62% through your roadmap and 4 days ahead of plan. Your consistency (81) is your strongest dimension. Finish the TanStack Query module this week to stay ahead.";
  if (l.includes("less"))
    return "Dropping to 9 hrs/week pushes your target from Nov to late Jan and lowers goal probability from 74% to 58%. Consider cutting DSA warm-ups instead of project time.";
  if (l.includes("week"))
    return "This week: 1) Finish data fetching with TanStack Query (4 hrs), 2) Start the task manager project scaffold (6 hrs), 3) Solve 8 array problems (3 hrs).";
  return "Based on your profile, focus on project depth over breadth. Recruiters for junior full-stack roles weigh a deployed capstone higher than certificates.";
}
