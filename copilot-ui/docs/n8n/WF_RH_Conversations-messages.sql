-- WF_RH_Conversations — messages d'une conversation (2e requête ou sous-requête n8n)
-- Params: $1 conversation_id, $2 enterprise_id

SELECT
  m.id,
  m.conversation_id,
  m.role,
  m.content,
  m.intent,
  m.confidence,
  m.suggested_actions,
  m.quick_replies,
  m.sources,
  m.details,
  m.created_at
FROM public.helper_messages m
INNER JOIN public.helper_conversations c ON c.id = m.conversation_id
WHERE m.conversation_id = $1::uuid
  AND c.enterprise_id = $2::uuid
  AND COALESCE(c.payload->>'scope', '') = 'rh_copilot'
ORDER BY m.created_at ASC
LIMIT 500;
