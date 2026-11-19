-- ==============================================================================
-- Trajectify.AI — Supabase Initial Database Schema Migration
-- Migration: 001_initial_schema.sql
-- Role: Person 1 (Database, Backend Services & Security)
-- ==============================================================================

-- Enable UUID extension if not already available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. UTILITY FUNCTIONS & TRIGGERS
-- ==============================================================================

-- Generic trigger function to automatically update `updated_at` timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 2. TABLE: student_profiles (Users / Student Profiles linked to auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.student_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  initials TEXT,
  active_goal_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.student_profiles IS 'Student and user profiles linked 1:1 with Supabase Auth auth.users';

-- Backward-compatible view for standard queries
CREATE OR REPLACE VIEW public.profiles AS SELECT * FROM public.student_profiles;

-- ==============================================================================
-- 3. TABLE: skills (Standardized Skills & Competencies Catalog)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'General',
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.skills IS 'Master catalog of technical, fitness, finance, and professional skills';

-- ==============================================================================
-- 4. TABLE: student_skills (Student Proficiency in Specific Skills)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.student_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 10),
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_student_skill UNIQUE (student_id, skill_id)
);

COMMENT ON TABLE public.student_skills IS 'Current assessed skill levels (1-10) for each student';

-- ==============================================================================
-- 5. TABLE: career_goals (Goals, Trajectories & Targets)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.career_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  domain TEXT NOT NULL DEFAULT 'Career / Skills' CHECK (domain IN ('Career / Skills', 'Fitness', 'Finance', 'Habits')),
  title TEXT NOT NULL,
  description TEXT,
  hours_per_week INTEGER NOT NULL CHECK (hours_per_week >= 1 AND hours_per_week <= 168),
  target_date TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  probability_score INTEGER NOT NULL DEFAULT 70 CHECK (probability_score >= 0 AND probability_score <= 100),
  streak INTEGER NOT NULL DEFAULT 0 CHECK (streak >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  dimensions JSONB NOT NULL DEFAULT '[]'::jsonb,
  weekly_hours_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.career_goals IS 'Target trajectories, active goals, weekly commitments and probability scores';

-- Link active_goal_id in student_profiles to career_goals
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_student_profiles_active_goal'
  ) THEN
    ALTER TABLE public.student_profiles
      ADD CONSTRAINT fk_student_profiles_active_goal
      FOREIGN KEY (active_goal_id) REFERENCES public.career_goals(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ==============================================================================
-- 6. TABLE: goal_requirements (Requirements & Target Proficiency for Goals)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.goal_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.career_goals(id) ON DELETE CASCADE,
  skill_id UUID REFERENCES public.skills(id) ON DELETE SET NULL,
  skill_name TEXT NOT NULL,
  target_level INTEGER NOT NULL DEFAULT 7 CHECK (target_level >= 1 AND target_level <= 10),
  priority TEXT NOT NULL DEFAULT 'required' CHECK (priority IN ('required', 'recommended', 'optional')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.goal_requirements IS 'Skill requirements and target benchmark levels needed to achieve a goal';

-- ==============================================================================
-- 7. TABLE: what_if_comparisons (Path Simulations & What-If Scenarios)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.what_if_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES public.career_goals(id) ON DELETE CASCADE,
  scenario_name TEXT NOT NULL,
  hours_per_week INTEGER NOT NULL CHECK (hours_per_week >= 1 AND hours_per_week <= 168),
  delay_months INTEGER NOT NULL DEFAULT 0 CHECK (delay_months >= 0),
  projected_probability INTEGER NOT NULL CHECK (projected_probability >= 0 AND projected_probability <= 100),
  projected_completion_months INTEGER NOT NULL CHECK (projected_completion_months >= 1),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('Low', 'Medium', 'High')),
  skill_growth_score INTEGER NOT NULL DEFAULT 0 CHECK (skill_growth_score >= 0 AND skill_growth_score <= 100),
  projection_curve JSONB NOT NULL DEFAULT '[]'::jsonb,
  comparison_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.what_if_comparisons IS 'Saved simulation comparisons showing sensitivity to hours, delays, and risk';

-- ==============================================================================
-- 8. TABLE: roadmaps (Dynamic Month-by-Month Living Roadmaps)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES public.career_goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'archived')),
  total_milestones INTEGER NOT NULL DEFAULT 0 CHECK (total_milestones >= 0),
  completed_milestones INTEGER NOT NULL DEFAULT 0 CHECK (completed_milestones >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.roadmaps IS 'Living roadmaps associated with active trajectories';

-- ==============================================================================
-- 9. TABLE: roadmap_milestones (Milestone Steps in Roadmaps)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.roadmap_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID NOT NULL REFERENCES public.roadmaps(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  month_label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 1 CHECK (sort_order >= 0),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Upcoming' CHECK (status IN ('Upcoming', 'In progress', 'Done')),
  outcome TEXT NOT NULL,
  resources JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.roadmap_milestones IS 'Monthly or phase-based milestones with target outcomes';

-- ==============================================================================
-- 10. TABLE: milestone_tasks (Granular Actionable Tasks inside Milestones)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.milestone_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id UUID NOT NULL REFERENCES public.roadmap_milestones(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  is_done BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 1 CHECK (sort_order >= 0),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.milestone_tasks IS 'Actionable weekly tasks nested under roadmap milestones';

-- ==============================================================================
-- 11. TABLE: progress_logs (Weekly Check-Ins, Hour Logs & Adaptation History)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.progress_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.student_profiles(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES public.career_goals(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  actual_hours NUMERIC(5,2) NOT NULL CHECK (actual_hours >= 0),
  target_hours NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (target_hours >= 0),
  mood INTEGER NOT NULL CHECK (mood >= 1 AND mood <= 5),
  notes TEXT,
  blockers TEXT,
  goal_changes TEXT,
  completed_task_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_feedback TEXT,
  ai_recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.progress_logs IS 'Weekly reflections, logged hours, mood, and AI feedback';

-- ==============================================================================
-- 12. PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_student_profiles_active_goal ON public.student_profiles(active_goal_id);

CREATE INDEX IF NOT EXISTS idx_skills_name ON public.skills(name);
CREATE INDEX IF NOT EXISTS idx_skills_category ON public.skills(category);

CREATE INDEX IF NOT EXISTS idx_student_skills_student_id ON public.student_skills(student_id);
CREATE INDEX IF NOT EXISTS idx_student_skills_skill_id ON public.student_skills(skill_id);

CREATE INDEX IF NOT EXISTS idx_career_goals_student_id ON public.career_goals(student_id);
CREATE INDEX IF NOT EXISTS idx_career_goals_is_active ON public.career_goals(student_id, is_active);

CREATE INDEX IF NOT EXISTS idx_goal_requirements_goal_id ON public.goal_requirements(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_requirements_skill_id ON public.goal_requirements(skill_id);

CREATE INDEX IF NOT EXISTS idx_what_if_comparisons_student_id ON public.what_if_comparisons(student_id);
CREATE INDEX IF NOT EXISTS idx_what_if_comparisons_goal_id ON public.what_if_comparisons(goal_id);

CREATE INDEX IF NOT EXISTS idx_roadmaps_student_id ON public.roadmaps(student_id);
CREATE INDEX IF NOT EXISTS idx_roadmaps_goal_id ON public.roadmaps(goal_id);

CREATE INDEX IF NOT EXISTS idx_roadmap_milestones_roadmap_id ON public.roadmap_milestones(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_milestones_student_id ON public.roadmap_milestones(student_id);

CREATE INDEX IF NOT EXISTS idx_milestone_tasks_milestone_id ON public.milestone_tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_tasks_student_id ON public.milestone_tasks(student_id);

CREATE INDEX IF NOT EXISTS idx_progress_logs_student_id ON public.progress_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_logs_goal_id ON public.progress_logs(goal_id);
CREATE INDEX IF NOT EXISTS idx_progress_logs_date ON public.progress_logs(student_id, log_date DESC);

-- ==============================================================================
-- 13. UPDATED_AT TIMESTAMP TRIGGERS
-- ==============================================================================
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN 
    SELECT unnest(ARRAY[
      'student_profiles',
      'student_skills',
      'career_goals',
      'what_if_comparisons',
      'roadmaps',
      'roadmap_milestones',
      'milestone_tasks',
      'progress_logs'
    ])
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_update_timestamp_%1$I ON public.%1$I;
      CREATE TRIGGER trg_update_timestamp_%1$I
        BEFORE UPDATE ON public.%1$I
        FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
    ', t);
  END LOOP;
END $$;

-- ==============================================================================
-- 14. AUTH HOOK: AUTOMATIC PROFILE CREATION FROM auth.users
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_full_name TEXT;
  v_initials TEXT;
  v_parts TEXT[];
BEGIN
  -- Auto-confirm email so Supabase immediately issues an active session token
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, now())
  WHERE id = NEW.id;

  -- Extract user display name from auth metadata or fallback to email prefix
  v_full_name := NULLIF(trim(COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'Student'
  )), '');

  IF v_full_name IS NULL THEN
    v_full_name := 'Student';
  END IF;

  -- Generate 2-character initials
  v_parts := regexp_split_to_array(trim(v_full_name), '\s+');
  IF array_length(v_parts, 1) >= 2 THEN
    v_initials := upper(substring(v_parts[1] from 1 for 1) || substring(v_parts[array_length(v_parts, 1)] from 1 for 1));
  ELSE
    v_initials := upper(substring(v_full_name from 1 for 2));
  END IF;

  -- Insert student profile record
  INSERT INTO public.student_profiles (
    id,
    full_name,
    email,
    phone,
    avatar_url,
    initials
  )
  VALUES (
    NEW.id,
    v_full_name,
    NEW.email,
    NEW.phone,
    NEW.raw_user_meta_data->>'avatar_url',
    v_initials
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    phone = COALESCE(EXCLUDED.phone, student_profiles.phone);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 15. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
-- Enable RLS across all tables
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.what_if_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_logs ENABLE ROW LEVEL SECURITY;

-- 15.1 student_profiles
DROP POLICY IF EXISTS "Users can read own profile" ON public.student_profiles;
CREATE POLICY "Users can read own profile"
  ON public.student_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.student_profiles;
CREATE POLICY "Users can update own profile"
  ON public.student_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.student_profiles;
CREATE POLICY "Users can insert own profile"
  ON public.student_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 15.2 skills
DROP POLICY IF EXISTS "Anyone can read skills catalog" ON public.skills;
CREATE POLICY "Anyone can read skills catalog"
  ON public.skills FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can add custom skills" ON public.skills;
CREATE POLICY "Authenticated users can add custom skills"
  ON public.skills FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 15.3 student_skills
DROP POLICY IF EXISTS "Users manage their own skills" ON public.student_skills;
CREATE POLICY "Users manage their own skills"
  ON public.student_skills FOR ALL
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- 15.4 career_goals
DROP POLICY IF EXISTS "Users manage their own career goals" ON public.career_goals;
CREATE POLICY "Users manage their own career goals"
  ON public.career_goals FOR ALL
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- 15.5 goal_requirements
DROP POLICY IF EXISTS "Users manage goal requirements for their goals" ON public.goal_requirements;
CREATE POLICY "Users manage goal requirements for their goals"
  ON public.goal_requirements FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.career_goals
      WHERE career_goals.id = goal_requirements.goal_id
      AND career_goals.student_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.career_goals
      WHERE career_goals.id = goal_requirements.goal_id
      AND career_goals.student_id = auth.uid()
    )
  );

-- 15.6 what_if_comparisons
DROP POLICY IF EXISTS "Users manage their what-if simulations" ON public.what_if_comparisons;
CREATE POLICY "Users manage their what-if simulations"
  ON public.what_if_comparisons FOR ALL
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- 15.7 roadmaps
DROP POLICY IF EXISTS "Users manage their roadmaps" ON public.roadmaps;
CREATE POLICY "Users manage their roadmaps"
  ON public.roadmaps FOR ALL
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- 15.8 roadmap_milestones
DROP POLICY IF EXISTS "Users manage their milestones" ON public.roadmap_milestones;
CREATE POLICY "Users manage their milestones"
  ON public.roadmap_milestones FOR ALL
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- 15.9 milestone_tasks
DROP POLICY IF EXISTS "Users manage their milestone tasks" ON public.milestone_tasks;
CREATE POLICY "Users manage their milestone tasks"
  ON public.milestone_tasks FOR ALL
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- 15.10 progress_logs
DROP POLICY IF EXISTS "Users manage their progress logs" ON public.progress_logs;
CREATE POLICY "Users manage their progress logs"
  ON public.progress_logs FOR ALL
  TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

-- ==============================================================================
-- 16. STORED PROCEDURES / RPC FUNCTIONS (Application Logic)
-- ==============================================================================

-- 16.1 Toggle milestone task completion status & recalculate goal progress
CREATE OR REPLACE FUNCTION public.toggle_milestone_task(p_task_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_student_id UUID;
  v_milestone_id UUID;
  v_roadmap_id UUID;
  v_goal_id UUID;
  v_new_state BOOLEAN;
  v_milestone_total INTEGER;
  v_milestone_done INTEGER;
  v_new_milestone_status TEXT;
  v_total_tasks INTEGER;
  v_completed_tasks INTEGER;
  v_new_progress INTEGER;
  v_new_probability INTEGER;
BEGIN
  v_student_id := auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Fetch task context and toggle status
  UPDATE public.milestone_tasks
  SET 
    is_done = NOT is_done,
    completed_at = CASE WHEN NOT is_done THEN timezone('utc'::text, now()) ELSE NULL END
  WHERE id = p_task_id AND student_id = v_student_id
  RETURNING milestone_id, is_done INTO v_milestone_id, v_new_state;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found or unauthorized';
  END IF;

  -- Fetch roadmap and goal references
  SELECT rm.roadmap_id, r.goal_id 
  INTO v_roadmap_id, v_goal_id
  FROM public.roadmap_milestones rm
  JOIN public.roadmaps r ON r.id = rm.roadmap_id
  WHERE rm.id = v_milestone_id;

  -- Recompute milestone status
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE is_done = true)
  INTO v_milestone_total, v_milestone_done
  FROM public.milestone_tasks
  WHERE milestone_id = v_milestone_id;

  IF v_milestone_total > 0 AND v_milestone_done = v_milestone_total THEN
    v_new_milestone_status := 'Done';
  ELSIF v_milestone_done > 0 THEN
    v_new_milestone_status := 'In progress';
  ELSE
    v_new_milestone_status := 'Upcoming';
  END IF;

  UPDATE public.roadmap_milestones
  SET status = v_new_milestone_status
  WHERE id = v_milestone_id;

  -- Recompute overall goal progress and probability
  SELECT 
    COUNT(t.id),
    COUNT(t.id) FILTER (WHERE t.is_done = true)
  INTO v_total_tasks, v_completed_tasks
  FROM public.roadmap_milestones rm
  JOIN public.milestone_tasks t ON t.milestone_id = rm.id
  WHERE rm.roadmap_id = v_roadmap_id;

  IF v_total_tasks > 0 THEN
    v_new_progress := ROUND((v_completed_tasks::numeric / v_total_tasks::numeric) * 100);
    v_new_probability := LEAST(98, GREATEST(40, 50 + ROUND(v_new_progress * 0.45)));

    UPDATE public.career_goals
    SET 
      progress_percentage = v_new_progress,
      probability_score = v_new_probability
    WHERE id = v_goal_id;
  END IF;

  RETURN jsonb_build_object(
    'taskId', p_task_id,
    'isDone', v_new_state,
    'milestoneId', v_milestone_id,
    'milestoneStatus', v_new_milestone_status,
    'goalProgress', COALESCE(v_new_progress, 0),
    'goalProbability', COALESCE(v_new_probability, 70)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16.2 Log weekly check-in, update hour history, streak, and task completions
CREATE OR REPLACE FUNCTION public.log_weekly_checkin(
  p_goal_id UUID,
  p_actual_hours NUMERIC,
  p_mood INTEGER,
  p_notes TEXT DEFAULT NULL,
  p_blockers TEXT DEFAULT NULL,
  p_goal_changes TEXT DEFAULT NULL,
  p_completed_task_ids JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_student_id UUID;
  v_goal RECORD;
  v_new_log_id UUID;
  v_target_hours NUMERIC;
  v_hour_delta NUMERIC;
  v_new_probability INTEGER;
  v_new_streak INTEGER;
  v_weekly_history JSONB;
  v_task_id_text TEXT;
BEGIN
  v_student_id := auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Ensure goal exists and belongs to the student
  SELECT * INTO v_goal
  FROM public.career_goals
  WHERE id = p_goal_id AND student_id = v_student_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Goal not found or unauthorized';
  END IF;

  v_target_hours := v_goal.hours_per_week;
  v_hour_delta := p_actual_hours - v_target_hours;
  v_new_streak := v_goal.streak + 1;

  -- Calculate new probability based on hours consistency
  IF v_hour_delta >= 0 THEN
    v_new_probability := LEAST(98, v_goal.probability_score + 2);
  ELSIF v_hour_delta < -4 THEN
    v_new_probability := GREATEST(35, v_goal.probability_score - 2);
  ELSE
    v_new_probability := v_goal.probability_score;
  END IF;

  -- Insert check-in log
  INSERT INTO public.progress_logs (
    student_id,
    goal_id,
    log_date,
    actual_hours,
    target_hours,
    mood,
    notes,
    blockers,
    goal_changes,
    completed_task_ids
  )
  VALUES (
    v_student_id,
    p_goal_id,
    CURRENT_DATE,
    p_actual_hours,
    v_target_hours,
    p_mood,
    p_notes,
    p_blockers,
    p_goal_changes,
    p_completed_task_ids
  )
  RETURNING id INTO v_new_log_id;

  -- Mark checked tasks as done in milestone_tasks
  IF jsonb_array_length(p_completed_task_ids) > 0 THEN
    FOR v_task_id_text IN SELECT jsonb_array_elements_text(p_completed_task_ids)
    LOOP
      UPDATE public.milestone_tasks
      SET is_done = true, completed_at = timezone('utc'::text, now())
      WHERE id = v_task_id_text::uuid AND student_id = v_student_id;
    END LOOP;
  END IF;

  -- Update goal streak, probability score and weekly hours
  v_weekly_history := COALESCE(v_goal.weekly_hours_history, '[]'::jsonb) || jsonb_build_object(
    'week', 'W' || (jsonb_array_length(COALESCE(v_goal.weekly_hours_history, '[]'::jsonb)) + 1),
    'hours', p_actual_hours,
    'target', v_target_hours
  );

  UPDATE public.career_goals
  SET 
    streak = v_new_streak,
    probability_score = v_new_probability,
    weekly_hours_history = v_weekly_history
  WHERE id = p_goal_id;

  RETURN jsonb_build_object(
    'logId', v_new_log_id,
    'goalId', p_goal_id,
    'streak', v_new_streak,
    'probabilityScore', v_new_probability,
    'actualHours', p_actual_hours
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16.3 Aggregated dashboard query for the authenticated student
CREATE OR REPLACE FUNCTION public.get_student_dashboard()
RETURNS JSONB AS $$
DECLARE
  v_student_id UUID;
  v_result JSONB;
BEGIN
  v_student_id := auth.uid();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT jsonb_build_object(
    'profile', (
      SELECT row_to_json(p) FROM (
        SELECT id, full_name, email, phone, avatar_url, initials, active_goal_id, created_at, updated_at
        FROM public.student_profiles
        WHERE id = v_student_id
      ) p
    ),
    'activeGoal', (
      SELECT row_to_json(g) FROM (
        SELECT *
        FROM public.career_goals
        WHERE student_id = v_student_id AND is_active = true
        ORDER BY updated_at DESC
        LIMIT 1
      ) g
    ),
    'allGoals', (
      SELECT COALESCE(json_agg(row_to_json(g)), '[]'::json) FROM (
        SELECT *
        FROM public.career_goals
        WHERE student_id = v_student_id
        ORDER BY created_at DESC
      ) g
    ),
    'skills', (
      SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json) FROM (
        SELECT sk.id as skill_id, sk.name, sk.category, ss.level, ss.verified
        FROM public.student_skills ss
        JOIN public.skills sk ON sk.id = ss.skill_id
        WHERE ss.student_id = v_student_id
        ORDER BY ss.level DESC
      ) s
    ),
    'recentLogs', (
      SELECT COALESCE(json_agg(row_to_json(l)), '[]'::json) FROM (
        SELECT *
        FROM public.progress_logs
        WHERE student_id = v_student_id
        ORDER BY log_date DESC, created_at DESC
        LIMIT 10
      ) l
    ),
    'latestComparison', (
      SELECT row_to_json(c) FROM (
        SELECT *
        FROM public.what_if_comparisons
        WHERE student_id = v_student_id
        ORDER BY created_at DESC
        LIMIT 1
      ) c
    ),
    'roadmap', (
      SELECT row_to_json(r) FROM (
        SELECT r.id, r.title, r.status,
          (
            SELECT COALESCE(json_agg(row_to_json(m)), '[]'::json)
            FROM (
              SELECT rm.id, rm.month_label, rm.title, rm.status, rm.outcome, rm.sort_order,
                (
                  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
                  FROM (
                    SELECT mt.id, mt.label, mt.is_done, mt.sort_order
                    FROM public.milestone_tasks mt
                    WHERE mt.milestone_id = rm.id
                    ORDER BY mt.sort_order ASC
                  ) t
                ) as tasks
              FROM public.roadmap_milestones rm
              WHERE rm.roadmap_id = r.id
              ORDER BY rm.sort_order ASC
            ) m
          ) as milestones
        FROM public.roadmaps r
        WHERE r.student_id = v_student_id
        ORDER BY r.updated_at DESC
        LIMIT 1
      ) r
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 17. SEED DATA: STANDARDIZED SKILLS CATALOG
-- ==============================================================================
INSERT INTO public.skills (name, category, description) VALUES
  ('React', 'Frontend', 'Modern React with Hooks, Context, Server Components, and Virtual DOM patterns'),
  ('TypeScript', 'Engineering', 'Static typing, interfaces, generics, and strict TypeScript configurations'),
  ('JavaScript', 'Frontend', 'ECMAScript standards, async programming, closures, and browser APIs'),
  ('Node.js', 'Backend', 'Server-side JavaScript runtime, event loop, and asynchronous microservices'),
  ('PostgreSQL', 'Database', 'Relational database architecture, queries, indexing, and transactions'),
  ('Supabase', 'Cloud & Database', 'Backend-as-a-Service, Row Level Security, Auth, Storage, and Realtime'),
  ('Python', 'Data & AI', 'General programming, scripting, data manipulation, and AI toolchains'),
  ('Tailwind CSS', 'Frontend', 'Utility-first styling, responsive design tokens, and modern layout systems'),
  ('Next.js', 'Frontend', 'Full-stack React framework with SSR, SSG, routing, and server actions'),
  ('System Design', 'Engineering', 'Distributed systems, load balancing, caching, and scalable architecture'),
  ('Data Structures & Algorithms', 'Engineering', 'Algorithmic problem solving, complexity analysis, and optimization'),
  ('Git & GitHub', 'DevOps', 'Version control workflows, branching strategies, and collaboration'),
  ('Docker & Containers', 'DevOps', 'Containerization, multi-stage builds, and container orchestration'),
  ('RESTful API Design', 'Backend', 'API contracts, HTTP conventions, status codes, and schema validation'),
  ('GraphQL', 'Backend', 'Declarative data fetching, resolvers, and GraphQL schema architecture'),
  ('Prompt Engineering', 'AI', 'Directing LLMs, chain-of-thought prompting, and contextual framing'),
  ('Strength & Hypertrophy Training', 'Fitness', 'Progressive overload, compound movements, and resistance mechanics'),
  ('Cardiovascular Conditioning', 'Fitness', 'Zone 2 aerobic base, VO2 max intervals, and cardiac stamina'),
  ('Mobility & Recovery', 'Fitness', 'Joint mobility, myofascial release, sleep hygiene, and recovery'),
  ('Zero-Based Budgeting', 'Finance', 'Cashflow mapping, emergency buffers, and expenditure discipline'),
  ('Broad-Market Index Investing', 'Finance', 'Asset allocation, low-cost broad index funds, and compound growth'),
  ('Deep Work & Time Blocking', 'Habits', 'Focused sprint scheduling, distraction elimination, and cadence')
ON CONFLICT (name) DO NOTHING;

-- ==============================================================================
-- 18. ROLE PERMISSIONS & GRANTS
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated;

-- Public read grants on catalog and views
GRANT SELECT ON public.skills TO anon;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.student_profiles TO anon;
