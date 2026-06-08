# WF_RH_Copilot — POST /rh/recommendations/generate

Analyse des signaux RH (PostgreSQL), proposition Groq, normalisation, insertion `rh_actions` avec anti-doublon 24h.

**Distinct de** `WF_Manager_RH_Actions` (création par manager) et `WF_RH_Requests_Decision` (décision sur demandes managers).

---

## 1. Publication n8n

| Méthode | Path | `__op` |
|---------|------|--------|
| POST | `rh/recommendations/generate` | `GENERATE` |

URL prod : `https://n8nprod.aphelionxinnovations.com/webhook/rh/recommendations/generate`

Body : vide ou `{}` (aucun `enterprise_id`).

---

## 2. Signaux détectés (SQL)

Fichier : `WF_RH_Copilot-signals.sql` — param `$1 = enterprise_id`

| Signal | Règle SQL |
|--------|-----------|
| Surcharge talents | `SUM(allocation_pct) > 100` sur `project_assignments` actifs |
| Skill gaps | `talent_matching_results.gap_count > 0` |
| Contrats fin proche | `talents.contract_end_date` dans 60 jours |
| Demandes RH pending | `rh_actions.status = pending` et `payload.source <> rh_copilot` |
| Projets sous-dotés | projets `active` avec `< 2` talents affectés |

---

## 3. Graphe recommandé

```
[Webhook POST] ──► [Route Parse] ──► [JWT Decode] ──► [Auth RH Admin]
        └─ [Postgres Signals]
        └─ [Build Groq Prompt]
        └─ [HTTP Groq]
              ├─ OK ──► [Normalize Recommendations]
              └─ FAIL ──► [Fallback Recommendations] ──► [Normalize Recommendations]
        └─ IF recommendations.length > 0
              └─ Loop item
                    ├─ [Postgres Dedup Check]
                    ├─ IF no duplicate
                    │     └─ [Postgres INSERT action]
                    └─ (skip si doublon < 24h)
        └─ [Build Generate Response] ──► 200
```

### Fichiers Code

| Nœud | Fichier |
|------|---------|
| Route Parse | `WF_RH_Copilot-recommendations-route-parse.js` |
| Auth | `WF_RH_Copilot-auth-rh-admin.js` |
| Build Groq Prompt | `WF_RH_Copilot-build-groq-prompt.js` |
| Fallback | `WF_RH_Copilot-fallback-recommendations.js` |
| Normalize | `WF_RH_Copilot-normalize-recommendations.js` |
| Build Response | `WF_RH_Copilot-build-generate-response.js` |

### SQL

| Nœud | Fichier | Params |
|------|---------|--------|
| Signals | `WF_RH_Copilot-signals.sql` | `[enterprise_id]` |
| Dedup | `WF_RH_Copilot-dedup-check.sql` | `[enterprise_id, type, message, project_id]` |
| Insert | `WF_RH_Copilot-insert-action.sql` | `[enterprise_id, project_id, type, message, priority, payload]` |

**Payload insert** (jsonb) :

```json
{
  "source": "rh_copilot",
  "generated_at": "2026-05-25T12:00:00.000Z",
  "rationale": "..."
}
```

- `manager_id` = NULL (recommandation système RH).
- `status` = `pending`.
- Types autorisés : `skill_gap`, `reallocation`, `training`, `overload`, `recruitment`.
- Priorités : `urgent`, `normal`, `low`.

**Anti-doublon** : même `enterprise_id`, `type`, `message`, `project_id`, `payload.source = rh_copilot`, `created_at >= now() - 24h`.

---

## 4. Réponse 200

```json
{
  "status": "success",
  "workflow": "WF_RH_Copilot",
  "operation": "generate_recommendations",
  "llm_enriched": true,
  "signals_count": {
    "overloaded": 0,
    "skill_gaps": 0,
    "contracts_ending": 0
  },
  "proposed": 0,
  "created_count": 0,
  "created": [],
  "meta": {
    "api_version": "v1",
    "source_agent": "rh_copilot",
    "computed_at": "..."
  }
}
```

`signals_count` expose les 3 compteurs requis par le contrat frontend ; les autres signaux restent dans `signals` SQL pour le prompt Groq.

---

## 5. Nœuds `$()` à renommer

- `Auth RH Admin`
- `Build Groq Prompt`
- `Fallback Recommendations`
- `Normalize Recommendations`
