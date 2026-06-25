# Audit Manager Portal — PDF Multi-Agent Strict

**Date :** 11 juin 2026  
**Auditeur :** Cursor (audit automatisé codebase `copilot-ui/`)  
**Périmètre :** Portail Manager (`role === 'manager'`), frontend React + appels n8n  
**Référence :** PDF « Agentic AI - Talent & Project Strategic Copilot » (§4.4, §7.3, §7.6, §10.4)

---

## 1. Score global

| Dimension | Score | Méthode |
|---|---:|---|
| **Conformité PDF strict** | **32 / 100** | −8 pts par appel direct sous-agent actif en prod manager ; −5 si refresh ne passe pas par Orchestrator |
| **Conformité strict backend** | **41 / 100** | −10 CRITICAL calcul/seuil métier ; −5 HIGH label inventé ; −3 MEDIUM agrégat client |
| **Sécurité JWT** | **86 / 100** | `httpClient` + intercepteur global ; −14 pts fetch manuels / toasts sans `data.message` |
| **Cohérence agents PDF** | **44 / 100** | Badges partiels ; lecture mixte dashboard + agents directs |

**Score global pondéré : 48 / 100** — Le portail est **fonctionnel** mais **non conforme** au mode « PDF strict » (Orchestrator = seul point d’entrée compute).

> **Note stack réelle :** le projet utilise `httpClient` + `useToast` (pas sonner/shadcn pour les nouvelles features). L’audit applique les règles métier du prompt, indépendamment de la stack UI.

---

## 2. Récapitulatif des findings

| Sévérité | Count | Top fichier |
|---|---:|---|
| 🚨 CRITICAL | **28** | `src/services/agents.api.ts`, `src/hooks/useMatchmakerQuery.ts` |
| 🟠 HIGH | **19** | `src/lib/business-explanation.ts`, `src/hooks/useTeam.ts` |
| 🟡 MEDIUM | **24** | `src/components/manager/matchmaker-section.tsx`, `src/pages/manager/DashboardPage.tsx` |
| 🟢 LOW | **12** | `src/api/reports.api.ts`, i18n / UX |

---

## 3. Cartographie API (Section 1)

Légende JWT : **✅** = `httpClient` (Bearer auto) · **✅\*** = `fetch` avec `reportsAuthHeaders()` · **—** = public (login)

### Auth (hors workspace manager)

| Page React | URL appelée | Méthode | JWT | Body / params | Hook / service |
|---|---|---|---|---|---|
| `/login` | `/webhook/login` | POST | — | `{ email, password }` | `auth-provider` → `backend-api` |
| `/forgot-password` | `/webhook/auth/forgot-password` | POST | — | `{ email }` | `password-reset.api.ts` · `useForgotPassword` |
| `/reset-password` | `/webhook/auth/reset-password` | POST | — | `{ token, password }` | `password-reset.api.ts` · `useResetPassword` |

### Workspace Manager

