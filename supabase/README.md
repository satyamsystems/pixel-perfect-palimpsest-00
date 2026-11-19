# Trajectify.AI — Supabase Database & Architecture Reference

This documentation provides the complete backend schema, security model, RPC contract, and migration execution instructions for **Trajectify.AI**.

---

## 1. Overview & Architecture

Trajectify.AI combines a modern TanStack Start (Nitro) full-stack application with a PostgreSQL database managed via **Supabase**. The architecture uses:
- **`auth.users`** as the source of authenticated identity.
- **`public.student_profiles`** linked 1:1 with `auth.users(id)` with cascading deletion and automated trigger provisioning (`handle_new_user`).
- **Row Level Security (RLS)** enabled across all user-owned tables, enforcing isolation by `auth.uid() = student_id`.
- **Deterministic SQL Stored Procedures (RPCs)** for high-performance transactional updates:
  - `toggle_milestone_task(p_task_id UUID)`
  - `log_weekly_checkin(...)`
  - `get_student_dashboard()`
- **Deterministic Scoring Engine** running:
  - Skill gap: $g = \max(0, r - s)$
  - Readiness: $F = 1 - \frac{\sum(w \cdot g)}{\sum(w \cdot r)}$
  - Effective hours: $h_{\text{eff}} = AD \cdot h$
  - Time to readiness: $M = \frac{\sum g}{4.33 \cdot h_{\text{eff}} \cdot v}$
  - Growth: $G = \min(\sum g, 4.33 \cdot h_{\text{eff}} \cdot v \cdot T)$
  - Success score: $P = F \cdot \min(1, \frac{T}{M})$
  - Risk sensitivity: $R = P(v) - P(0.7v)$

---

## 2. Table Catalog

| Table | Description | Primary Key | Key Relationships / Constraints |
| :--- | :--- | :--- | :--- |
| `student_profiles` | Student profile records | `id (UUID)` | `id -> auth.users(id) ON DELETE CASCADE`, `active_goal_id -> career_goals(id)` |
| `skills` | Master skill catalog | `id (UUID)` | Unique `name TEXT` |
| `student_skills` | Student assessed proficiency (1–10) | `id (UUID)` | `student_id -> student_profiles(id)`, `skill_id -> skills(id)`, `UNIQUE(student_id, skill_id)` |
| `career_goals` | Active goals, weekly hours, probability | `id (UUID)` | `student_id -> student_profiles(id)`, `hours_per_week CHECK (1–168)` |
| `goal_requirements` | Benchmark skills required for a goal | `id (UUID)` | `goal_id -> career_goals(id)`, `target_level CHECK (1–10)` |
| `what_if_comparisons` | Saved simulation comparisons | `id (UUID)` | `student_id -> student_profiles(id)`, `goal_id -> career_goals(id)` |
| `roadmaps` | Dynamic living roadmaps | `id (UUID)` | `student_id -> student_profiles(id)`, `goal_id -> career_goals(id)` |
| `roadmap_milestones` | Month-by-month roadmap phases | `id (UUID)` | `roadmap_id -> roadmaps(id)`, `status CHECK ('Upcoming', 'In progress', 'Done')` |
| `milestone_tasks` | Actionable checklist items per milestone | `id (UUID)` | `milestone_id -> roadmap_milestones(id)`, `is_done BOOLEAN` |
| `progress_logs` | Weekly check-in hour logs & mood | `id (UUID)` | `student_id -> student_profiles(id)`, `mood CHECK (1–5)` |

---

## 3. How to Execute the Migration in Supabase

1. Open the [Supabase Dashboard](https://supabase.com/dashboard) and select or create your project.
2. In the left navigation menu, click **SQL Editor** (`>_`).
3. Click **+ New query**.
4. Open [`supabase/migrations/001_initial_schema.sql`](./migrations/001_initial_schema.sql).
5. Copy the entire SQL content and paste it into the editor.
6. Click **Run** (or press `Ctrl+Enter`).
7. Confirm query execution returns **"Success. No rows returned"**.
8. Go to **Table Editor** to verify all 10 tables are present with RLS enabled.

---

## 4. Stored Procedures (RPC Contracts)

### `toggle_milestone_task(p_task_id UUID)`
Atomically flips `is_done`, updates milestone status, and recomputes goal completion progress percentage and probability score.
```sql
SELECT public.toggle_milestone_task('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid);
```

### `log_weekly_checkin(...)`
Atomically records check-in log, marks completed milestone tasks, updates goal weekly hours trend, and increments streak.
```sql
SELECT public.log_weekly_checkin(
  p_goal_id := 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'::uuid,
  p_actual_hours := 16.0,
  p_mood := 4,
  p_notes := 'Completed PostgreSQL optimization modules',
  p_blockers := NULL,
  p_goal_changes := NULL,
  p_completed_task_ids := '["c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13"]'::jsonb
);
```

### `get_student_dashboard()`
Aggregates profile, active goal, skills, recent progress logs, latest What-If comparison, and roadmap into a single query for the dashboard view.
```sql
SELECT public.get_student_dashboard();
```

---

## 5. Security & Row Level Security (RLS)

- **RLS Enabled**: Enforced on all 10 tables without exception.
- **Public Read on Skills**: Unauthenticated clients and students can read standard skills catalog. Custom skill creation requires an authenticated session.
- **Student Record Isolation**: Strict enforcement of `auth.uid() = student_id` or `auth.uid() = id`.
- **Zero Exposure**: `service_role` key is strictly prohibited in frontend bundles; all queries execute under the authenticated client role (`anon` / JWT).
