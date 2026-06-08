# WF_RH_Requests_Decision — référence n8n (RH uniquement)

Workflow **séparé** de `WF_Manager_RH_Actions`. Même table Postgres : `public.rh_actions`.

| Rôle | Préfixe routes | Création | Décision |
|------|----------------|----------|----------|
| Manager | `/webhook/api/rh/actions` | Oui (GET/POST) | Annulation `cancelled` uniquement |
| RH | `/webhook/rh/requests` | **Non** | Consultation + décision (GET/PATCH) |

**Interdictions**

- Ne pas exposer `/api/rh/actions` dans ce workflow.
- Ne pas accepter `role === "manager"` (403).
- Ne pas autoriser `status: cancelled` ni `pending` en PATCH RH.
- Ne pas créer de nouvelle table.

---

## 1. Publication n8n

Créer le workflow **`WF_RH_Requests_Decision`** avec **4 déclencheurs Webhook** (ou un seul webhook + route dynamique) :

| Méthode | Path webhook (sans préfixe instance) | `__op` |
|---------|--------------------------------------|--------|
| GET | `rh/requests` | `LIST` |
| GET | `rh/requests/:id` | `GET_ONE` |
| PATCH | `rh/requests/:id` | `PATCH` |
| GET | `rh/requests/:id/actions` | `HISTORY` |

URL production typique :

- `https://n8nprod.aphelionxinnovations.com/webhook/rh/requests`
- `https://n8nprod.aphelionxinnovations.com/webhook/rh/requests/{id}`
- `https://n8nprod.aphelionxinnovations.com/webhook/rh/requests/{id}/actions`

Auth : header `Authorization: Bearer <access_token>` sur chaque appel.

---

## 2. Graphe recommandé

```
[Webhook LIST]     ──► [Route Parse] ──┐
[Webhook GET :id]  ──► [Route Parse] ──┼──► [JWT Decode] ──► [Auth RH Only]
[Webhook PATCH]    ──► [Route Parse] ──┤         │
[Webhook HISTORY]  ──► [Route Parse] ──┘         ├─ __valid=false ──► [Error Respond] ──► Respond (401/403/400)
                                                 │
                                                 └─ Switch (__op)
                                                      ├─ LIST ──► [Postgres LIST] ──► [Build List] ──► Respond 200
                                                      ├─ GET_ONE ──► [Validate ID] ──► [Postgres GET] ──► [Build Get] ──► Respond 200/404
                                                      ├─ PATCH ──► [Validate Patch] ──► [Postgres PATCH] ──► [Build Patch] ──► Respond 200/404
                                                      └─ HISTORY ──► [Validate ID] ──► [Postgres GET] ──► [Build History] ──► Respond 200/404
```

Fichiers Code à coller (dossier `copilot-ui/n8n/`) :

| Nœud n8n | Fichier |
|----------|---------|
| Route Parse | `WF_RH_Requests_Decision-route-parse.js` |
| Auth RH Only | `WF_RH_Requests_Decision-auth-rh-only.js` |
| Validate Request ID | `WF_RH_Requests_Decision-validate-request-id.js` |
| Validate Patch Body | `WF_RH_Requests_Decision-validate-patch.js` |
| Build List | `WF_RH_Requests_Decision-build-list-response.js` |
| Build Get | `WF_RH_Requests_Decision-build-get-response.js` |
| Build Patch | `WF_RH_Requests_Decision-build-patch-response.js` |
| Build History | `WF_RH_Requests_Decision-build-history-response.js` |
| Error Respond | `WF_RH_Requests_Decision-error-respond.js` |

> Le nœud **Auth RH Only** lit le contexte route via `$('Route Parse').first().json` — renommer le nœud exactement **`Route Parse`**.

---

## 3. GET `/rh/requests` — liste

**Rôle :** `rh` uniquement.

**Query params optionnels :** `status`, `type`, `priority`, `project_id`

### Postgres `[LIST] SELECT`

Fichier : `WF_RH_Requests_Decision-list.sql`

**Query parameters :**

```javascript
{{ [
  $json.enterprise_id,
  $json.query?.status || null,
  $json.query?.type || null,
  $json.query?.priority || null,
  $json.query?.project_id || null
] }}
```

### Response 200

```json
{
  "status": "success",
  "workflow": "WF_RH_Requests_Decision",
  "action": "list",
  "count": 0,
  "items": []
}
```

---

## 4. GET `/rh/requests/:id` — détail

### Postgres `[GET_ONE] SELECT`

