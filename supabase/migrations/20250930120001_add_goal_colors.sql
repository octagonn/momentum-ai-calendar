-- Add color field to goals table
ALTER TABLE public.goals ADD COLUMN color TEXT DEFAULT '#3B82F6';

-- Create a function to get the next available color for a user
CREATE OR REPLACE FUNCTION get_next_goal_color(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_colors TEXT[] := ARRAY[
    '#3B82F6', -- Blue
    '#10B981', -- Emerald
    '#F59E0B', -- Amber
    '#EF4444', -- Red
    '#8B5CF6', -- Violet
    '#06B6D4', -- Cyan
    '#84CC16', -- Lime
    '#F97316', -- Orange
    '#EC4899', -- Pink
    '#6B7280'  -- Gray
  ];
  v_used_colors TEXT[];
  v_available_colors TEXT[];
  v_selected_color TEXT;
BEGIN
  -- Get colors already used by this user
  SELECT ARRAY_AGG(color) INTO v_used_colors
  FROM goals 
  WHERE user_id = p_user_id AND color IS NOT NULL;
  
  -- Find available colors
  SELECT ARRAY_AGG(color) INTO v_available_colors
  FROM unnest(v_colors) AS color
  WHERE color NOT IN (SELECT unnest(COALESCE(v_used_colors, ARRAY[]::TEXT[])));
  
  -- Return first available color, or first color if all are used
  IF array_length(v_available_colors, 1) > 0 THEN
    v_selected_color := v_available_colors[1];
  ELSE
    v_selected_color := v_colors[1];
  END IF;
  
  RETURN v_selected_color;
END $$;

-- Update the create_goal_with_tasks function to assign colors
CREATE OR REPLACE FUNCTION public.create_goal_with_tasks(p_user_id uuid, p_goal jsonb, p_tasks jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_goal_id uuid;
  v_idx int := 0;
  v_task jsonb;
  v_goal_color TEXT;
BEGIN
  -- Get the next available color for this user
  v_goal_color := get_next_goal_color(p_user_id);
  
  -- If color is specified in the goal data, use it, otherwise use the auto-assigned color
  IF p_goal ? 'color' AND p_goal->>'color' IS NOT NULL THEN
    v_goal_color := p_goal->>'color';
  END IF;

  INSERT INTO public.goals (user_id, title, description, target_date, status, color)
  VALUES (
    p_user_id,
    p_goal->>'title',
    p_goal->>'description',
    (p_goal->>'target_date')::timestamptz,
    COALESCE((p_goal->>'status')::public.goal_status, 'active'),
    v_goal_color
  )
  RETURNING id INTO v_goal_id;

  FOR v_idx IN 0 .. jsonb_array_length(p_tasks)-1 LOOP
    v_task := p_tasks->v_idx;
    INSERT INTO public.tasks (
      goal_id, user_id, title, notes, due_at, duration_minutes, all_day, status, seq
    ) VALUES (
      v_goal_id,
      p_user_id,
      v_task->>'title',
      v_task->>'notes',
      (v_task->>'due_at')::timestamptz,
      nullif((v_task->>'duration_minutes')::int,0),
      coalesce((v_task->>'all_day')::boolean,false),
      coalesce((v_task->>'status')::public.task_status,'pending'),
      nullif((v_task->>'seq')::int,0)
    );
  END LOOP;

  RETURN v_goal_id;
END $$;
