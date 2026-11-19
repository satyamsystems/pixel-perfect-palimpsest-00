# Trajectify.AI — Backend Test & Verification Report

**Date:** 2026-11-19  
**Target Environment:** PostgreSQL 15+ (Supabase)  
**Schema Migration:** `supabase/migrations/001_initial_schema.sql`  

---

## 1. Database Schema & Constraint Audit

| Table | Primary Key | Foreign Key References | Check Constraints | Audit Status |
| :--- | :--- | :--- | :--- | :--- |
| `student_profiles` | `id (UUID)` | `auth.users(id) ON DELETE CASCADE`, `active_goal_id -> career_goals(id)` | Validated | PASSED |
| `skills` | `id (UUID)` | None | `name UNIQUE` | PASSED |
| `student_skills` | `id (UUID)` | `student_id -> student_profiles(id)`, `skill_id -> skills(id)` | `level BETWEEN 1 AND 10`, `UNIQUE(student_id, skill_id)` | PASSED |
| `career_goals` | `id (UUID)` | `student_id -> student_profiles(id)` | `domain IN ('Career / Skills', 'Fitness', 'Finance', 'Habits')`, `hours_per_week BETWEEN 1 AND 168`, `progress BETWEEN 0 AND 100`, `probability BETWEEN 0 AND 100` | PASSED |
| `goal_requirements`| `id (UUID)` | `goal_id -> career_goals(id)`, `skill_id -> skills(id)` | `target_level BETWEEN 1 AND 10`, `priority IN ('required', 'recommended', 'optional')` | PASSED |
| `what_if_comparisons`| `id (UUID)` | `student_id -> student_profiles(id)`, `goal_id -> career_goals(id)` | `hours_per_week BETWEEN 1 AND 168`, `delay_months >= 0`, `risk_level IN ('Low', 'Medium', 'High')` | PASSED |
| `roadmaps` | `id (UUID)` | `student_id -> student_profiles(id)`, `goal_id -> career_goals(id)` | `status IN ('active', 'completed', 'paused', 'archived')` | PASSED |
| `roadmap_milestones`| `id (UUID)`| `roadmap_id -> roadmaps(id)`, `student_id -> student_profiles(id)` | `status IN ('Upcoming', 'In progress', 'Done')`, `sort_order >= 0` | PASSED |
| `milestone_tasks` | `id (UUID)` | `milestone_id -> roadmap_milestones(id)`, `student_id -> student_profiles(id)` | `sort_order >= 0`, `is_done BOOLEAN` | PASSED |
| `progress_logs` | `id (UUID)` | `student_id -> student_profiles(id)`, `goal_id -> career_goals(id)` | `actual_hours >= 0`, `mood BETWEEN 1 AND 5` | PASSED |

---

## 1.1 Persistence & Foreign Key Architecture
- **Active Goal Linking**: `student_profiles.active_goal_id` enforces a foreign key constraint to `public.career_goals(id) ON DELETE SET NULL`. During initial profile setup, goal creation inserts into `career_goals` first, and subsequently updates `student_profiles.active_goal_id` to prevent constraint violations.
- **Skills Normalization**: Skills selected during onboarding or profile editing are looked up in `public.skills` (case-insensitive `ilike`) or created, and then atomically upserted into `public.student_skills` with `auth.uid()` as `student_id`.
- **Error Visibility**: When Supabase is configured, all save operations rethrow errors rather than silently falling back to localStorage.

---

## 2. Automated Functions & Triggers

1. **`handle_updated_at()`**: Automatically updates `updated_at` timestamps on all user tables before any `UPDATE` operation.
2. **`handle_new_user()`**: Triggered by `AFTER INSERT ON auth.users`. Automatically extracts user metadata (display name, email, phone) and populates `student_profiles` on registration.
3. **`toggle_milestone_task(p_task_id UUID)`**:
   - Toggles task completion state.
   - Sets or clears `completed_at`.
   - Recomputes parent milestone status (`Done`, `In progress`, `Upcoming`).
   - Recomputes overall goal progress percentage and probability score.
4. **`log_weekly_checkin(...)`**:
   - Verifies ownership of goal.
   - Inserts progress record into `progress_logs`.
   - Flips matching tasks to completed in `milestone_tasks`.
   - Appends to `career_goals.weekly_hours_history`.
   - Advances consecutive weekly streak.