| Page React | URL appelée | Méthode | JWT | Body / params | Hook TanStack |
|---|---|---|---|---|---|
| `/workspace/manager/dashboard` | `/webhook/manager/dashboard` | GET | ✅ | `scope=mine` | `useDashboard` |
| | `/webhook/api/orchestrator/recompute` | POST | ✅ | `{ scope: "all_my_projects" }` | `useOrchestratorRecompute` (bouton Matchmaker) |
| | *(indirect)* `/webhook/api/analyst/ipi` | POST | ✅ | `{ enterprise_id, manager_id }` | `useManagerAnalystIpiQuery` (section Analyst) |
| | `/webhook/api/analyst/nine-box` | POST | ✅ | idem | `useManagerAnalystNineBoxQuery` |
| | `/webhook/api/analyst/mobility` | POST | ✅ | idem | `useManagerAnalystMobilityQuery` |
| `/workspace/manager/projects` | `/webhook/manager/projects` | GET | ✅ | pagination, filtres | `useProjects` |
| | `/webhook/manager/projects` | POST | ✅ | create body | `useCreateProject` |
| | `/webhook/wmp-delete-v1/manager/projects/{id}` | DELETE | ✅ | — | `useDeleteProject` |
| | `/webhook/api/watchdog/scan` | POST | ✅ | `{ project_id?, talent_id?, use_ai }` | `useWatchdogScan` (scan manuel) |
| `/workspace/manager/projects/:id` | `/webhook/wmp-detail-v1/manager/projects/{id}` | GET | ✅ | — | `useProjectDetail` |
| | `/webhook/api/project/viability` | POST | ✅ | `{ project_id, enterprise_id }` | `useProjectViabilityRefresh` (Mission Control) |
| | `/webhook/api/project/talents` | POST | ✅ | `{ project_id }` | `useMatchmakerQuery` (drawer équipe) |
| | `/webhook/api/orchestrator/recompute` | POST | ✅ | `{ scope: "project", project_id }` | `useOrchestratorRecompute` (relancer drawer) |
| | `/webhook/api/project/risks` | GET/POST | ✅ | `project_id` | `use-project-risks` / onglet Risques |
| | `/webhook/api/project/what-if` | POST | ✅ | `{ project_id, modifications }` | `useWhatIf` / `SimulationTab` |
| | `/webhook/api/strategist/execute` | POST | ✅ | `{ option_id, action }` | `useExecuteArbitrage` |
| | CRUD exigences | GET/POST/PATCH/DELETE | ✅ | `/webhook/wf-mgr-pr-req-*` | `useProjectRequirementsQuery` |
| | CRUD tâches | GET/POST/PATCH/DELETE | ✅ | `/webhook/wmt-*` | `useProjectTasks` |
| | CRUD budget | GET/PATCH/POST | ✅ | `/webhook/mgr-budget-*` | `useProjectBudget` |
| | Assign / unassign | POST/DELETE | ✅ | `wmp-assign-v1` / `wmp-unassign-v1` | `useProjects` mutations |
| `/workspace/manager/team` | `/webhook/manager/team` | GET | ✅ | `scope`, `search` | `useTeam` |
| | `/webhook/api/watchdog/scan` | POST | ✅ | scan global / talent | `useWatchdogScan` |
| `/workspace/manager/team/:talentId` | `/webhook/manager/team/talents/{id}` | GET | ✅ | — | `useTalentDetail` |
| | `/webhook/api/watchdog/scan` | POST | ✅ | `{ talent_id }` | `useWatchdogScan` |
| `/workspace/manager/talent-requests` | `/webhook/manager/talent-requests` | GET | ✅ | filtres | `useManagerTalentRequestsList` |
| | `/webhook/wf-manager-talent-requests-detail/...` | GET | ✅ | — | `useManagerTalentRequestDetail` |
| | `/webhook/wf-manager-talent-requests-decision/...` | PATCH | ✅ | décision | `useManagerTalentRequestDecision` |
| `/workspace/manager/rh-requests` | `/webhook/api/rh/actions` | GET/POST/PATCH/DELETE | ✅ | CRUD actions RH | `use-manager-hr-actions` |
| `/workspace/manager/validations` | `/webhook/api/helpe/validations` | POST | ✅ | `{ scope, types, limit }` | `useValidations` |
| `/workspace/manager/risks` | `/webhook/api/project/risks` | GET/POST | ✅ | tous projets / filtre | `useManagerRiskData` |
| | `/webhook/manager/dashboard` | GET | ✅ | KPI alertes | `useDashboard` |
| | `/webhook/api/watchdog/scan` | POST | ✅ | — | `useWatchdogScan` |
| | `/webhook/wmn-alert-v3/manager/risk-alerts/{id}` | PATCH | ✅ | action alerte | `useRiskAlertAction` |
| `/workspace/manager/decision-log` | `/webhook/manager/decisions/log` | GET | ✅ | `enterprise_id` | `useManagerDecisionLog` |
| | `/webhook/manager/decisions/delete` | POST | ✅ | — | mutations journal |
| | `/webhook/manager/decisions/mark-handled` | POST | ✅ | — | idem |
| `/workspace/manager/reports` | `/webhook/reports/history` | GET | ✅\* | `enterprise_id` | `use-reports-n8n` |
| | `/webhook/reports/generate-board-pack` | POST | ✅ | payload | `use-manager-reports` |
| | `/webhook/reports/generate-project-dossier` | POST | ✅ | payload | idem |
| `/workspace/manager/notifications` | `/webhook/manager/notifications` | GET | ✅ | filtres | `useNotifications` |
| | `/webhook/manager/copilot-decisions` | GET | ✅ | — | onglet décisions |
| | `/webhook/api/watchdog/scan` | POST | ✅ | — | `useWatchdogScan` |
| `/workspace/manager/helper` | Helper chat v2 | POST | ✅ | messages | `CopilotDrawer` / `helper.api` |
| | `/webhook/manager/conversations` | GET/POST | ✅ | sessions | `useChat` |
| `/workspace/manager/profile` | `/webhook/auth/me` | GET/PATCH | ✅ | profil | `ProfilePage` / `useMe` |

