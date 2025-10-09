-- Update goal_progress view to include color field
drop view if exists public.goal_progress;
create view public.goal_progress as
select
  g.id as goal_id,
  g.user_id,
  g.title,
  g.description,
  g.target_date,
  g.status,
  g.color,
  g.created_at,
  g.updated_at,
  count(t.*) filter (where t.status='done')::float / nullif(count(t.*),0) as completion_ratio
from goals g
left join tasks t on t.goal_id = g.id
group by g.id, g.user_id, g.title, g.description, g.target_date, g.status, g.color, g.created_at, g.updated_at;
