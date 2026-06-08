# WF_RH_Chat — POST /rh/chat

Réception d'une question RH, chargement du contexte PostgreSQL, appel Groq, persistance `helper_messages`, réponse structurée.

**Ne pas confondre** avec `WF_Helper_Chat` (manager + `project_id` obligatoire côté manager).

---

## 1. Publication n8n

| Méthode | Path | `__op` |
|---------|------|--------|
| POST | `rh/chat` | `CHAT` |

URL prod : `https://n8nprod.aphelionxinnovations.com/webhook/rh/chat`

---

## 2. Body

```json
{
  "message": "texte obligatoire",
  "conversation_id": "uuid optionnel",
  "talent_id": "uuid optionnel",
  "project_id": "uuid optionnel"
}
```

Pas d'`enterprise_id` dans le body.

---

## 3. Graphe recommandé

```
[Webhook POST] ──► [Route Parse] ──► [JWT Decode] ──► [Auth RH Admin]
        │
        ├─ invalid ──► [Error Respond]
        └─ [Validate Body]
              ├─ IF conversation_id vide
              │     └─ [Postgres CREATE conversation] ──┐
              └─ ELSE [Postgres ASSERT conversation] ─────┼──► [Resolve Conversation]
                                                            │
              [Postgres Load Context] ◄───────────────────┘
              [Build Groq Prompt]
              [HTTP Groq] ──► (on error) ──► [Parse LLM or Fallback]  ◄── branche erreur = même nœud
              [Prepare Message Rows] ──► Loop ──► [INSERT message] (×2)
              [Touch Conversation]
              [Build Response] ──► 200
```

### Fichiers Code

| Nœud (nom suggéré) | Fichier |
|--------------------|---------|
| Route Parse | `WF_RH_Chat-route-parse.js` |
| Auth | `WF_RH_Copilot-auth-rh-admin.js` |
| Validate Body | `WF_RH_Chat-validate-body.js` |
| Resolve Conversation | `WF_RH_Chat-resolve-conversation.js` |
| Build Groq Prompt | `WF_RH_Chat-build-groq-prompt.js` |
| Parse LLM or Fallback | `WF_RH_Chat-parse-llm-or-fallback.js` |
| Prepare Message Rows | `WF_RH_Chat-prepare-message-rows.js` |
| Build Response | `WF_RH_Chat-build-response.js` |

### SQL

| Étape | Fichier | Params |
|-------|---------|--------|
| CREATE | `WF_RH_Chat-create-conversation.sql` | `[enterprise_id, user_id, title, talent_id, project_id]` — title = `LEFT(message, 80)` |
| ASSERT | `WF_RH_Chat-assert-conversation.sql` | `[conversation_id, enterprise_id, user_id]` |
| Context | `WF_RH_Chat-load-context.sql` | `[enterprise_id, talent_id, project_id]` |
| INSERT msg | `WF_RH_Chat-insert-messages.sql` | `[conversation_id, enterprise_id, role, content, metadata::jsonb]` |
| Touch | `WF_RH_Chat-touch-conversation.sql` | `[conversation_id, enterprise_id, preview]` |

**INSERT message** : boucle sur 2 items (`user`, `assistant`). Metadata assistant = sortie `assistant_metadata` du nœud Parse.

---

## 4. Réponse 200 obligatoire

```json
{
  "status": "success",
  "workflow": "WF_RH_Chat",
  "conversation_id": "...",
  "reply": "...",
  "details": [],
  "intent": "...",
  "suggested_actions": [],
  "sources": [],
  "confidence": 0.8,
  "quick_replies": [],
  "llm_enriched": true,
  "meta": {
    "api_version": "v1",
    "source_agent": "rh_chat",
    "computed_at": "2026-05-25T12:00:00.000Z"
  }
}
```

- `llm_enriched: false` si fallback déterministe (Groq indisponible).
- Aucun chiffre inventé : le prompt système + fallback n'utilisent que `context` SQL.

---

## 5. HTTP Groq (n8n)

Nœud **HTTP Request** après Build Groq Prompt :

- Method POST
- URL `https://api.groq.com/openai/v1/chat/completions`
- Header `Authorization: Bearer {{$env.GROQ_API_KEY}}`
- Body : `{{ JSON.stringify($json.groq) }}` (ou mapper model/messages/temperature/response_format)

Relier la sortie d'erreur et la sortie succès vers **Parse LLM or Fallback** (continue on fail activé).

---

## 6. Nœuds à renommer exactement (références `$()`)

- `Route Parse`
- `Validate Body`
- `Resolve Conversation`
- `Build Groq Prompt`
- `Parse LLM or Fallback`
