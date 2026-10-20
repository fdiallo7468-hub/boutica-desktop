# Boutica Desktop — Audit des fondations

Méthode : lecture complète des sources du Desktop (archive `boutica-desktop.zip`) et lecture de la documentation
publique du dépôt Cloud (`README.md`, `CHANGELOG.md`, `BOUTICA_V2_FINALIZATION_REPORT.md`).
**Limite de vérification** : les contrôleurs, DTO et le schéma Cloud n'ont pas pu être lus (GitHub refuse l'accès
automatisé aux pages d'arborescence et Render refuse les requêtes automatisées). Les contrats sont donc
« partiellement confirmés » (documentation) — voir `API_CONTRACT_MATRIX.md`.
**Aucun build, test ni installation n'a été exécuté** (bash sans accès réseau) : seule une analyse syntaxique
(transpilation TypeScript de tous les fichiers, 0 erreur de syntaxe) et une revue statique ont été faites.

## 1. État AVANT corrections

### Packaging / Electron
| # | Constat |
|---|---------|
| A1 | `package.json` sans `electron`, sans Electron Forge, sans makers ; scripts = Vite uniquement. Le projet ne pouvait ni démarrer comme application Electron ni être packagé. |
| A2 | `src/main` et `src/preload` n'étaient compilés par aucun script ; le main chargeait le preload via `__dirname + '/../preload/index.js'` (fichier jamais produit). |
| A3 | `forge.config.ts` référençait `./public/icon` (absent) et des makers non installés. |
| A4 | Dépendances d'AI Studio inutiles/risquées : `@google/genai`, `express`, `dotenv`, `tsx` ; `.env.example` demandait `GEMINI_API_KEY` ; `metadata.json` (capacité Gemini), dossier `.aistudio/` (captures), `bun.lock` obsolète ; `vite.config.ts` avec hacks `DISABLE_HMR`. |
| A5 | Vite sans `base: './'` : le renderer ne pouvait pas se charger via `file://`. |
| A6 | Le renderer appelait Cloud directement (`fetch` depuis `file://` → origine `null`) : bloqué par CORS dès que `CORS_ORIGIN` est restreint (Cloud échoue en fermé en production). |

### Sécurité Electron
| # | Constat |
|---|---------|
| S1 | `require('electron')` dans un `try/catch` avec types `any` ; aucun typage. |
| S2 | CSP `default-src 'self' 'unsafe-inline' …` très permissive. |
| S3 | IPC `print-receipt` : HTML arbitraire chargé dans une fenêtre sans `sandbox`, impression `silent: true`. |
| S4 | IPC `save-export-file` : écriture de données arbitraires sur disque, aucun contrôle d'émetteur. |
| S5 | Aucun contrôle d'émetteur IPC, aucun garde de navigation, pas d'instance unique. |

### Authentification et session
| # | Constat |
|---|---------|
| U1 | `App.tsx` **fabriquait une session de démonstration** (token `token-active-001`, boutique « biz-001 ») quand aucun token n'existait ou avec `?autostart=1`. |
| U2 | `LoginPage` : identifiants préremplis (`demo@boutica.ci`) et bouton « Accès immédiat » créant une session fictive. |
| U3 | Token de session stocké dans `localStorage` (lisible par tout JS de la page). |
| U4 | `signInEmail` acceptait n'importe quelle réponse 2xx ; `getSession` considérait toute réponse 2xx comme session valide sans contrôler les données. |
| U5 | `signOut` effaçait l'état même si le serveur n'avait pas confirmé, sans le signaler. |

### Fonctionnalités métier simulées
| # | Constat |
|---|---------|
| F1 | `PosSalePage` : si `createSale()` échoue, **une vente fictive** (`vnt-<date>`, boutique `biz-001`) était fabriquée, le reçu ouvert et le panier vidé avec « Vente confirmée et enregistrée ! ». |
| F2 | `PosSalePage` : catalogue de repli codé en dur (6 articles). Modes de paiement (Espèces/Carte/Virement) affichés mais jamais envoyés ni persistés. Clé d'idempotence régénérée à chaque tentative (rejeu = doublon possible). Reçu construit à partir des prix du panier, pas des montants serveur. |
| F3 | `InventoryPage` : données de repli ; en cas d'échec d'ajustement, le stock local était modifié avec le toast « Stock mis à jour en session ». |
| F4 | `ProductsPage`, `CustomersPage`, `SuppliersPage`, `ExpensesPage`, `SalesHistoryPage` : jeux de données de démonstration affichés à la place d'une erreur ; détail de vente de démonstration. |
| F5 | `DashboardPage` : indicateurs à `0.00` fabriqués en cas d'erreur (indistinguables d'une vraie situation). |
| F6 | `ReturnsPage` : retournait toujours la première ligne de la vente (choix impossible). `PurchasesPage` : valeurs par défaut inventées (quantité 10, prix 1000). `SalesHistoryPage` : reçu réimprimé avec « Article #n » et « Client Comptoir » systématique. |
| F7 | `ReportsPage`/`DashboardPage` : blob téléchargé dans le renderer, nom de fichier imposé par le client, aucune distinction d'erreur (404 vs autre). |
| F8 | `SettingsPage` : devise et format de ticket « enregistrés » nulle part ; URL d'API dans `localStorage`. `DesktopShell` affichait « consultations depuis le cache local » alors qu'aucun cache n'existe. |
| F9 | `src/renderer/types/api.ts` se déclarait « vérifié directement contre le backend » ; `UserSession` incluait le token. |