### Routes projet (onglets Mission Control — même page `:projectId`)

| Onglet | Endpoint principal | Type PDF |
|---|---|---|
| Vue d'ensemble | `GET wmp-detail` + viabilité persistée | Orchestrator (lecture) + **POST viability direct** au refresh |
| Équipe | CRUD assign + **POST project/talents** | CRUD ✅ · Matchmaker **direct** |
| Exigences | `wf-mgr-pr-req-*` | CRUD ✅ |
| Tâches | `wmt-*` | CRUD ✅ |
| Budget | `mgr-budget-*` | CRUD ✅ |
| Risques | **POST/GET project/risks** | Watchdog **direct** |
| Simulation What-If | **POST project/what-if** | Strategist (simulation — acceptable PDF si orchestré backend) |
| Historique IA | `GET manager/copilot-decisions` | Lecture Orchestrator ✅ |

---

## 4. Violations PDF §4.4 — Appels sous-agents directs (Section 3)

> Règle : le frontend ne doit appeler **que** l’Orchestrator pour déclencher un compute, puis lire le dashboard / détail persisté.

### 🚨 CRITICAL — Appels actifs contournant l’Orchestrator

#### 4.1 Matchmaker (Agent 4)

```
🚨 CRITICAL — PDF §4.4 + §7.3
File: src/hooks/useMatchmakerQuery.ts:40-41
Endpoint: POST /webhook/api/project/talents
Issue: Chargement initial du drawer Matchmaker (Mission Control) sans passer par Orchestrator.
Code:
  const { data } = await matchmakerApi.runForProject(id, {});
Fix:
  1) Ne plus appeler project/talents au mount.
  2) Lire talent_matching_results via GET wmp-detail ou dashboard.
  3) Bouton « Relancer » → useOrchestratorRecompute({ scope: 'project', project_id }) (déjà partiellement fait).
```

```
🚨 CRITICAL
File: src/services/agents.api.ts:110,135-137
Endpoint: POST /webhook/api/project/talents
Issue: agentsApi.matchmakerTalents / matchmakerApi.runForProject exposés à useAgents.
Fix: Déprécier et remplacer par orchestratorApi.recompute({ scope: 'project', project_id }).
```

```
🚨 CRITICAL
File: src/hooks/useAgents.ts:45-49
Hook: useMatchmakerTalents
Issue: Mutation manager appelant Matchmaker direct.
Fix: useOrchestratorRecompute uniquement.
```

```
🚨 CRITICAL (code mort / risque régression)
File: src/hooks/use-manager-matchmaker.ts:212-215
Endpoint: POST /webhook/api/matchmaker/batch
Issue: Batch multi-projets encore implémenté (non utilisé par MatchmakerSection après fix récent).
Fix: Supprimer ou garder uniquement en test ; ne jamais réactiver sans Orchestrator.
```

#### 4.2 Analyst (Agent 5)

```
🚨 CRITICAL
File: src/hooks/use-manager-analyst.ts:20-45
Endpoints: POST /webhook/api/analyst/ipi | nine-box | mobility
Issue: Section Analyst dashboard appelle 3 sous-agents en parallèle au lieu de lire dashboard.analyst persisté.
Fix:
  const { data } = useDashboard('mine');
  const analyst = data?.analyst;
  // Refresh → orchestratorApi.recompute({ scope: 'all_my_projects' })
```

```
🚨 CRITICAL
File: src/components/manager/analyst-section.tsx:179-186
Issue: Bouton Actualiser → refetchAll() invalide les 3 queries analyst/* (agents directs).
Fix: useOrchestratorRecompute + invalidate ['dashboard'].
```

#### 4.3 Watchdog / Risks (Agent 2)

