-- WF_RH_Copilot — doublon 24h (même entreprise, type, message, project_id)
-- Params: $1 enterprise_id, $2 type, $3 message, $4 project_id|null

SELECT id
FROM public.rh_actions
WHERE enterprise_id = $1::uuid
  AND type = $2
  AND message = $3
  AND COALESCE(project_id::text, '') = COALESCE($4::uuid::text, '')
  AND COALESCE(payload->>'source', '') = 'rh_copilot'
  AND created_at >= NOW() - INTERVAL '24 hours'
LIMIT 1;
