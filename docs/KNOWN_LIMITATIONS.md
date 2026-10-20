# Limitations connues

## A. Vérification non effectuée
- **Aucun build, test ni installation n'a été exécuté** (pas d'accès réseau dans l'environnement de travail). Seule une
  transpilation syntaxique de tous les fichiers TypeScript (0 erreur) et une revue statique ont été réalisées. Le type-check
  (`npm run lint`) reste à faire.
- Versions de `electron` (^38), `@electron-forge/*` (^7.10) : planchers **non vérifiés**. `bun.lock` supprimé : régénérer un lockfile.
- Les contrôleurs, DTO et le schéma Cloud n'ont pas pu être lus : voir `API_CONTRACT_MATRIX.md` (aucune route « confirmée dans le code »).
- Forme exacte de la réponse de connexion Better Auth : le Desktop lit le jeton dans `set-auth-token` puis `body.token`, et
  **n'accepte la connexion que si `get-session` confirme `user.id` et `user.email`**. Si ce flux échoue en réel, c'est le premier point à examiner.
- La CSP du mode packagé (`default-src 'self'`, chargement par `file://`) est à valider à l'exécution.
- `src/renderer/lib/money.test.ts` (existant, conservé) n'a pas été exécuté.

## B. Fonctionnalités indisponibles côté Boutica Cloud (documentation lue)
- **Modes de paiement** : aucun champ ni table de paiement. L'interface POS ne les propose plus.
- **Créances** : `receivables` est toujours `null` ; non affiché comme montant.
- **Modification / suppression** de clients, fournisseurs, dépenses : routes absentes ; aucune action correspondante dans l'interface.
- **Exports Excel/PDF** : routes **non confirmées** (non citées par la documentation v2.1). Boutons conservés ; erreur explicite si absentes.
- **Inscription** (`/api/auth/sign-up/email`) : existe côté Cloud, volontairement non exposée dans le Desktop.
- **STAFF / invitations**, **upload d'images** : absents du Cloud.
- Pas de recherche serveur sur les clients/fournisseurs (filtre local sur la page chargée).

## C. Limitations du Desktop
- **Pas de mode hors ligne** (choix assumé : aucune écriture simulée). Les écritures exigent le serveur ; les ventes/réceptions/retours
  incertains sont rejouables sans doublon grâce à `Idempotency-Key`, tant que la fenêtre n'est pas fermée.
- **Pagination** : listes limitées à la première page (50–100 éléments). Les noms d'articles des reçus réimprimés/retours sont
  résolus sur les 100 premières variantes ; au-delà, « Article <id> » est affiché.
- **Retours** : un article par retour (une ligne de vente à la fois).
- **Remise POS** : montant absolu ; le type attendu par `CreateSaleDto.discount` (nombre/chaîne) n'est pas vérifié.
- **Jeton de session** : persisté seulement si `safeStorage` est disponible (sous Linux, nécessite un trousseau) ; sinon reconnexion à chaque lancement.
- **Icônes, signature de code, mise à jour automatique** : non fournies (voir commentaire dans `forge.config.cjs`).
- **Reçu** : impression via la boîte de dialogue système (format 80 mm) ; choix du format non disponible.
- **Polices** : Inter chargée depuis Google Fonts (autorisée par la CSP) ; repli sur la police système hors ligne.
- `@tanstack/react-query` est une dépendance héritée d'AI Studio, **non utilisée** par le code actuel (conservée, non supprimée sans nécessité démontrée).
- Cloud sur Render (offre gratuite) : premier appel pouvant prendre ~50 s ; délai client fixé à 60 s.

## D. Cahier des charges
Le texte de la mission reçu s'interrompt au milieu de la section 9 (« Le client doit : construire les URL à part… »). Les sections
suivantes n'ont pas été lues ; leurs exigences éventuelles ne sont pas couvertes.
