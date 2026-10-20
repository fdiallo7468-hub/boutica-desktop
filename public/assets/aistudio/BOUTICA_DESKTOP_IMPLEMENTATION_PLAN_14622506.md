# Boutica Desktop — Plan d’implémentation vérifiable

**Référence fonctionnelle :** `BOUTICA DESKTOP — MASTER ENGINEERING PROMPT` (22 sections, 704 lignes).  
**Référence visuelle :** `BOUTICA_DESIGN_SYSTEM.md` (335 lignes) + image de référence Boutica.  
**Backend cible :** `fdiallo7468-hub/boutica-cloud`, branche `main`.  
**Cible initiale :** application Windows fiable, puis validation macOS/Linux.  
**Mode de travail demandé :** produire le code source et la configuration sans installer les dépendances dans l’environnement de travail de ChatGPT; l’utilisateur installera et exécutera le projet dans VS Code.

> Ce document est un plan de livraison et une matrice de vérification. Il ne signifie pas que les phases listées sont déjà implémentées ou validées.

## 1. Principes non négociables

- Boutica Cloud reste la source de vérité métier; aucun backend parallèle.
- Aucun endpoint, payload, champ de réponse ou comportement backend ne doit être supposé.
- Aucune donnée métier fictive en production; les erreurs ne sont jamais masquées.
- Une mutation commerciale n’est considérée comme réussie qu’après confirmation du serveur.
- Pas de mode hors ligne métier; les transactions requièrent une connexion.
- Electron sécurisé : `contextIsolation: true`, `nodeIntegration: false`, preload minimal, IPC allowlisté et validé, CSP restrictive.
- Better Auth doit être utilisé selon le contrat réellement configuré; pas de stockage de mot de passe ni de jeton en clair dans les logs.
- Le design system fourni est la référence; pas de thème générique d’administration.
- Les tests, builds, packages et installateurs ne sont déclarés réussis qu’après exécution réelle.
- Le travail reste organisé en modules; pas de composant géant unique.

## 2. Stack requise par le prompt

| Domaine | Choix demandé | Règle d’implémentation |
|---|---|---|
| Desktop | Electron + Electron Forge | Vérifier compatibilité versions/plugins et packaging |
| Build | Vite | Configurations distinctes main, preload, renderer |
| UI | React + TypeScript | TypeScript strict, composants modulaires |
| Styles | Tailwind CSS + variables CSS | Tokens Boutica centralisés, stratégie de compatibilité avec Mantine |
| Primitives UI | Mantine | Utiliser là où cela apporte une valeur; personnaliser selon Boutica |
| Icônes | Lucide React | Cohérence et libellés accessibles |
| Animations | Motion | Sobres, utiles, respect de reduced motion |
| Toasts | Sonner | Un seul système de notifications UI |
| Données serveur | TanStack Query | Source principale des données distantes, invalidation après mutations |
| État UI partagé | Zustand | Préférences/navigation uniquement, pas de duplication des données serveur |
| Formulaires | Mantine Form + Zod | Validation côté client sans remplacer la validation serveur |
| Tables | TanStack Table | Pagination/tri/filtre selon contrats réels |
| Tests unitaires | Vitest | Exécuter réellement lorsque les dépendances seront installées |
| Tests UI | React Testing Library | États et interactions essentiels |
| E2E | Playwright | Confirmer compatibilité avec Electron Forge choisi avant adoption |

## 3. Architecture cible

```text
boutica-desktop/
├── package.json
├── forge.config.ts
├── vite.main.config.ts
├── vite.preload.config.ts
├── vite.renderer.config.ts
├── tsconfig.json
├── .env.example
├── .gitignore
├── resources/                 # logos/ressources réellement fournis
├── src/
│   ├── main/                  # lifecycle, BrowserWindow, IPC, impression, dialogues
│   ├── preload/               # pont IPC strictement allowlisté
│   └── renderer/
│       ├── app/               # composition et routes protégées
│       ├── components/        # composants partagés Boutica
│       ├── features/          # auth, dashboard, catalog, inventory, sales, etc.
│       ├── layouts/           # shell desktop, sidebar, header
│       ├── pages/             # vues de navigation
│       ├── lib/               # config et utilitaires transversaux
│       ├── services/          # client API typé et services par domaine
│       ├── hooks/             # hooks réutilisables
│       ├── store/             # Zustand, état strictement UI
│       ├── schemas/           # schémas Zod
│       ├── types/             # contrats vérifiés et types UI
│       └── styles/            # tokens, globals, thèmes Mantine/Tailwind
├── tests/
│   ├── unit/
│   ├── components/
│   ├── integration/
│   └── e2e/
└── docs/
    ├── IMPLEMENTATION_PLAN.md
    ├── API_CONTRACT_MATRIX.md
    ├── SECURITY.md
    └── RELEASE_CHECKLIST.md
```

