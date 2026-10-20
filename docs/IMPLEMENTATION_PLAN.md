# Plan de réalisation et avancement

Légende : ✅ réalisé (revue statique) · 🔶 réalisé, **à vérifier par exécution réelle** · ⏳ à faire

| # | Étape | État |
|---|-------|------|
| 1 | Audit du Desktop (arborescence, config, main/preload, client HTTP, pages, comportements de démonstration) | ✅ |
| 2 | Audit du Cloud : documentation (README, CHANGELOG, rapport v2.1) | ✅ |
| 2b | Audit du Cloud : contrôleurs, DTO, schéma, `auth.ts`, `main.ts` | ✅ (vérifié directement dans le code source de Boutica Cloud) |
| 3 | Packaging : `package.json`, scripts de build, `forge.config.cjs`, `vite.config.ts` | ✅ |
| 4 | Processus principal sécurisé (IPC validé, CSP, proxy API, stockage du jeton, téléchargements, impression) | ✅ |
| 5 | Authentification réelle (sign-in, sign-up, get-session confirmé, change-password, 401, déconnexion) | ✅ |
| 6 | Client API centralisé sur le pont IPC (erreurs, délais, idempotence) | 🔶 |
| 7 | Suppression de tous les comportements simulés (session, données de repli, vente fictive, stock local) | ✅ |
| 8 | POS : panier conservé, attente serveur, reçu depuis données serveur, idempotence, sans mode de paiement | 🔶 |
| 9 | Retours (choix de ligne), Achats (idempotence), Stocks (aucun succès simulé) | 🔶 |
| 10 | Exports via processus principal ; erreurs honnêtes | 🔶 |
| 11 | Documentation (`docs/*`, README) | ✅ |
| 12 | `npm install` + `npm run lint` + corrections de types éventuelles | ⏳ (à exécuter en local ; non fait ici) |
| 13 | Test manuel bout en bout contre Boutica Cloud (connexion, vente, retour, réception, export) | ⏳ |
| 14 | Packaging réel (`npm run make`) sur la plateforme cible, icônes, signature | ⏳ |
| 15 | Pagination dans les listes (actuellement première page : 50 à 100 éléments) | ⏳ |
| 16 | Fonctionnalités dépendant d'évolutions du Cloud (paiements, créances, modification de clients/fournisseurs, exports si absents) | ⏳ (hors périmètre Desktop) |

## Séquence de vérification recommandée
1. `npm install` (génère `package-lock.json`) ; vérifier les versions d'`electron` et d'`@electron-forge/*` (`npm view <pkg> version`) — les versions du `package.json` sont des planchers non vérifiés.
2. `npm run lint` — le type-check n'a pas pu être exécuté ici ; attendre quelques erreurs de typage à corriger.
3. `npm run dev` — vérifier la connexion avec un compte réel (compte créé hors du Desktop).
4. Parcourir : vente → historique → retour → réception → ajustement → export.
5. `npm run package` puis `npm run make` ; vérifier la CSP en mode packagé et le chiffrement du jeton (`safeStorage`).
