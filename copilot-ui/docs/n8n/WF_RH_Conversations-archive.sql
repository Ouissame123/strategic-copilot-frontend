-- WF_RH_Conversations — PATCH /rh/conversations/:id/archive
-- Params: $1 conversation_id, $2 enterprise_id, $3 user_id, $4 status ('active' | 'archived')

UPDATE public.helper_conversations
SET
  status = $4,
  updated_at = NOW()
WHERE id = $1::uuid
  AND enterprise_id = $2::uuid
  AND user_id = $3::uuid
  AND COALESCE(payload->>'scope', '') = 'rh_copilot'
RETURNING id, status, updated_at;
