# Backend RH Copilot — vue d'ensemble (3 workflows n8n)

Documentation et scripts pour déployer **uniquement** les workflows RH Copilot, **sans** modifier :

- `WF_Manager_RH_Actions`
- `WF_RH_Requests_Decision`
- le frontend (`copilot-ui/src/...`)
- la logique auth globale (JWT existant)

| Workflow | Fichier détaillé | Routes webhook (sans `/webhook`) |
|----------|------------------|----------------------------------|
| `WF_RH_Conversations` | [WF_RH_Conversations.md](./WF_RH_Conversations.md) | `GET/PATCH rh/conversations` |
| `WF_RH_Chat` | [WF_RH_Chat.md](./WF_RH_Chat.md) | `POST rh/chat` |
| `WF_RH_Copilot` | [WF_RH_Copilot.md](./WF_RH_Copilot.md) | `POST rh/recommendations/generate` |

**Production (aligné frontend)** :

- `https://n8nprod.aphelionxinnovations.com/webhook/rh/chat`
- `https://n8nprod.aphelionxinnovations.com/webhook/rh/conversations`
- `https://n8nprod.aphelionxinnovations.com/webhook/rh/recommendations/generate`

---

## Tables existantes (aucune création)

| Table | Usage RH Copilot |
|-------|------------------|
| `public.helper_conversations` | Historique chat RH (`payload.scope = 'rh_copilot'`) |
| `public.helper_messages` | Messages user/assistant |
| `public.rh_actions` | Recommandations générées (`payload.source = 'rh_copilot'`) |
| `public.talents`, `project_assignments`, `talent_matching_results`, `projects` | Lecture signaux (chat + copilot) |

### Séparation Manager / RH

- Conversations **manager** : `project_id` renseigné, pas de `payload.scope = rh_copilot`.
- Conversations **RH** : `user_id` = JWT `sub`, `payload.scope = 'rh_copilot'`, filtre obligatoire dans toutes les requêtes SQL.

### Colonnes attendues (aligner si votre schéma diffère)

**`helper_conversations`** : `id`, `enterprise_id`, `user_id`, `project_id` (nullable), `title`, `status`, `payload` (jsonb), `last_message_at`, `created_at`, `updated_at`.

**`helper_messages`** : `id`, `conversation_id`, `role`, `content`, `created_at` + optionnel : `enterprise_id`, `intent`, `confidence`, `suggested_actions`, `sources`, `details`, `quick_replies`, `metadata` (jsonb). Si certaines colonnes manquent, stocker les métadonnées dans `metadata` / `payload` et adapter `WF_RH_Chat-insert-messages.sql`.

---

## Auth partagée (rh **ou** admin)

Fichiers Code communs (`copilot-ui/n8n/`) :

| Nœud | Fichier |
|------|---------|
| Auth RH/Admin | `WF_RH_Copilot-auth-rh-admin.js` |
| Error Respond | `WF_RH_Copilot-error-respond.js` |

Règles :

- Header `Authorization: Bearer <access_token>` obligatoire.
- Refus si token expiré, refresh token, ou `enterprise_id` absent dans le JWT.
- **Jamais** accepter `enterprise_id` dans le body.
- Toutes les requêtes SQL filtrent `$enterprise_id` depuis le JWT.

---

## Groq (HTTP Request n8n)

Configurer une credential **Groq API** (variable d'environnement n8n recommandée : `GROQ_API_KEY`).

**POST** `https://api.groq.com/openai/v1/chat/completions`

Body (depuis le champ `groq` des nœuds Code) :

```json
{
  "model": "llama-3.3-70b-versatile",
  "temperature": 0.2,
  "response_format": { "type": "json_object" },
  "messages": [ ... ]
}
```

En cas d'échec HTTP ou JSON invalide : basculer sur les nœuds **fallback déterministes** (chiffres issus de PostgreSQL uniquement).

---

## Déploiement rapide

1. Créer **3 workflows n8n** nommés exactement `WF_RH_Conversations`, `WF_RH_Chat`, `WF_RH_Copilot`.
2. Coller les scripts du dossier `copilot-ui/n8n/` et les SQL du dossier `copilot-ui/docs/n8n/`.
3. Renommer le nœud Route Parse en **`Route Parse`** (référence `$('Route Parse')` dans Auth).
4. Activer CORS sur n8nprod pour `localhost:5173` si appels directs depuis le navigateur.
5. Tester avec un JWT `role: rh` ou `admin` et `enterprise_id` présent.
