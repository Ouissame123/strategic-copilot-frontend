-- WF_RH_Conversations — GET /rh/conversations
-- Params: $1 enterprise_id, $2 user_id, $3 status|null, $4 search|null, $5 limit (default 50)
-- Scope RH uniquement : payload->>'scope' = 'rh_copilot' (ne pas mélanger manager/projet)

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
  (
    SELECT hm.content
    FROM public.helper_messages hm
    WHERE hm.conversation_id = c.id
    ORDER BY hm.created_at DESC
    LIMIT 1
  ) AS last_message_preview,
  NULL::text AS manager_name
FROM public.helper_conversations c
WHERE c.enterprise_id = $1::uuid
  AND c.user_id = $2::uuid
  AND COALESCE(c.payload->>'scope', '') = 'rh_copilot'
  AND ($3::text IS NULL OR $3 = 'all' OR c.status = $3)
  AND (
    $4::text IS NULL
    OR c.title ILIKE '%' || $4 || '%'
    OR EXISTS (
      SELECT 1
      FROM public.helper_messages hm2
      WHERE hm2.conversation_id = c.id
        AND hm2.content ILIKE '%' || $4 || '%'
    )
  )
ORDER BY c.last_message_at DESC NULLS LAST, c.updated_at DESC
LIMIT COALESCE(NULLIF($5::int, 0), 50);
