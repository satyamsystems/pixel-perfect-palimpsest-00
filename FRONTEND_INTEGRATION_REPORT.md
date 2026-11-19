# Trajectify.AI — Frontend Integration Report

**Date:** 2026-11-19  
**Application Stack:** TanStack Start, Nitro 3, Vite 8, React 19, Tailwind CSS 4, Recharts, Framer Motion, `@supabase/supabase-js`  

---

## 1. Frontend Architecture & Services Overview

The frontend architecture routes all data, identity, and computation through decoupled service modules, eliminating raw, fragmented database calls in UI components:

```
[UI Components & Routes]
          │
          ├──> [authService.ts]   <──> [Supabase Auth]
          │                                  │
          ├──> [dataService.ts]   <──> [Supabase PostgREST & RPC]
          │                                  │
          └──> [scoring.ts]       <──> [Deterministic Calculations]
```

- **`src/lib/supabase.ts`**: Safely initializes the Supabase client using public `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Features automatic configuration detection (`isSupabaseConfigured()`) and safe fallback instances so unconfigured preview builds render cleanly without crashing.
- **`src/services/authService.ts`**: Wraps Supabase Auth (`signUp`, `signInWithPassword`, `signOut`, `resetPasswordForEmail`, `onAuthStateChange`, `updateUser`) with cross-tab session syncing and simulated mobile OTP fallback.
- **`src/services/dataService.ts`**: Provides centralized CRUD operations, optimistic caching, and RPC invocation for student profiles, goals, milestones, tasks, and check-in logs.
- **`src/lib/scoring.ts`**: Pure mathematical engine implementing project scoring formulas ($g, F, h_{\text{eff}}, M, G, P, R$).

---

## 2. Screen-by-Screen Integration Verification

### 2.1 Authentication & Route Guarding (`/login`, `/signup`)
- **Integration**: `AuthForm.tsx` handles both email/password credentials and mobile OTP workflows.
- **Protected Routes**: Root shell layout `_shell.tsx` verifies active sessions through `authService.onAuthStateChange()`. Unauthenticated users are redirected to `/login`, while authenticated sessions attempting to visit `/login` or `/signup` are redirected to `/dashboard`.
- **UI Preservation**: Visual branding, tabs, input-OTP slots, and toast feedback remain identical.

### 2.2 Student Dashboard (`/_shell/dashboard`)
- **Integration**: Connected to `dataService.getStudentDashboardData(userId)`, loading the student's active goal, achievement probability gauge, 6-dimension readiness radar, weekly hours trend, and milestone preview.
- **Fallback**: Graceful empty-state presentation prompting users to onboard if no trajectory has been calibrated yet.
- **UI Preservation**: Gauge SVG, Recharts radar/bar charts, and consistency streak grid preserved.

### 2.3 What-If Scenario Simulator (`/_shell/compare`)
- **Integration**: Connected to `src/lib/scoring.ts`. Computes 3 dynamic path variations based on the student's current skill levels and chosen goal:
  1. Direct Track (Standard velocity $v=0.08$)
  2. Specialist Track (Endurance velocity $v=0.065$)
  3. Accelerated Sprint (Intensive velocity $v=0.12$)
- **Interactive Variables**: Slider adjustments for weekly hours ($h \in [4, 36]$) and start delay in months ($delay \in [0, 4]$) immediately update score ($P$), readiness ($F$), time to readiness ($M$), and risk tier ($R$).
- **Database Persistence**: Debounced auto-save persists active comparisons to `what_if_comparisons`.
- **UI Preservation**: 3-column path comparison panels, badge risk colors, and line chart curves preserved.

### 2.4 Living Roadmap (`/_shell/roadmap`)
- **Integration**: Loads monthly milestones and nested actionable tasks from `dataService`.
- **Task Interaction**: Checking a task invokes `dataService.toggleTask()`, which executes the `toggle_milestone_task` RPC function, dynamically updating milestone status (`Done`, `In progress`, `Upcoming`) and advancing overall goal completion.
- **UI Preservation**: Timeline view, Gantt chart view, accordion components, and resource badges preserved.

### 2.5 Weekly Check-In (`/_shell/checkin`)
- **Integration**: Weekly form capturing actual hours, mood (1–5), notes, blockers, and completed tasks.
- **Commit**: Calls `dataService.addCheckIn()`, persisting to `progress_logs` via the `log_weekly_checkin` RPC, updating consecutive streak, and logging hours to the historical chart.
- **UI Preservation**: Multi-step wizard, mood emoji selector, review modal, and draft auto-save preserved.

### 2.6 Personal Profile & Onboarding (`/_shell/onboarding`)
- **Integration**: 6-step calibration wizard creating initial trajectories in `student_profiles`, `career_goals`, `student_skills`, `goal_requirements`, and `roadmaps`. Edit mode persists adjustments via `dataService.saveProfile()`.
- **Data Reset**: Provides clean data wipe via `dataService.resetData()`.
- **UI Preservation**: Step progression, domain selectors, skill level sliders, and review step preserved.

---

## 3. UI Preservation & Visual Fidelity

- **Zero Design Drift**: No CSS classes, layout structures, page headers, navigation drawers, or visual components were altered or redesigned.
- **Theme Support**: Full support for dark and light themes via existing `ThemeToggle.tsx` and CSS custom variables (`--primary`, `--card`, `--background`, `--border`).
- **Mobile Responsiveness**: Preserved responsive tablet/mobile drawer, mobile navigation header, and responsive chart containers (`ResponsiveContainer`).

---

## 4. Build & Bundle Status

- Bundler: Vite 8.1.5 + Nitro 3
- Production Build: **0 warnings, 0 errors**
- Client Bundle Output: `.output/public`
- SSR Server Output: `.output/server`
- Vercel Preset: Successfully validated with `.vercel/output/static` and `.vercel/output/functions/__server.func`