## 2. État APRÈS corrections (revue statique — non exécuté)

| Réf. | Correction |
|------|-----------|
| A1–A5 | Réécriture de `package.json` (Electron, Forge + makers, scripts `dev`/`build`/`start`/`package`/`make`), `forge.config.cjs` (liste blanche des fichiers embarqués), scripts `scripts/build-electron.mjs` et `scripts/dev.mjs` (esbuild → `dist-electron/*.cjs`), `vite.config.ts` (`base: './'`, sortie `dist/renderer`). Suppression de `.aistudio/`, `metadata.json`, `bun.lock`, `forge.config.ts`, dépendances inutiles. **Le lockfile est à régénérer** (`npm install`). |
| A6 | Le renderer n'émet plus aucune requête réseau : tout passe par l'IPC `boutica:api-request` ; le processus principal ajoute le `Bearer`, applique délai (60 s, réveil de Render), erreurs NestJS/Better Auth, 401 → événement `session-expired`. CSP finale `connect-src 'none'`. |
| S1–S5 | Main typé (`import … from 'electron'`), contrôle de l'émetteur IPC, chemins API autorisés = `/health` et `/api/v1/*` uniquement, validation d'URL de base (https ou localhost), impression dans fenêtre isolée sans JS (`silent: false`), garde `will-navigate`, instance unique, suppression de l'IPC d'écriture de fichier arbitraire (remplacée par `download-report`, qui n'écrit que la réponse serveur validée à l'emplacement choisi par l'utilisateur). |
| U1–U2 | Session de démonstration, identifiants préremplis et bouton « Accès immédiat » supprimés. |
| U3 | Le jeton reste dans le processus principal, chiffré par `safeStorage` si disponible ; sinon il n'est **pas** persisté (session limitée à l'exécution). Jamais exposé au renderer. |
| U4–U5 | Connexion = `sign-in` + jeton (en-tête `set-auth-token`, repli sur `body.token`) + `get-session` **confirmé** avec `user.id` et `user.email` ; sinon échec. Une panne réseau au démarrage ne déconnecte pas et ne crée aucune session. Déconnexion : état local toujours effacé, avertissement si le serveur ne confirme pas. |
| F1–F2 | Plus de vente fictive ni de catalogue local. Panier conservé en cas d'échec ; attente de la réponse serveur ; reçu uniquement après création confirmée, construit depuis `GET /sales/:id` (montants serveur). Idempotence : même panier ⇒ même clé tant que le résultat est incertain (réseau/5xx) ; nouvelle clé après refus 4xx. Modes de paiement retirés (non pris en charge côté Cloud). Total affiché « estimé ». |
| F3–F6 | Fallbacks supprimés partout : état d'erreur explicite + « Réessayer ». Ajustement de stock : aucun succès simulé. Retours : choix de la ligne et quantité ≤ quantité vendue, rejeu idempotent. Achats : rejeu idempotent, valeurs par défaut neutres. Réimpression : noms d'articles et client lus côté serveur. |
| F7 | Exports téléchargés par le processus principal ; 404 → « export non disponible » ; réponses JSON/HTML refusées ; nom de fichier fourni par le serveur (`Content-Disposition`). |
| F8–F9 | Paramètres : seule l'URL du serveur est modifiable (validée côté main) ; devise lue depuis la session. `api.ts` reclassé « modèle client, non source de vérité ». |

## 3. Points à vérifier par une exécution réelle
Voir `KNOWN_LIMITATIONS.md` §A. En particulier : `npm install`, `npm run lint`, `npm run dev`, connexion réelle,
comportement de `safeStorage` sur la plateforme cible, CSP en mode packagé (`file://`).
