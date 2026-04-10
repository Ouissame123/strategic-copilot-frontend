# Strategic Copilot — interface web de pilotage stratégique

Application **React / TypeScript** pour suivre un portefeuille de projets, tracer des décisions stratégiques (Continue / Adjust / Stop) et proposer des **parcours métier** (RH, Manager, Talent), avec **assistant contextuel** (Copilot), **internationalisation** (FR / EN / AR) et **thème** clair ou sombre.

> **À l’attention de l’encadrant / du jury** : une **fiche projet intégrée** est disponible dans l’application (menu latéral : **« Fiche projet »** / route `/projet`). Elle résume les objectifs, la valeur ajoutée, la stack et l’architecture.

---

## Objectifs du livrable

- Interface **SaaS** cohérente (navigation, cartes, tableaux, états chargement / vide / erreur).
- **Intégration API** REST vers un backend réel (ex. portefeuille, utilisateurs, auth) via `VITE_API_BASE_URL`.
- **Rôles** : **RH**, **manager**, **talent** — droits et navigation alignés sur le serveur ; **seul le RH** peut utiliser le sélecteur de perspective métier en en-tête.
- **Comptes** : pas de création de compte côté interface grand public ; le **RH** provisionne les comptes (manager / talent) via l’API.
- **Accessibilité** : composants [React Aria](https://react-spectrum.adobe.com/react-aria/).
- **Qualité** : TypeScript strict, hooks, providers, séparation des responsabilités.

---

## Stack technique

| Domaine        | Choix |
|----------------|--------|
| UI             | React 19, React Aria Components |
| Build          | Vite 7 |
| Langage        | TypeScript |
| Routing        | React Router 7 |
| Styles         | Tailwind CSS v4 |
| i18n           | i18next |
| Icônes / base  | Untitled UI (starter kit) |

---

## Installation et exécution

```bash
npm install
npm run dev
```

Ouvrir [http://localhost:5173](http://localhost:5173).

Build de production :

```bash
npm run build
npm run preview
```

---

## Configuration du backend

1. Copier `.env.example` vers `.env`.
2. Définir **`VITE_API_BASE_URL`** avec l’URL de base de votre API (sans slash final), par exemple `https://api.example.com`.

L’authentification (**JWT** ou session selon votre API), les rôles et les statuts utilisateurs sont entièrement portés par le **backend** et la base de données. Le frontend n’expose aucun parcours d’auto-création de compte.

---

## Structure utile du dépôt

| Dossier / fichier | Rôle |
|-------------------|------|
| `src/pages/` | Écrans (dashboard, projets, workspaces, décisions, utilisateurs, **fiche projet** …) |
| `src/layouts/` | Layout principal, **configuration de navigation** par rôle workspace |
| `src/providers/` | Auth, thème, toasts, copilot |
| `src/hooks/` | Données (portfolio, utilisateurs), médias, workspace |
| `src/utils/apiClient.ts` | Appels HTTP vers l’API |
| `src/i18n.ts` | Traductions FR / EN / AR |

---

## Perspectives d’évolution

- **OAuth2** / renforcement sécurité des flux déjà JWT côté serveur.
- **Tests** automatisés (Vitest, Playwright).
- **CI/CD** et déploiement.
- Couverture **accessibilité** (audit) et **performance** (Lighthouse).

---

## Licence — composants Untitled UI

Ce dépôt s’appuie sur le **starter kit Untitled UI** (Vite). Les composants open-source Untitled UI sont sous **licence MIT** ; voir la [documentation Untitled UI](https://www.untitledui.com/react) pour les conditions des offres Pro éventuelles.
