-- ==============================================================================
-- Trajectify.AI — Migration 002: Fix Persistence & Auto-Confirm Auth
-- Migration: 002_fix_persistence_and_auth.sql
-- Purpose:
-- 1. Auto-confirm any existing unconfirmed users in auth.users
-- 2. Update handle_new_user() trigger to automatically confirm email on signup
-- 3. Seed active trajectory and skills for existing profile a28b0a85-ae5e-4785-85ee-8fb3766f37ba
-- ==============================================================================

-- 1. Auto-confirm all unconfirmed users in auth.users
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email_confirmed_at IS NULL;

-- 2. Update handle_new_user() to auto-confirm new registrations
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

-- Reattach trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Seed active trajectory and skills for existing profile a28b0a85-ae5e-4785-85ee-8fb3766f37ba
DO $$
DECLARE
  v_user_id UUID := 'a28b0a85-ae5e-4785-85ee-8fb3766f37ba';
  v_goal_id UUID;
  v_roadmap_id UUID;
  v_milestone_id UUID;
  v_react_id UUID;
  v_ts_id UUID;
  v_node_id UUID;
  v_sql_id UUID;
BEGIN
  -- Verify user exists in auth.users
  IF EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    -- Ensure email is confirmed
    UPDATE auth.users SET email_confirmed_at = now() WHERE id = v_user_id;

    -- Lookup skill IDs
    SELECT id INTO v_react_id FROM public.skills WHERE name = 'React' LIMIT 1;
    SELECT id INTO v_ts_id FROM public.skills WHERE name = 'TypeScript' LIMIT 1;
    SELECT id INTO v_node_id FROM public.skills WHERE name = 'Node.js' LIMIT 1;
    SELECT id INTO v_sql_id FROM public.skills WHERE name = 'PostgreSQL' LIMIT 1;

    -- Upsert skills into public.student_skills
    IF v_react_id IS NOT NULL THEN
      INSERT INTO public.student_skills (student_id, skill_id, level, verified)
      VALUES (v_user_id, v_react_id, 7, true)
      ON CONFLICT (student_id, skill_id) DO UPDATE SET level = 7;
    END IF;

    IF v_ts_id IS NOT NULL THEN
      INSERT INTO public.student_skills (student_id, skill_id, level, verified)
      VALUES (v_user_id, v_ts_id, 6, true)
      ON CONFLICT (student_id, skill_id) DO UPDATE SET level = 6;
    END IF;

    IF v_node_id IS NOT NULL THEN
      INSERT INTO public.student_skills (student_id, skill_id, level, verified)
      VALUES (v_user_id, v_node_id, 5, true)
      ON CONFLICT (student_id, skill_id) DO UPDATE SET level = 5;
    END IF;

    IF v_sql_id IS NOT NULL THEN
      INSERT INTO public.student_skills (student_id, skill_id, level, verified)
      VALUES (v_user_id, v_sql_id, 6, true)
      ON CONFLICT (student_id, skill_id) DO UPDATE SET level = 6;
    END IF;

    -- Check if career_goals already has a goal for this student
    SELECT id INTO v_goal_id FROM public.career_goals WHERE student_id = v_user_id LIMIT 1;

    IF v_goal_id IS NULL THEN
      -- Insert career goal into public.career_goals
      INSERT INTO public.career_goals (
        student_id,
        domain,
        title,
        description,
        hours_per_week,
        target_date,
        progress_percentage,
        probability_score,
        streak,
        is_active,
        dimensions,
        weekly_hours_history
      ) VALUES (
        v_user_id,
        'Career / Skills',
        'Senior Full-Stack AI Engineer',
        'Master modern React, TypeScript, cloud databases, and AI-driven architecture.',
        16,
        '6 months',
        25,
        82,
        3,
        true,
        '[{"dim":"Skills","value":82},{"dim":"Time","value":78},{"dim":"Consistency","value":85},{"dim":"Market alignment","value":88},{"dim":"Risk resilience","value":70},{"dim":"Momentum","value":84}]'::jsonb,
        '[{"week":"W1","hours":12,"target":16},{"week":"W2","hours":15,"target":16},{"week":"W3","hours":16,"target":16}]'::jsonb
      ) RETURNING id INTO v_goal_id;

      -- Update active_goal_id on student_profiles AFTER goal exists (respecting foreign key)
      UPDATE public.student_profiles
      SET active_goal_id = v_goal_id
      WHERE id = v_user_id;

      -- Insert goal requirements
      IF v_react_id IS NOT NULL THEN
        INSERT INTO public.goal_requirements (goal_id, skill_id, skill_name, target_level, priority)
        VALUES (v_goal_id, v_react_id, 'React', 8, 'required');
      END IF;

      IF v_ts_id IS NOT NULL THEN
        INSERT INTO public.goal_requirements (goal_id, skill_id, skill_name, target_level, priority)
        VALUES (v_goal_id, v_ts_id, 'TypeScript', 8, 'required');
      END IF;

      -- Insert living roadmap
      INSERT INTO public.roadmaps (
        student_id,
        goal_id,
        title,
        status,
        total_milestones,
        completed_milestones
      ) VALUES (
        v_user_id,
        v_goal_id,
        'Senior Full-Stack AI Engineer',
        'active',
        2,
        1
      ) RETURNING id INTO v_roadmap_id;

      -- Milestone 1 (Done)
      INSERT INTO public.roadmap_milestones (
        roadmap_id, student_id, month_label, sort_order, title, status, outcome
      ) VALUES (
        v_roadmap_id, v_user_id, 'Month 1 · Foundations', 1, 'Architecture & Database Modeling', 'Done',
        'PostgreSQL relational schema and RLS policies deployed'
      ) RETURNING id INTO v_milestone_id;

      INSERT INTO public.milestone_tasks (milestone_id, student_id, label, is_done, sort_order) VALUES
        (v_milestone_id, v_user_id, 'Design schema tables and constraints', true, 1),
        (v_milestone_id, v_user_id, 'Implement Row Level Security policies', true, 2);

      -- Milestone 2 (In progress)
      INSERT INTO public.roadmap_milestones (
        roadmap_id, student_id, month_label, sort_order, title, status, outcome
      ) VALUES (
        v_roadmap_id, v_user_id, 'Month 2 · Implementation', 2, 'Full-Stack Integration & Scoring Engine', 'In progress',
        'Wire frontend services and deterministic what-if simulator'
      ) RETURNING id INTO v_milestone_id;

      INSERT INTO public.milestone_tasks (milestone_id, student_id, label, is_done, sort_order) VALUES
        (v_milestone_id, v_user_id, 'Connect Supabase Auth and PostgREST operations', true, 1),
        (v_milestone_id, v_user_id, 'Verify end-to-end database persistence', false, 2);
    ELSE
      -- Ensure active_goal_id is set
      UPDATE public.student_profiles
      SET active_goal_id = v_goal_id
      WHERE id = v_user_id;
    END IF;
  END IF;
END $$;