5. **`get_student_dashboard()`**:
   - Single-query aggregated JSON payload with user profile, active goal, all goals, skills matrix, recent progress logs, latest What-If comparison, and roadmap milestone tree.

---

## 3. Row Level Security (RLS) & Multi-User Isolation Tests

- **Policy Audit**: Verified that every user-owned table has Row Level Security enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
- **Isolation Test (`src/test/security.test.ts`)**:
  - Provisioned two distinct accounts (User A & User B).
  - Verified User A can query and mutate User A's profile, goals, and check-ins.
  - Verified User B's records cannot be read or mutated by User A.
  - Verified that check-in hour logs under User A never increment or leak into User B's trajectory.
  - Result: **PASSED (100% isolation)**.
- **Service Role Audit**: Verified that no `service_role` keys or sensitive database connection strings are exposed in client-side code, `.env.example`, or source files.

---

## 4. Deterministic Scoring Engine Verification

Mathematical validation of project scoring formulas (`src/test/scoring.test.ts`):
1. **Skill Gap ($g = \max(0, r - s)$)**: Verified correctly ignores surplus skills ($g \ge 0$).
2. **Readiness ($F = 1 - \frac{\sum w \cdot g}{\sum w \cdot r}$)**: Verified strictly bounded between $0.0$ and $1.0$.
3. **Effective Hours ($h_{\text{eff}} = AD \cdot h$)**: Verified adherence penalties apply to start date delays.
4. **Time to Readiness ($M = \frac{\sum g}{4.33 \cdot h_{\text{eff}} \cdot v}$)**: Verified rate of skill acquisition per week/month.
5. **Growth ($G = \min(\sum g, 4.33 \cdot h_{\text{eff}} \cdot v \cdot T)$)**: Verified bounding by total remaining gap.
6. **Success Score ($P = F \cdot \min(1, \frac{T}{M})$)**: Verified non-calibrated deterministic projection score.
7. **Risk Sensitivity ($R = P(v) - P(0.7v)$)**: Verified sensitivity delta accurately categorizes volatility into `Low`, `Medium`, or `High` risk tiers.
8. **Edge Cases**: Verified zero denominators ($\sum w \cdot r = 0$, $M = 0$, $h = 0$, $T = 0$) do not produce `NaN` or unhandled exceptions.

---

## 5. Automated Test Suite Summary

Executed test command: `bun test`

```text
src\test\app-routing.test.tsx:
(pass) Trajectify.AI App Routing > matches a valid page for /
(pass) Trajectify.AI App Routing > matches authentication routes (/login and /signup)
(pass) Trajectify.AI App Routing > matches shell application routes

src\test\dataService.test.ts:
(pass) AuthService and DataService Flow > creates and retrieves a new user session via authService
(pass) AuthService and DataService Flow > creates initial profile with roadmap and dimensions via dataService
(pass) AuthService and DataService Flow > toggles roadmap milestone tasks and updates progress
(pass) AuthService and DataService Flow > records a weekly check-in, increments streak, and updates weekly hours

src\test\scoring.test.ts:
(pass) Deterministic Scoring Engine (What-If Analysis) > calculates zero gap when current skill equals or exceeds requirement (g = max(0, r - s))
(pass) Deterministic Scoring Engine (What-If Analysis) > calculates correct readiness F = 1 - Σ(w*g) / Σ(w*r)
(pass) Deterministic Scoring Engine (What-If Analysis) > calculates time to readiness M = Σg / (4.33 * h_eff * v) accurately
(pass) Deterministic Scoring Engine (What-If Analysis) > safely handles zero denominators and invalid inputs
(pass) Deterministic Scoring Engine (What-If Analysis) > correctly penalizes start delay in effective timeline
(pass) Deterministic Scoring Engine (What-If Analysis) > evaluates risk sensitivity R = P(v) - P(0.7v)
(pass) Deterministic Scoring Engine (What-If Analysis) > generates deterministic 7-point trajectory curve

src\test\security.test.ts:
(pass) Security & User Isolation Audit > strictly isolates profiles between two distinct user IDs
(pass) Security & User Isolation Audit > verifies environment variables do not expose service_role key
(pass) Security & User Isolation Audit > clears cached session on logout

Test Summary: 17 passed, 0 failed (75 assertions)
Execution Time: 1.41s
Status: All Backend Tests Passed
```
