# WF_RH_Conversations — historique chat RH Copilot

Workflow **séparé** de `WF_Manager_Conversations`. Même tables `helper_*`, filtre `payload.scope = rh_copilot`.

---

## 1. Publication n8n

| Méthode | Path webhook | `__op` |
|---------|--------------|--------|
| GET | `rh/conversations` | `LIST` |
| GET | `rh/conversations/:id` | `GET_DETAIL` |
| PATCH | `rh/conversations/:id/archive` | `ARCHIVE` |

Auth : `Authorization: Bearer` — rôles `rh` ou `admin`.

---

## 2. Graphe recommandé

```
[Webhook LIST]     ──► [Route Parse] ──┐
[Webhook GET :id]──► [Route Parse] ──┼──► [JWT Decode] ──► [Auth RH Admin]
[Webhook ARCHIVE]  ──► [Route Parse] ──┘         │
                                                 ├─ __valid=false ──► [Error Respond]
                                                 └─ Switch (__op)
                                                      ├─ LIST ──► [Postgres LIST] ──► [Build List] ──► 200
                                                      ├─ GET_DETAIL ──► [Validate ID]
                                                      │       ├─ [Postgres GET conv]
                                                      │       └─ [Postgres Messages] ──► [Build Detail] ──► 200/404
                                                      └─ ARCHIVE ──► [Validate Archive] ──► [Postgres ARCHIVE] ──► [Build Archive] ──► 200/404
```

### Fichiers Code (`copilot-ui/n8n/`)

| Nœud | Fichier |
|------|---------|
| Route Parse | `WF_RH_Conversations-route-parse.js` |
| Auth | `WF_RH_Copilot-auth-rh-admin.js` |
| Validate ID | `WF_RH_Conversations-validate-conversation-id.js` |
| Validate Archive | `WF_RH_Conversations-validate-archive.js` |
| Build List | `WF_RH_Conversations-build-list-response.js` |
| Build Detail | `WF_RH_Conversations-build-detail-response.js` |
| Build Archive | `WF_RH_Conversations-build-archive-response.js` |
| Error | `WF_RH_Copilot-error-respond.js` |

### SQL (`copilot-ui/docs/n8n/`)

| Nœud Postgres | Fichier | Query parameters |
|---------------|---------|------------------|
| LIST | `WF_RH_Conversations-list.sql` | `[enterprise_id, user_id, query.status, query.search, query.limit]` |
| GET conv | `WF_RH_Conversations-get.sql` | `[conversation_id, enterprise_id, user_id]` |
| Messages | `WF_RH_Conversations-messages.sql` | `[conversation_id, enterprise_id]` |
| ARCHIVE | `WF_RH_Conversations-archive.sql` | `[conversation_id, enterprise_id, user_id, new_status]` |

Pour **GET_DETAIL** : exécuter GET conv puis Messages (Merge) avant Build Detail.

---

## 3. Réponses 200

### LIST

```json
{
  "status": "success",
  "workflow": "WF_RH_Conversations",
  "operation": "list",
  "count": 0,
  "conversations": []
}
```

Query optionnels : `status` (`active`|`archived`|`all`), `search`, `limit`.

### GET_DETAIL

```json
{
  "status": "success",
  "workflow": "WF_RH_Conversations",
  "operation": "get_detail",
  "conversation": {},
  "messages": []
}
```

### PATCH archive

Body : `{ "restore": false }` → `status = archived` ; `{ "restore": true }` → `status = active`.

---

## 4. Sécurité

- Filtrer `enterprise_id` + `user_id` (JWT `sub`) sur toutes les requêtes.
- Refuser les conversations sans `payload.scope = rh_copilot`.
- Ne pas exposer les conversations manager (avec `project_id` manager).
