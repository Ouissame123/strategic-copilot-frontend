-- WF_RH_Copilot — insérer recommandation rh_actions
-- Params: $1 enterprise_id, $2 project_id|null, $3 type, $4 message, $5 priority, $6 payload jsonb

INSERT INTO public.rh_actions (
  enterprise_id,
  manager_id,
  project_id,
  assigned_to,
  type,
  message,
  priority,
  status,
  payload,
  created_at,
  updated_at
)
VALUES (
  $1::uuid,
  NULL,
  NULLIF($2::text, '')::uuid,
  NULL,
  $3,
  $4,
  $5,
  'pending',
  $6::jsonb,
  NOW(),
  NOW()
)
RETURNING
  id,
  enterprise_id,
  project_id,
  type,
  message,
  priority,
  status,
  payload,
  created_at;
