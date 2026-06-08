-- WF_RH_Requests_Decision — PATCH /rh/requests/:id (décision RH)
-- Params: $1 request_id, $2 enterprise_id, $3 status, $4 response_message|null, $5 assigned_to|null

UPDATE public.rh_actions
SET
  status = $3,
  response_message = COALESCE($4, response_message),
  assigned_to = COALESCE($5::uuid, assigned_to),
  updated_at = NOW(),
  completed_at = CASE
    WHEN $3 IN ('done', 'closed', 'rejected') THEN NOW()
    ELSE completed_at
  END
WHERE id = $1::uuid
  AND enterprise_id = $2::uuid
RETURNING
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
  completed_at;
