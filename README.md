# Boutica Desktop

Client Desktop (Electron + React + TypeScript) de **Boutica Cloud** (NestJS / Better Auth).
Aucune donnée locale ou simulée : toute opération métier est exécutée et confirmée par le serveur.

## Architecture
- `src/main` — processus principal : fenêtre sécurisée, authentification Better Auth, **proxy HTTP** vers `/api/v1/*`
  (le jeton de session ne quitte jamais ce processus), téléchargements de rapports, impression de reçus.
- `src/preload` — pont IPC minimal et typé (`window.bouticaDesktop`).
- `src/renderer` — interface React (pages, composants, store Zustand). Aucune requête réseau directe.
- `docs/` — audit, matrice des contrats API, plan, limitations.

## Prérequis
Node.js 22+. Une adresse de Boutica Cloud (par défaut `https://boutica-cloud.onrender.com`, modifiable dans
Paramètres ou via `BOUTICA_API_URL`). Un compte existant (la création de compte n'est pas exposée).

## Commandes
| Commande | Rôle |
|---|---|
| `npm install` | Installe les dépendances (génère le lockfile) |
| `npm run dev` | Vite + Electron en développement |
| `npm run lint` | Type-check (`tsc --noEmit`) |
| `npm run build` | Renderer (`dist/renderer`) + main/preload (`dist-electron`) |
| `npm start` | Build puis lance Electron |
| `npm run package` / `npm run make` | Packaging / installateurs (Electron Forge) |

## Sécurité
`contextIsolation`, `sandbox`, pas de `nodeIntegration`, CSP stricte (production), IPC validé (émetteur, chemins autorisés),
jeton chiffré par `safeStorage` si disponible, jamais dans le renderer.

## État
Voir `docs/FOUNDATION_AUDIT.md`, `docs/IMPLEMENTATION_PLAN.md` et surtout `docs/KNOWN_LIMITATIONS.md` : le code a fait l'objet
d'une revue statique mais **n'a pas été compilé ni exécuté** dans l'environnement de travail.
