-- WF_RH_Requests_Decision — GET /rh/requests (liste entreprise)
-- Params: $1 enterprise_id, $2 status|null, $3 type|null, $4 priority|null, $5 project_id|null

SELECT
  id,
  enterprise_id,
  manager_id,
  project_id,
  assigned_to,
  type,
  message,
  priority,
  status,
  response_message,
  payload,
  created_at,
  updated_at,
  completed_at
FROM public.rh_actions
WHERE enterprise_id = $1::uuid
  AND ($2::text IS NULL OR status = $2)
  AND ($3::text IS NULL OR type = $3)
  AND ($4::text IS NULL OR priority = $4)
  AND ($5::uuid IS NULL OR project_id = $5::uuid)
ORDER BY created_at DESC
LIMIT 500;
