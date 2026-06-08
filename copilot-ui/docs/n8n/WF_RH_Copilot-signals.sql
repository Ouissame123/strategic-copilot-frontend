-- WF_RH_Copilot — agrégat signaux RH (lecture seule)
-- Param: $1 enterprise_id

WITH ent AS (
  SELECT $1::uuid AS enterprise_id
),
talent_load AS (
  SELECT
    t.id AS talent_id,
    t.name AS talent_name,
    COALESCE(SUM(pa.allocation_pct), 0)::numeric AS total_allocation_pct,
    t.contract_end_date
  FROM public.talents t
  CROSS JOIN ent
  LEFT JOIN public.project_assignments pa
    ON pa.talent_id = t.id
   AND pa.enterprise_id = t.enterprise_id
   AND COALESCE(pa.status, 'active') IN ('active', 'planned')
  WHERE t.enterprise_id = ent.enterprise_id
  GROUP BY t.id, t.name, t.contract_end_date
),
overloaded AS (
  SELECT talent_id, talent_name, total_allocation_pct
  FROM talent_load
  WHERE total_allocation_pct > 100
),
contracts_ending AS (
  SELECT talent_id, talent_name, contract_end_date
  FROM talent_load
  WHERE contract_end_date IS NOT NULL
    AND contract_end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '60 days')
),
skill_gaps AS (
  SELECT
    tmr.project_id,
    p.name AS project_name,
    tmr.gap_count,
    tmr.overall_score,
    tmr.talent_id,
    t.name AS talent_name
  FROM public.talent_matching_results tmr
  CROSS JOIN ent
  INNER JOIN public.projects p ON p.id = tmr.project_id AND p.enterprise_id = ent.enterprise_id
  LEFT JOIN public.talents t ON t.id = tmr.talent_id
  WHERE tmr.enterprise_id = ent.enterprise_id
    AND COALESCE(tmr.gap_count, 0) > 0
),
pending_requests AS (
  SELECT
    ra.id,
    ra.type,
    ra.message,
    ra.priority,
    ra.project_id,
    ra.manager_id,
    ra.created_at
  FROM public.rh_actions ra
  CROSS JOIN ent
  WHERE ra.enterprise_id = ent.enterprise_id
    AND ra.status = 'pending'
    AND COALESCE(ra.payload->>'source', '') <> 'rh_copilot'
),
understaffed_projects AS (
  SELECT
    p.id AS project_id,
    p.name AS project_name,
    team.team_size
  FROM public.projects p
  CROSS JOIN ent
  INNER JOIN LATERAL (
    SELECT COUNT(DISTINCT pa.talent_id)::int AS team_size
    FROM public.project_assignments pa
    WHERE pa.project_id = p.id
      AND pa.enterprise_id = p.enterprise_id
      AND COALESCE(pa.status, 'active') = 'active'
  ) team ON true
  WHERE p.enterprise_id = ent.enterprise_id
    AND p.status = 'active'
    AND team.team_size < 2
)
SELECT jsonb_build_object(
  'signals_count', jsonb_build_object(
    'overloaded', (SELECT COUNT(*)::int FROM overloaded),
    'skill_gaps', (SELECT COUNT(DISTINCT project_id)::int FROM skill_gaps),
    'contracts_ending', (SELECT COUNT(*)::int FROM contracts_ending),
    'pending_requests', (SELECT COUNT(*)::int FROM pending_requests),
    'understaffed_projects', (SELECT COUNT(*)::int FROM understaffed_projects)
  ),
  'overloaded', COALESCE((SELECT jsonb_agg(to_jsonb(o)) FROM overloaded o), '[]'::jsonb),
  'skill_gaps', COALESCE((SELECT jsonb_agg(to_jsonb(sg)) FROM skill_gaps sg LIMIT 30), '[]'::jsonb),
  'contracts_ending', COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM contracts_ending c), '[]'::jsonb),
  'pending_requests', COALESCE((SELECT jsonb_agg(to_jsonb(pr)) FROM pending_requests pr LIMIT 30), '[]'::jsonb),
  'understaffed_projects', COALESCE((SELECT jsonb_agg(to_jsonb(up)) FROM understaffed_projects up), '[]'::jsonb)
) AS signals
FROM ent;