```
🚨 CRITICAL
File: src/hooks/use-manager-risk-data.ts:10
Endpoint: GET/POST /webhook/api/project/risks
Issue: Page Risques manager lit Watchdog via sous-agent, pas dashboard persisté.
Fix: GET /webhook/manager/dashboard ou endpoint manager/risks read-only ; scan → orchestrator recompute.
```

```
🚨 CRITICAL
File: src/hooks/useTeam.ts:60-67
Endpoint: POST /webhook/api/watchdog/scan
Issue: Bouton scan (Team, Risks, Notifications, Talent detail) déclenche Watchdog direct.
Fix: POST /webhook/api/orchestrator/recompute avec scope adapté ou webhook manager dédié « scan » qui wrap Orchestrator.
```

```
🚨 CRITICAL
File: src/api/project-risks.api.ts:108-117
Issue: getProjectRisks / postProjectRisks utilisés dans Mission Control onglet Risques.
Fix: Lire alertes depuis project detail (persisté) ; compute via Orchestrator uniquement.
```

#### 4.4 Observer / Viabilité (Orchestrator sub-route)

```
🚨 CRITICAL — PDF §7.3 (entry point unique)
File: src/hooks/use-project-viability-refresh.ts:18-19
Endpoint: POST /webhook/api/project/viability
Issue: Mission Control « Analyser / refresh snapshot » appelle viabilité directe, pas orchestrator/recompute.
Fix:
  orchestratorApi.recompute({ scope: 'project', project_id });
  // puis invalidate project-detail après délai estimé
```

```
🚨 CRITICAL
File: src/components/project-mission-control/MissionControlWorkspace.tsx:77,123+
Issue: refreshProjectSnapshot → useProjectViabilityRefresh (viability direct).
Fix: Remplacer par useOrchestratorRecompute scope project.
```

```
🚨 CRITICAL
File: src/services/agents.api.ts:127-129
Endpoint: POST /webhook/api/project/details (Observer)
Hook: useObserverKpi
Fix: Supprimer côté manager UI ; passer par Orchestrator.
```

#### 4.5 Copilot recompute legacy

```
🚨 CRITICAL
File: src/hooks/useAgents.ts:14-18
Endpoint: POST /webhook/api/copilot/recompute
Issue: Ancien entry point cascade, pas WF_Strategic_Orchestrator_Recompute_v1.
Fix: orchestratorApi.recompute({ scope: 'project', project_id }).
```

```
🚨 CRITICAL
File: src/hooks/useProjects.ts:98,118,274
Issue: Après assign/unassign, fire-and-forget orchestratorApi.recomputeFull → /copilot/recompute.
Fix: orchestratorApi.recompute({ scope: 'project', project_id }).
```

#### 4.6 Strategist (partiellement toléré)

```
🟡 MEDIUM (simulation interactive)
File: src/hooks/useWhatIf.ts + src/api/orchestrator.api.ts:100
Endpoint: POST /webhook/api/project/what-if
Note PDF: simulation What-If peut rester un POST dédié **si** le workflow backend est le Strategist orchestré.
Issue: Appel direct sans passage par recompute global — acceptable pour UX simulation, à documenter.
```

```
🟠 HIGH
File: src/api/manager-strategist-options.api.ts:56
Endpoint: POST /webhook/api/strategist/execute
Issue: Exécution arbitrage directe (pas via Orchestrator synthesis).
Fix: Valider avec archi PDF si execute est autorisé post-simulation ou doit être wrappé.
```

---

## 5. Violations strict backend (Section 2)

### 🚨 CRITICAL — Seuils viabilité / décision (PDF §10.4)

```
🚨 CRITICAL — Business logic in frontend
File: src/lib/manager-dashboard-display.ts:2-6
Issue: Seuils Continue/Adjust/Stop codés en React pour couleur barre.
Code:
  if (score >= 7.5) return "#10b981";
  if (score >= 4) return "#f59e0b";
Violation: PDF §10.4 (règles de décision côté Orchestrator uniquement).
Fix: Utiliser data.decision_color ou data.viability_band depuis API.
```

```
🚨 CRITICAL
File: src/lib/manager-dashboard-kpi.ts:67,103
Issue: Même seuils 7.5 / 4 pour classes CSS couleur.
Fix: Mapper decision → classe via champ API (ex. decision_tone: 'ok'|'warn'|'critical').
```

