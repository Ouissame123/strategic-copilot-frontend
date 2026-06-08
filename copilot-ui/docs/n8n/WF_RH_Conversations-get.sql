-- WF_RH_Conversations — GET /rh/conversations/:id (conversation + messages)
-- Params: $1 conversation_id, $2 enterprise_id, $3 user_id

SELECT
  c.id,
  c.title,
  c.status,
  c.last_message_at,
  c.created_at,
  c.updated_at,
  (
    SELECT COUNT(*)::int
    FROM public.helper_messages hm
    WHERE hm.conversation_id = c.id
  ) AS message_count,
  NULL::text AS manager_name
FROM public.helper_conversations c
WHERE c.id = $1::uuid
  AND c.enterprise_id = $2::uuid
  AND c.user_id = $3::uuid
  AND COALESCE(c.payload->>'scope', '') = 'rh_copilot';