La structure finale peut être adaptée au template Forge retenu, sans mélanger les responsabilités main/preload/renderer.

## 4. Phase 1 — Inspection et planification

### Ressources examinées

- Le prompt complet : 22 sections couvrant mission, backend, stack, design, architecture, sécurité, API, authentification, modules métier, UX desktop, tests, packaging et critères de fin.
- Le `BOUTICA_DESIGN_SYSTEM.md` complet : identité, palette, typographie, espacement, rayons, ombres, composants, accessibilité et tokens CSS.
- Des fichiers du dépôt `boutica-cloud` : `README.md`, rapport de finalisation v2.1, `src/auth/auth.ts`, contrôleurs dashboard, catalogue, stock, ventes, achats, clients, fournisseurs, dépenses et retours.

### Contrats backend confirmés dans le code/README consulté

| Domaine | Contrat confirmé | État / limite |
|---|---|---|
| Santé | `GET /health` | Endpoint décrit dans le prompt; vérifier réponse et disponibilité réelle à l’exécution |
| Auth inscription | `POST /api/auth/sign-up/email` | README décrit `name`, `email`, `password`, `businessName`, `businessCurrency` optionnel |
| Auth connexion | `POST /api/auth/sign-in/email` | README décrit `email` + `password` et retour `token` |
| Auth session API | `Authorization: Bearer <token>` | README indique token de session Better Auth; ne pas le traiter comme JWT auto-signé |
| Dashboard | `GET /api/v1/reports/dashboard` | Contrôleur consulté; filtres `from` et `to` décrits dans le DTO à revérifier au moment d’implémenter |
| Produits | `GET/POST /api/v1/products`, `GET /api/v1/products/:id` | Contrôleur consulté; DTO exacts et tous les chemins secondaires à relever avant UI finale |
| Variantes | `GET /api/v1/products/:id/variants`, `GET /api/v1/variants`, `PATCH /api/v1/products/:id/variants/:variantId` | Rapport v2.1; revérifier DTO et réponses |
| Stock | `GET /api/v1/inventory/:variantId`, `POST /api/v1/inventory/:variantId/adjust` | Contrôleur consulté; ajustement = nouvelle quantité absolue, pas delta |
| Ventes | `POST/GET /api/v1/sales`, `GET /api/v1/sales/:id` | Contrôleur consulté; POST accepte `Idempotency-Key` optionnelle |
| Achats | `POST /api/v1/purchases/receive`, `GET /api/v1/purchases`, `GET /api/v1/purchases/:id` | Contrôleur consulté; réception accepte `Idempotency-Key` optionnelle |
| Clients | `GET/POST /api/v1/customers`, `GET /api/v1/customers/:id` | Contrôleur consulté; ne pas inventer PATCH/DELETE |
| Fournisseurs | `GET/POST /api/v1/suppliers` | Contrôleur consulté; pas de mise à jour/suppression exposée dans le fichier consulté |
| Dépenses | `GET/POST /api/v1/expenses` | Contrôleur consulté; DTO exact à relever avant formulaire |
| Retours | `POST/GET /api/v1/returns`, `GET /api/v1/returns/:id` | Contrôleur consulté; POST accepte `Idempotency-Key` optionnelle |
| Pagination | Réponse `{ data, page, pageSize, total }` | README/contrôleurs; `limit` et `offset` sont utilisés par les contrôleurs examinés |
| Devise | devise du commerce, `XOF` par défaut dans le README | Ne pas coder en dur une devise; formatter selon la configuration et les données serveur |

### Contrats restant à vérifier avant les formulaires finaux

- Schémas complets des DTO pour chaque création, ajustement, vente, achat et retour.
- Contrat exact de réponse et erreurs de chaque route.
- Champs réels des rapports/export, formats de fichiers et noms de fichiers.
- Contrat média si un flux de médias est réellement nécessaire au desktop.
- Schémas et détails d’auth/session complets, origines de confiance, CORS et comportement du client Electron.
- Disponibilité effective du service de production et Swagger au moment des essais.

Aucune opération destructive ou mutation métier ne doit être utilisée pour tester la production.

## 5. Phase 2 — Fondation desktop