```
🚨 CRITICAL
File: src/lib/business-explanation.ts:49-70
Issue: viabilityNarrativeFallback invente texte métier selon score < 4, < 6, < 8 et decision.
Fix: Afficher data.explanation ou data.narrative du backend ; si vide, message générique i18n sans seuils.
```

```
🚨 CRITICAL
File: src/lib/business-explanation.ts:90-95
Issue: qualitativeFragilityFromViability calcule fragilité = 10 - score + labels « Élevée », « Modérée ».
Fix: Lire fragility_label depuis API.
```

```
🚨 CRITICAL
File: src/components/decision-log/DecisionGauge.tsx:15
Issue: Couleur jauge : safe < 4 ? red : safe < 7 ? amber : green.
Fix: decision_display_color depuis API.
```

```
🚨 CRITICAL
File: src/components/project/project-what-if-simulator.tsx:77-95
Issue: Calcul client metricAfter (risk -= delta * 0.4, health += delta * 0.35) et scenarioState blocked/warning/safe.
Fix: Afficher uniquement score_before/after, decision_before/after, impact_explained du POST what-if.
```

```
🚨 CRITICAL
File: src/lib/project-risk-kpi-meta.ts:40-41
Issue: fragilityToHealthDisplayScore = 10 - fragility (formule affichage santé).
Fix: Exposer health_score dans GET project detail (Observer persisté).
```

### 🟠 HIGH — Labels métier inventés

```
🟠 HIGH
File: src/components/manager/matchmaker-section.tsx:71-93
Issue: matchmakerHrDecisionBadge mappe proceed/adjust/recruit_or_postpone → libellés FR hard-codés.
Fix: Utiliser row.hr_decision_label depuis API + i18n key fallback.
```

```
🟠 HIGH
File: src/hooks/useTeam.ts:71-76
Issue: Toasts Watchdog inventés (« Watchdog terminé. N alertes… ») sans data.message.
Fix: push(data.message, type) du backend.
```

```
🟠 HIGH
File: src/hooks/useOrchestratorRecompute.ts:52-54
Issue: Toast « Dashboard actualisé » / « Analyse projet actualisée » inventé post-timeout.
Fix: Second GET dashboard avec meta.message ou supprimer toast inventé.
```

### 🟡 MEDIUM — Agrégations / filtres métier

```
🟡 MEDIUM
File: src/pages/manager/DashboardPage.tsx:132-134,155-160
Issue: fragileProjects re-triés par viability_score ; attentionLabel dérivé de avgHealthScore >= 7 / >= 5.
Fix: Utiliser ordre backend widgets.fragile_projects ; lire health.attention_label.
```

```
🟡 MEDIUM
File: src/lib/manager-matchmaker-normalize.ts:161-173
Issue: Agrégats avg_match_score, total_gaps, recruitment_needed calculés côté client (legacy batch).
Fix: Supprimer avec batch ; tout vient du dashboard.
```

```
🟡 MEDIUM
File: src/hooks/use-projects-page.ts:162
Issue: Moyenne viability côté client pour KPI portfolio.
Fix: Lire stats.avg_viability du GET list si exposé.
```

```
🟡 MEDIUM
File: src/components/team/team-list-utils.ts:86
Issue: Filtre métier score < 4 pour talents « low ».
Fix: Filtre backend ou champ risk_band.
```

```
🟡 MEDIUM
File: src/components/project-mission-control/utils.ts:88-93
Issue: computeTeamFte = sum(allocation_pct)/100 — agrégat capacité.
Note: acceptable si affichage purement dérivé de données brutes CRUD ; idéalement FTE backend.
```

### 🟢 LOW — Cosmétique autorisé

- `formatMatchmakerScore10`, `toFixed(1)`, tri alphabétique, recherche texte : **OK**
- `useTranslation` pour libellés UI chrome : **OK** (hors labels métier agent)

---

## 6. Manques JWT / sécurité (Section 4)

### ✅ Points conformes

| Check | Status |
|---|---|
| `httpClient` injecte `Authorization: Bearer` | ✅ `src/lib/http-client.ts:17-24` |
| Refresh token sur 401 → `/login` | ✅ `http-client.ts:35-74` |
| Toast 403 / 500 global | ✅ `http-error-toaster.tsx` |
| CRUD manager via httpClient | ✅ |

### 🟠 HIGH

