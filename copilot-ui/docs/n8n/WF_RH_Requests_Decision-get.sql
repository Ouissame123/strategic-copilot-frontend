-- WF_RH_Requests_Decision — GET /rh/requests/:id et GET /rh/requests/:id/actions (état courant)
-- Params: $1 request_id, $2 enterprise_id

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
WHERE id = $1::uuid
  AND enterprise_id = $2::uuid
LIMIT 1;