- [ ] Choisir des versions compatibles et épinglées pour Electron, Forge, Vite, React, TypeScript et plugins.
- [ ] Configurer les entrées main/preload/renderer conformément à Forge.
- [ ] Activer `contextIsolation`, désactiver `nodeIntegration`, limiter navigation et nouvelles fenêtres.
- [ ] Définir une CSP de développement/production et vérifier les besoins de chaque source.
- [ ] Exposer uniquement des fonctions IPC explicites et typées; valider chaque argument côté main.
- [ ] Définir fenêtre minimale et cycle de vie sans doubles listeners.
- [ ] Ajouter scripts dev, typecheck, lint, tests, package/make.
- [ ] Préparer une configuration API par défaut vers Boutica Cloud, sans secrets dans le renderer.
- [ ] Vérifier installation, démarrage et build de production dans l’environnement VS Code cible.

**Critère de sortie :** le démarrage de développement et le build de production passent réellement; les configurations et les commandes sont documentées.

## 6. Phase 3 — Design System et shell

- [ ] Tokens CSS basés sur le document : primaire `#9A050E`, profond `#5F0203`, secondaire `#AA3035`, fond `#FDFDFD`, surface secondaire `#F7F6F6`, bordure `#E5E2E3`, texte `#2B282C`, texte secondaire `#706C70`.
- [ ] Couleurs sémantiques success/warning/danger/info du document.
- [ ] Inter en priorité, fallback système.
- [ ] Espacements de base 4 px, rayons 10/12/14/18 px, ombres discrètes.
- [ ] Adapter le système mobile-first à un shell desktop sans perdre l’identité Boutica.
- [ ] Sidebar, en-tête, fil d’Ariane si utile, zone d’actions, contenu, états de page.
- [ ] Boutons, champs, badges, cartes, dialogues, tables, états de focus, disabled, loading, erreur.
- [ ] Sonner comme unique système toast.
- [ ] Respecter contraste, navigation clavier, reduced motion et libellés en français.
- [ ] Utiliser uniquement le logo officiel fourni; si la source originale n’est pas accessible, ne pas fabriquer un remplacement et documenter le manque.

**Critère de sortie :** tokens et composants réutilisables; aucun thème admin générique; vérification visuelle sur les vues de base.

## 7. Phase 4 — API, session et état

- [ ] Client HTTP centralisé avec base URL configurable, timeout et parsing sûr.
- [ ] Types écrits à partir des contrats vérifiés, pas de suppositions de champs.
- [ ] Gestion des erreurs réseau, erreurs HTTP, réponses malformées et session expirée.
- [ ] Better Auth selon le README: Bearer token supporté par le backend; ne pas exposer le token dans les logs.
- [ ] Vérifier le meilleur stockage session pour Electron; préférer le stockage sécurisé adapté au contexte, jamais le stockage en clair arbitraire.
- [ ] Routes authentifiées et restauration de session seulement si le contrat l’autorise.
- [ ] TanStack Query pour fetch/cache/invalidation; retry seulement sur opérations sûres.
- [ ] Clés d’idempotence pour ventes, réceptions d’achats et retours lorsqu’acceptées.
- [ ] États chargement, vide, erreur et réussite réutilisables.

**Critère de sortie :** connexion et appels en lecture testés avec un environnement autorisé, sans modifier les données de production.

## 8. Phase 5 — Modules métier, dans cet ordre

### 5.1 Tableau de bord

- Brancher `GET /api/v1/reports/dashboard`.
- Afficher uniquement les agrégats réellement retournés; date de début/fin si supportée.
- États loading/empty/error; aucun chiffre de démonstration en mode production.

### 5.2 Catalogue et variantes

- Liste paginée; détails; recherche/filtre seulement si pris en charge.
- Création/édition selon routes vérifiées.
- Variantes globales et par produit; édition uniquement via endpoint confirmé.
- Aucun bouton suppression sans route confirmée.

### 5.3 Stock

- Vue du stock par variante.
- Ajustement à une nouvelle quantité absolue, avec explication explicite et confirmation.
- Éviter double soumission; rafraîchir les données après confirmation serveur.

### 5.4 Ventes

- Construire formulaire et récapitulatif selon DTO réel.
- Prix/règles métier autoritaires côté serveur.
- Générer une clé d’idempotence pour la tentative et la réutiliser correctement lors d’une reprise de la même opération.
- Ne jamais réessayer automatiquement une mutation incertaine.
- Historique et détail selon routes confirmées.

### 5.5 Achats