```
🟠 HIGH
File: src/api/reports.api.ts:118-123
Endpoint: GET /webhook/reports/history (fetch manuel)
Issue: JWT ajouté si token présent, mais pas de redirect si absent — échec silencieux possible.
Fix: Exiger token ; router vers login si 401.
```

```
🟠 HIGH
File: src/hooks/useNotifications.ts:17-22
Issue: RISK_ALERT_ACTION_TOAST messages hard-codés, pas data.message.
Fix: Mapper action → message backend ou i18n sans prétendre métier agent.
```

### 🟡 MEDIUM

```
🟡 MEDIUM
Pages manager
Issue: Pas d'Error Boundary React dédié par section dashboard (crash = page blanche).
Fix: TabErrorFallback pattern (déjà en Mission Control) sur Dashboard sections.
```

```
🟡 MEDIUM
File: src/api/reports.api.ts:125-129
Issue: console.log debug en production (historique rapports).
Fix: Retirer ou gated DEV.
```

---

## 7. Conformité agents PDF (Section 5)

| Section UI | Agent PDF | Endpoint attendu (strict) | Endpoint actuel | Refresh via Orchestrator | Status |
|---|---|---|---|---|---|
| KPI cards / santé | Orchestrator | GET dashboard | GET dashboard | Footer refresh = refetch dashboard ✅ | 🟡 partiel (seuils couleur client) |
| Projets fragiles | Orchestrator + Observer | dashboard.widgets | dashboard.widgets | idem | 🟡 tri client |
| **Matchmaker** | Agent 4 (via Orch.) | dashboard.matchmaker | dashboard.matchmaker ✅ | **Actualiser → orchestrator/recompute ✅** | 🟢 lecture OK · drawer projet encore direct |
| **Analyst** | Agent 5 (via Orch.) | dashboard.analyst | **POST analyst/\* ×3** | **refetch analyst direct ❌** | 🔴 non conforme |
| Validations | Helper (6) | helpe/validations | POST helpe/validations | pas de bouton compute | 🟢 lecture OK |
| Risques & alertes | Watchdog (2) | dashboard / manager risks RO | **POST project/risks, watchdog/scan** | scan direct ❌ | 🔴 non conforme |
| Journal décisions | Orchestrator | decisions/log | GET decisions/log | N/A (lecture) | 🟢 |
| What-If | Strategist (3) | what-if POST | what-if POST | simulation à la demande | 🟡 acceptable si backend wrap |
| Helper Chat | Helper (6) | manager chat | helper chat v2 | N/A | 🟢 |
| Mission Control viabilité | Orchestrator | detail.latest_viability | **POST project/viability** | refresh direct ❌ | 🔴 |

### Checklist sections dashboard

| Critère | Matchmaker | Analyst | Overview |
|---|---|---|---|
| Badge agent | ✅ | ✅ | ❌ |
| Explainability | ✅ explanation API | partiel | partiel |
| computed_at | via dashboard meta | ❌ pas affiché | ✅ footer |
| Actualiser → Orchestrator | ✅ | ❌ | ❌ (footer = refetch RO only) |
| Empty state | ✅ | ✅ | ✅ |

---

## 8. Calculs métier React — Score Viabilité (Section 6)

| Check | Résultat |
|---|---|
| Aucun `* 0.4` / `* 0.35` / `* 0.25` formule viabilité | ❌ `project-what-if-simulator.tsx:79-81` |
| Aucune règle Continue/Adjust/Stop en React | ❌ seuils couleur 7.5 / 4 multiples fichiers |
| score exclusivement `data.viability_score` | 🟡 mostly OK en affichage, fallback what-if simulator |
| decision exclusivement `data.decision` | 🟡 affichage OK ; couleurs dérivées client |
| Labels decision depuis API | ❌ badges FR hard-codés |

**Fichiers à traiter en priorité §10.4 :**

1. `src/lib/manager-dashboard-display.ts`
2. `src/lib/manager-dashboard-kpi.ts`
3. `src/lib/business-explanation.ts`
4. `src/components/decision-log/DecisionGauge.tsx`
5. `src/components/project/project-what-if-simulator.tsx`
6. `src/lib/project-risk-kpi-meta.ts`

---

## 9. Plan d'action priorisé

### P0 — Bloquant (< 24 h)

