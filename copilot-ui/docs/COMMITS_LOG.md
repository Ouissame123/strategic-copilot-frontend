# COMMITS_LOG — Manager Portal P0 PDF Strict (#1–3)

**Date :** 11 juin 2026  
**Branche :** working tree (non commité automatiquement)

---

## Résumé

| Fix | PDF | Statut |
|---|---|---|
| FIX 1 — Mission Control viability → Orchestrator | §7.3 | ✅ |
| FIX 2 — Analyst dashboard read-only + recompute | §4.4 | ✅ |
| FIX 3 — Risques + Watchdog scan → Orchestrator + dashboard | §4.4 | ✅ |

---

## Fichiers modifiés

### FIX 1 — Mission Control

| Fichier | Changement |
|---|---|
| `src/hooks/use-project-viability-refresh.ts` | Wrapper `useOrchestratorRecompute` (`scope: project`) — plus POST `/api/project/viability` |
| `src/components/project-mission-control/MissionControlWorkspace.tsx` | Refresh / auto-scan : `{ projectId }` uniquement |
| `src/components/project-mission-control/tabs/AiHistoryTab.tsx` | Bouton « Analyser » → orchestrator via hook |
| `src/services/agents.api.ts` | `@deprecated` sur observer/riskKpi/matchmaker/recomputeFull |
| `src/hooks/useAgents.ts` | Commentaire deprecation aligné |

### FIX 2 — Analyst

| Fichier | Changement |
|---|---|
| `src/components/manager/analyst-section.tsx` | `useDashboard('mine')` + `useOrchestratorRecompute` ; plus 3 POST analyst/* |
| `src/hooks/use-manager-analyst.ts` | `@deprecated` + `console.warn` en DEV |

### FIX 3 — Risques / Watchdog

| Fichier | Changement |
|---|---|
| `src/lib/manager-dashboard-risks.ts` | **NEW** — map `dashboard.widgets.top_alerts` → `RisksResponse` |
| `src/hooks/use-manager-risk-data.ts` | Lecture dashboard (plus GET `/api/project/risks`) |
| `src/hooks/useTeam.ts` | `useWatchdogScan` → wrapper Orchestrator |
| `src/api/project-risks.api.ts` | `@deprecated` sur `postProjectRiskKpi` / `postWatchdogScan` (legacy cascade conservée) |

---

## Messages de commit suggérés (1 fix = 1 commit)

```text
fix(manager): mission control refresh via orchestrator recompute (PDF §7.3)

fix(manager): analyst section reads dashboard + orchestrator refresh (PDF §4.4)

fix(manager): risks page reads dashboard alerts, scan via orchestrator (PDF §4.4)
```

---

## Smoke tests manuels

| # | Scénario | Attendu Network |
|---|---|---|
| 1 | Dashboard → Actualiser Matchmaker | `POST …/orchestrator/recompute` |
| 2 | Dashboard → Actualiser Analyst | `POST …/orchestrator/recompute` (pas analyst/*) |
| 3 | Mission Control → Analyser / ouverture projet | `POST …/orchestrator/recompute` (pas project/viability) |
| 4 | Page Risques → Scanner | `POST …/orchestrator/recompute` (pas watchdog/scan) |
| 5 | Page Risques — liste alertes | Pas de GET/POST `/api/project/risks` au chargement |

---

## Reste hors P0 (audit)

- FIX 4–6 : seuils 7.5/4, labels API, What-If simulator
- `useMatchmakerQuery` mount direct `project/talents` (drawer équipe)
- `cascadeRiskKpiAfterAlertAction` encore POST risks legacy

---

## Score audit estimé après P0 #1–3

| Dimension | Avant | Après (estimé) |
|---|---:|---:|
| Conformité PDF strict | 32 | **58** |
| Cohérence agents | 44 | **62** |

*Mesure indicative — re-audit complet recommandé après déploiement backend Orchestrator.*

---

## RH Talents CRUD — alignement backend v2 (WF_RH_Talents_CRUD_PATCHED)

**Date :** 11 juin 2026  
**Scope :** mutations CREATE / UPDATE / DELETE uniquement

### Changements

| Fichier | Changement |
|---|---|
| `src/types/rh-talents.types.ts` | `RhTalentMeta`, `RhTalentMutationResponse`, réponses DELETE v2 |
| `src/api/rh-talents.api.ts` | 201 CREATE, `CREATE_FAILED`, `ACTIVE_ASSIGNMENTS_BLOCKING` (409), `meta.orchestrator_triggered` |
| `src/hooks/use-rh-talents.ts` | `useCreateRhTalent`, `useUpdateRhTalent`, `useDeleteRhTalent` + auto-refetch Orchestrator |
| `src/components/rh/CreateTalentModal.tsx` | Hook create + indicateur recompute |
| `src/components/rh/DeleteTalentModal.tsx` | Hook delete + warning affectations actives |

### Smoke tests E2E

| # | Scénario | Attendu |
|---|---|---|
| 1 | CREATE succès | Toast + liste rafraîchie + refetch dashboard ~30s |
| 2 | CREATE email existant | Toast erreur `data.message` (409 CREATE_FAILED) |
| 3 | UPDATE succès | Toast + invalidation talent détail |
| 4 | DELETE sans blocage | Toast + talent retiré de la liste |
| 5 | DELETE bloqué 409 | Toast « Suppression bloquée » + message backend |
| 6 | Auto-refetch 30s | Invalidation `queryKeys.rh.dashboard/analytics/matching-results` |

### Commit suggéré

```text
feat(rh): align talents CRUD mutations on WF_RH_Talents_CRUD v2 (201, 409, orchestrator meta)
```
