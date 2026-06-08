-- WF_RH_Chat — vérifier conversation existante (si conversation_id fourni)
-- Params: $1 conversation_id, $2 enterprise_id, $3 user_id

SELECT id, title, status, payload
FROM public.helper_conversations
WHERE id = $1::uuid
  AND enterprise_id = $2::uuid
  AND user_id = $3::uuid
  AND COALESCE(payload->>'scope', '') = 'rh_copilot'
LIMIT 1;