- Réception d’achat selon DTO réel, fournisseur appartenant au tenant et lignes valides.
- Clé d’idempotence; historique et détail.

### 5.6 Clients et fournisseurs

- Listes et créations confirmées; détail client confirmé.
- Pas de contrôles update/delete inventés.

### 5.7 Dépenses

- Liste et création selon DTO confirmé; totaux calculés côté serveur lorsque pertinent.

### 5.8 Retours

- Formulaire selon DTO et règles métier réelles; clé d’idempotence.
- Historique/détail; afficher la confirmation serveur seulement.

### 5.9 Rapports, export et impression

- Vérifier endpoints et contenu des fichiers avant d’implémenter.
- Dialogues de destination via IPC autorisé; valider chemin et nom de fichier.
- Impression via main process avec aperçu ou révision avant action lorsque faisable.
- Traiter annulation, imprimante absente et erreur sans faux succès.

**Critère de sortie par module :** contrat vérifié, UI alignée, validation, états d’erreur/vide/chargement, mutation confirmée, tests pertinents et statut documenté.

## 9. Phase 6 — Finition desktop

- [ ] Raccourcis documentés : `Ctrl/Cmd+K` seulement si palette réellement développée; `Escape` pour fermer overlays sûrs.
- [ ] Dialogues de confirmation pour actions conséquentes.
- [ ] Recherche et filtres uniquement lorsqu’ils sont supportés.
- [ ] Mise en page résiliente au redimensionnement et tailles minimales.
- [ ] Accessibilité clavier, focus visible, contraste, labels et messages d’erreur.
- [ ] Réduction des animations selon préférence système.
- [ ] États de connectivité explicites; aucune promesse offline.
- [ ] Revue des logs, IPC, navigation externe, liens et surface d’attaque Electron.

## 10. Phase 7 — Tests et livraison

### Tests unitaires

- Formatage monétaire sans perte de précision, formatage date/nombre.
- Schémas Zod.
- Parsing des réponses et erreurs API.
- Création/gestion des clés d’idempotence.

### Tests composants/intégration

- Formulaires invalides et valides.
- États de chargement, vide et erreur.
- Pagination et invalidation TanStack Query.
- Session expirée et connectivité interrompue.
- Mutations mockées en test; aucune écriture destructive en production.

### Tests E2E

- Démarrage.
- Authentification avec environnement de test autorisé.
- Dashboard.
- Validation de formulaire.
- Gestion erreur API.
- Une mutation supportée en environnement de test.
- Raccourcis, export/impression quand disponibles.

### Packaging

- Windows prioritaire : vérifier `make`/package et lancer réellement l’artefact produit.
- macOS/Linux : configurer puis valider dans les environnements correspondants; ne pas déclarer un build validé depuis un autre OS sans preuve.
- Documenter signature, notarisation et limites de distribution.

## 11. Matrice de validation globale

| Exigence | Preuve attendue | Statut initial de ce plan |
|---|---|---|
| Prompt intégral lu | 22 sections parcourues | Effectué |
| Design System lu intégralement | 335 lignes consultées | Effectué |
| Contrats backend | Code/README ciblés consultés; DTOs restant à inspecter | Partiel |
| Fondation Electron sécurisée | Fichiers + revue sécurité | À valider dans la base de code |
| Build de production | Sortie réelle de commande | Non exécuté ici |
| Authentification live | Essai non destructif documenté | Non exécuté ici |
| Modules métier | Contrat + UI + tests par module | À implémenter |
| Tests | Commandes et résultats enregistrés | Non exécutés ici |
| Installateur Windows | Artefact et test réel | Non produit/validé par ce plan |
| macOS/Linux | Builds dans environnements appropriés | À valider ultérieurement |

## 12. Définition de « terminé »

Boutica Desktop n’est terminé que lorsque chaque fonctionnalité livrée :

1. respecte le Design System;
2. fonctionne réellement;
3. utilise un contrat backend vérifié si elle dépend de l’API;
4. gère chargement, vide, erreurs et récupération;
5. respecte validation et sécurité;
6. dispose de tests pertinents exécutés lorsque possible;
7. est documentée avec son statut exact.

## 13. Prochaine action d’implémentation

Reprendre la fondation locale existante, comparer chaque fichier à ce plan, vérifier les versions de dépendances et la configuration Forge/Vite, compléter la matrice de contrats (DTO et réponses exactes), puis corriger/compléter la fondation avant d’ajouter les modules métier. Le développement ne doit pas sauter directement à tous les écrans avant que la base ne soit validable.
