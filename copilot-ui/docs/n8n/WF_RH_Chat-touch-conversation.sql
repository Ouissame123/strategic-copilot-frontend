-- WF_RH_Chat — mettre à jour last_message_at / title si première interaction
-- Params: $1 conversation_id, $2 enterprise_id, $3 preview text

UPDATE public.helper_conversations
SET
  last_message_at = NOW(),
  updated_at = NOW(),
  title = CASE
    WHEN COALESCE(title, '') IN ('', 'Conversation RH Copilot', 'Nouvelle conversation')
      THEN LEFT($3::text, 120)
    ELSE title
  END
WHERE id = $1::uuid
  AND enterprise_id = $2::uuid
RETURNING id, title, last_message_at;
