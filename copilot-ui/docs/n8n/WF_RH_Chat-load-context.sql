-- WF_RH_Chat — contexte RH agrégé (chiffres PostgreSQL uniquement)
-- Params: $1 enterprise_id, $2 talent_id|null, $3 project_id|null

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
    AND ($2::uuid IS NULL OR t.id = $2::uuid)
  GROUP BY t.id, t.name, t.contract_end_date
),
overloaded AS (
  SELECT *
  FROM talent_load
  WHERE total_allocation_pct > 100
),
contracts_ending AS (
  SELECT talent_id, talent_name, contract_end_date
  FROM talent_load
  WHERE contract_end_date IS NOT NULL
    AND contract_end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '60 days')
),
pending_requests AS (
  SELECT
    ra.id,
    ra.type,
    ra.message,
    ra.priority,
    ra.status,
    ra.project_id,
    ra.created_at
  FROM public.rh_actions ra
  CROSS JOIN ent
  WHERE ra.enterprise_id = ent.enterprise_id
    AND ra.status = 'pending'
    AND COALESCE(ra.payload->>'source', '') <> 'rh_copilot'
  ORDER BY ra.created_at DESC
  LIMIT 20
),
skill_gaps AS (
  SELECT
    tmr.project_id,
    p.name AS project_name,
    tmr.gap_count,
    tmr.overall_score
  FROM public.talent_matching_results tmr
  CROSS JOIN ent
  INNER JOIN public.projects p ON p.id = tmr.project_id AND p.enterprise_id = ent.enterprise_id
  WHERE tmr.enterprise_id = ent.enterprise_id
    AND COALESCE(tmr.gap_count, 0) > 0
    AND ($3::uuid IS NULL OR tmr.project_id = $3::uuid)
  ORDER BY tmr.gap_count DESC NULLS LAST
  LIMIT 15
),
active_projects AS (
  SELECT
    p.id,
    p.name,
    p.status,
    (
      SELECT COUNT(DISTINCT pa.talent_id)
      FROM public.project_assignments pa
      WHERE pa.project_id = p.id
        AND pa.enterprise_id = p.enterprise_id
        AND COALESCE(pa.status, 'active') = 'active'
    )::int AS team_size
  FROM public.projects p
  CROSS JOIN ent
  WHERE p.enterprise_id = ent.enterprise_id
    AND p.status = 'active'
    AND ($3::uuid IS NULL OR p.id = $3::uuid)
  ORDER BY team_size ASC
  LIMIT 15
),
recent_messages AS (
  SELECT m.role, m.content, m.created_at
  FROM public.helper_messages m
  INNER JOIN public.helper_conversations c ON c.id = m.conversation_id
  CROSS JOIN ent
  WHERE c.enterprise_id = ent.enterprise_id
    AND COALESCE(c.payload->>'scope', '') = 'rh_copilot'
    AND ($2::uuid IS NULL OR c.payload->>'talent_id' = $2::text)
  ORDER BY m.created_at DESC
  LIMIT 12
)
SELECT jsonb_build_object(
  'enterprise_id', ent.enterprise_id,
  'counts', jsonb_build_object(
    'talents_overloaded', (SELECT COUNT(*)::int FROM overloaded),
    'contracts_ending_soon', (SELECT COUNT(*)::int FROM contracts_ending),
    'pending_manager_requests', (SELECT COUNT(*)::int FROM pending_requests),
    'projects_with_skill_gaps', (SELECT COUNT(DISTINCT project_id)::int FROM skill_gaps),
    'active_projects_low_team', (
      SELECT COUNT(*)::int FROM active_projects WHERE team_size < 2
    )
  ),
  'overloaded_talents', COALESCE((SELECT jsonb_agg(to_jsonb(o)) FROM overloaded o), '[]'::jsonb),
  'contracts_ending', COALESCE((SELECT jsonb_agg(to_jsonb(c)) FROM contracts_ending c), '[]'::jsonb),
  'pending_requests', COALESCE((SELECT jsonb_agg(to_jsonb(pr)) FROM pending_requests pr), '[]'::jsonb),
  'skill_gaps', COALESCE((SELECT jsonb_agg(to_jsonb(sg)) FROM skill_gaps sg), '[]'::jsonb),
  'active_projects', COALESCE((SELECT jsonb_agg(to_jsonb(ap)) FROM active_projects ap), '[]'::jsonb),
  'recent_messages', COALESCE((SELECT jsonb_agg(to_jsonb(rm) ORDER BY rm.created_at DESC) FROM recent_messages rm), '[]'::jsonb)
) AS context
FROM ent;
