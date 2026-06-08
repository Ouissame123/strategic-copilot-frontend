-- WF_RH_Chat — créer conversation si conversation_id absent
-- Params: $1 enterprise_id, $2 user_id, $3 title, $4 talent_id|null, $5 project_id|null

INSERT INTO public.helper_conversations (
  enterprise_id,
  user_id,
  project_id,
  title,
  status,
  payload,
  last_message_at,
  created_at,
  updated_at
)
VALUES (
  $1::uuid,
  $2::uuid,
  NULLIF($5::text, '')::uuid,
  COALESCE(NULLIF($3::text, ''), 'Conversation RH Copilot'),
  'active',
  jsonb_build_object(
    'scope', 'rh_copilot',
    'source_agent', 'rh_chat',
    'talent_id', NULLIF($4::text, ''),
    'project_id', NULLIF($5::text, '')
  ),
  NOW(),
  NOW(),
  NOW()
)
RETURNING id, enterprise_id, user_id, title, status, payload, created_at;