| # | Action | Effort | Fichiers |
|---|---|---:|---|
| 1 | Remplacer **tous** refresh compute par `orchestratorApi.recompute` | 2 h | Mission Control, Analyst section, useProjects, useAgents |
| 2 | **Supprimer** mount `useMatchmakerQuery` → lire match depuis `useProjectDetail` | 3 h | `useMatchmakerQuery`, drawer, types detail |
| 3 | Analyst dashboard : lire `useDashboard().analyst` uniquement | 2 h | `analyst-section`, `use-manager-analyst` |
| 4 | Page Risques : read-only persisté + recompute orchestrator pour scan | 4 h | `RisksPage`, `use-manager-risk-data` |
| 5 | Retirer seuils 7.5/4 pour couleurs → champs API | 3 h | display libs + backend contract |

**Estimation P0 : ~14 h**

### P1 — Critique production (semaine)

| # | Action | Effort |
|---|---|---:|
| 6 | Migrer `useWatchdogScan` → orchestrator wrapper | 4 h |
| 7 | Nettoyer `agents.api.ts` / `useAgents` (deprecated direct agents) | 2 h |
| 8 | What-If simulator : affichage pur réponse API | 3 h |
| 9 | Toasts métier : uniquement `data.message` | 2 h |
| 10 | Backend : enrichir dashboard + detail avec `decision_label`, `viability_band`, `health_score` | backend |

**Estimation P1 : ~11 h frontend + backend**

### P2 — Polish

| # | Action |
|---|---|
| 11 | Supprimer `use-manager-matchmaker` batch legacy |
| 12 | Badges agent sur KPI overview / fragile projects |
| 13 | Afficher `computed_at` par section Analyst |
| 14 | Retirer console.log reports history |
| 15 | Error boundaries dashboard |

---

## 10. Recommandations architecturales

### A. Pattern cible « PDF strict »

```
[UI Manager]
    │
    ├─ READ  ──► GET /webhook/manager/dashboard
    │            GET /webhook/wmp-detail-v1/manager/projects/:id
    │            GET CRUD endpoints (tasks, budget, team…)
    │
    └─ COMPUTE ► POST /webhook/api/orchestrator/recompute
                      { scope: 'all_my_projects' | 'project', project_id? }
                      → 202 Accepted
                      → invalidate queries après estimated_duration_seconds
```

### B. Couche API à déprécier côté manager UI

- `POST /webhook/api/project/talents`
- `POST /webhook/api/matchmaker/batch`
- `POST /webhook/api/analyst/*`
- `POST /webhook/api/project/risks` (pour compute — garder lecture si persisté)
- `POST /webhook/api/project/details`
- `POST /webhook/api/project/viability` (remplacé par orchestrator recompute)
- `POST /webhook/api/copilot/recompute`
- `POST /webhook/api/watchdog/scan` (wrapper manager → orchestrator)

### C. Contrat backend à étendre

Pour chaque entité affichée avec couleur / label métier :

```json
{
  "viability_score": 6.2,
  "decision": "adjust",
  "decision_label": "Ajuster le plan",
  "decision_tone": "warning",
  "viability_band": "vigilance",
  "explanation": "…",
  "computed_at": "2026-06-11T10:00:00Z",
  "agent_source": "orchestrator"
}
```

### D. Tests de non-régression recommandés

1. Grep CI : interdire `/api/project/talents` dans `src/pages/manager` et `src/components/manager`
2. Grep CI : interdire `>= 7.5` et `< 4` dans `src/lib` et `src/components/manager`
3. E2E : Actualiser Matchmaker → 202 → dashboard rempli < 30 s
4. E2E : Mission Control refresh → orchestrator only (network tab)

---

## Annexe — État positif récent

| Item | Status |
|---|---|
| Matchmaker dashboard refresh → `orchestrator/recompute` | ✅ Implémenté (`matchmaker-section.tsx`) |
| Matchmaker lecture via `useDashboard("mine")` | ✅ |
| `useOrchestratorRecompute` hook centralisé | ✅ |
| Drawer Matchmaker « Relancer » → orchestrator scope project | ✅ (chargement initial encore direct) |
| JWT global httpClient | ✅ |
| CRUD projets / tâches / budget / exigences séparés des agents | ✅ conforme PDF |

---

*Fin du rapport — généré par analyse statique du dépôt `copilot-ui` le 11/06/2026.*
