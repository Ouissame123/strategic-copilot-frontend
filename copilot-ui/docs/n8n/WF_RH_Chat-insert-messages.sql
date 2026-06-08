-- WF_RH_Chat — insérer message user + assistant (2 exécutions ou CTE)
-- Variante USER — Params: $1 conversation_id, $2 enterprise_id, $3 role, $4 content, $5 metadata jsonb

INSERT INTO public.helper_messages (
  conversation_id,
  enterprise_id,
  role,
  content,
  intent,
  confidence,
  suggested_actions,
  sources,
  details,
  quick_replies,
  metadata,
  created_at
)
VALUES (
  $1::uuid,
  $2::uuid,
  $3,
  $4,
  NULLIF($5::jsonb->>'intent', ''),
  NULLIF($5::jsonb->>'confidence', '')::numeric,
  COALESCE($5::jsonb->'suggested_actions', '[]'::jsonb),
  COALESCE($5::jsonb->'sources', '[]'::jsonb),
  COALESCE($5::jsonb->'details', '[]'::jsonb),
  COALESCE($5::jsonb->'quick_replies', '[]'::jsonb),
  $5::jsonb,
  NOW()
)
RETURNING id, conversation_id, role, content, created_at;