Fichier : `WF_RH_Requests_Decision-get.sql`

**Query parameters :**

```javascript
{{ [ $json.request_id, $json.enterprise_id ] }}
```

### Response 200

```json
{
  "status": "success",
  "workflow": "WF_RH_Requests_Decision",
  "action": "get",
  "data": { }
}
```

### Response 404

```json
{
  "status": "error",
  "code": "request_not_found",
  "message": "Demande RH introuvable"
}
```

---

## 5. PATCH `/rh/requests/:id` — décision RH

### Body accepté

```json
{
  "status": "accepted | rejected | in_progress | done | closed",
  "response_message": "texte optionnel",
  "assigned_to": "uuid optionnel"
}
```

**Statuts autorisés :** `accepted`, `rejected`, `in_progress`, `done`, `closed`

**Interdits :** `cancelled` (manager), `pending` (RH ne remet pas en attente)

**Validation :** voir `WF_RH_Requests_Decision-validate-patch.js`

### Postgres `[PATCH] UPDATE`

Fichier : `WF_RH_Requests_Decision-patch.sql`

**Query parameters :**

```javascript
{{ [
  $json.request_id,
  $json.enterprise_id,
  $json.status,
  $json.response_message,
  $json.assigned_to
] }}
```

`completed_at` est renseigné automatiquement si `status IN ('done','closed','rejected')`.

### Response 200

```json
{
  "status": "success",
  "workflow": "WF_RH_Requests_Decision",
  "action": "updated",
  "data": { }
}
```

---

## 6. GET `/rh/requests/:id/actions` — historique

Pas de table d’historique : retourner l’état courant de la ligne comme un tableau d’un élément.

Même SQL que GET_ONE (`WF_RH_Requests_Decision-get.sql`), puis `WF_RH_Requests_Decision-build-history-response.js`.

### Response 200

```json
{
  "status": "success",
  "workflow": "WF_RH_Requests_Decision",
  "action": "history",
  "items": [
    {
      "status": "pending",
      "response_message": null,
      "created_at": "2026-05-25T10:00:00.000Z",
      "updated_at": "2026-05-25T10:00:00.000Z",
      "completed_at": null
    }
  ]
}
```

---

## 7. Codes erreur HTTP

| Code | Condition |
|------|-----------|
| 401 | `Authorization` absent, token invalide ou expiré |
| 403 | `role !== "rh"` (y compris manager) |
| 400 | UUID invalide, `status` interdit ou manquant, `response_message` > 5000 |
| 404 | Aucune ligne pour `id` + `enterprise_id` |

Format erreur :

```json
{
  "status": "error",
  "code": "FORBIDDEN",
  "message": "Rôle RH requis"
}
```

Nœud **Respond to Webhook** : `Response Code` = `{{ $json.__http || 400 }}`, body = JSON du nœud précédent (sans `__http` si souhaité).

---

## 8. Tests manuels (curl)

Remplacer `TOKEN` et `REQUEST_ID` :

```bash
# Liste
curl -s -H "Authorization: Bearer TOKEN" \
  "https://n8nprod.aphelionxinnovations.com/webhook/rh/requests?status=pending"

# Détail
curl -s -H "Authorization: Bearer TOKEN" \
  "https://n8nprod.aphelionxinnovations.com/webhook/rh/requests/REQUEST_ID"

# Décision
curl -s -X PATCH -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"accepted","response_message":"Validée par RH"}' \
  "https://n8nprod.aphelionxinnovations.com/webhook/rh/requests/REQUEST_ID"

# Historique
curl -s -H "Authorization: Bearer TOKEN" \
  "https://n8nprod.aphelionxinnovations.com/webhook/rh/requests/REQUEST_ID/actions"
```

---

## 9. Frontend (hors scope workflow, référence)

Variables d’environnement suggérées (`.env`) :

```env
# WF_RH_Requests_Decision — RH uniquement
# VITE_RH_REQUESTS_URL=/webhook/rh/requests
```

Le manager continue d’utiliser `VITE_RH_ACTIONS_URL` → `/webhook/api/rh/actions` (`WF_Manager_RH_Actions`).

---

## 10. Activation

1. Importer / construire le workflow dans n8n selon le graphe ci-dessus.
2. Coller les scripts `copilot-ui/n8n/WF_RH_Requests_Decision-*.js`.
3. Coller les SQL `copilot-ui/docs/n8n/WF_RH_Requests_Decision-*.sql`.
4. **Save** puis **Activate**.
5. Vérifier avec un JWT `role: "rh"` et `enterprise_id` valide.
