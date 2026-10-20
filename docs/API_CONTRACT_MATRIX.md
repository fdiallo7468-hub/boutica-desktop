# Matrice des contrats API — Boutica Desktop ↔ Boutica Cloud v2.1

**Sources réellement consultées** : code source complet du backend `fdiallo7468-hub/boutica-cloud` (contrôleurs NestJS, DTOs, entités de domaine, schéma Drizzle `schema.ts`, Better Auth configuration `auth.ts`, suites de tests `e2e/auth.e2e-spec.ts`), documentation OpenAPI `/docs-json` et cahier des charges de la mission.

Légende d'état :
- **Confirmé (code)** : route, paramètres, corps et types vérifiés directement dans le code source de Boutica Cloud.
- **Confirmé (doc)** : route et usage décrits par la documentation Cloud.
- **Non supporté** : opération non prise en charge par l'API backend v2.1.

Conventions vérifiées (Cloud) :
- Pagination : `{ data, page, pageSize, total }`.
- Montants : chaînes décimales ou format numérique (ex. `"15000.00"`).
- Clés et identifiants : UUID v4.
- Multi-tenant : `businessId` déduit systématiquement du jeton de session dans `CurrentTenant()`.
- Idempotence : en-tête `Idempotency-Key` sur `POST /sales`, `POST /purchases/receive`, `POST /returns`.
- Tous les appels métier : `Authorization: Bearer <jeton de session>` injecté via le processus principal Electron. Les erreurs 401 déclenchent l'événement `session-expired`.

---

## Authentification (Better Auth) — gérée par le processus principal

| Méthode client | HTTP | Chemin | Corps / Réponse | Pages | Réf. Cloud | État |
|---|---|---|---|---|---|---|
| `signIn` | POST | `/api/auth/sign-in/email` | `{ email, password }` → `{ token, user, session }` ; jeton dans l'en-tête `set-auth-token` ou `body.token`. | Login | `src/auth/auth.ts`, `test/e2e/auth.e2e-spec.ts` | **Confirmé (code)** |
| `getSession` | GET | `/api/auth/get-session` | Requis `Bearer <token>` → `{ user, session }` ou `null`. Exige `user.id`, `user.email`. | App (démarrage), Login | `src/auth/auth.ts` | **Confirmé (code)** |
| `signUp` | POST | `/api/auth/sign-up/email` | `{ name, email, password (≥10 cars), businessName, businessCurrency? }` → `{ token, user, session }`. Crée la boutique et l'utilisateur OWNER. | Inscription | `src/auth/auth.ts`, `test/utils/test-app.ts` | **Confirmé (code)** |
| `changePassword` | POST | `/api/auth/change-password` | Requis `Bearer <token>` + `{ currentPassword, newPassword (≥10 cars), revokeOtherSessions: true }`. | Paramètres | `src/auth/auth.ts`, Better Auth | **Confirmé (code)** |
| `signOut` | POST | `/api/auth/sign-out` | Requis `Bearer <token>` → `{}`. Révoque la session serveur. | DesktopShell | `src/auth/auth.ts` | **Confirmé (code)** |

---

## Santé du serveur

| Méthode client | HTTP | Chemin | Auth | Pages | Réf. Cloud | État |
|---|---|---|---|---|---|---|
| `checkHealth` | GET | `/health` | Aucune | Login, Paramètres, Splash | `health.controller.ts` | **Confirmé (code)** |

---

## Catalogue & Variantes

| Méthode client | HTTP | Chemin | Paramètres / Corps | Pages | Réf. Cloud | État |
|---|---|---|---|---|---|---|
| `listProducts` | GET | `/api/v1/products` | `page, pageSize, category?` | Produits | `catalog.controller.ts` | **Confirmé (code)** |
| `getProduct` | GET | `/api/v1/products/:id` | `id` (UUID) | Produits | `catalog.controller.ts` | **Confirmé (code)** |
| `createProduct` | POST | `/api/v1/products` | `{ name, category?, brand?, description? }` | Produits | `catalog.controller.ts` | **Confirmé (code)** |
| `updateProduct` | PATCH | `/api/v1/products/:id` | `{ name?, category?, brand?, description?, status? }` | Produits | `catalog.controller.ts` | **Confirmé (code)** |
| `listProductVariants` | GET | `/api/v1/products/:id/variants` | `page, pageSize, search?` (renvoie la quantité en stock) | Produits | `catalog.controller.ts` | **Confirmé (code)** |
| `addVariant` | POST | `/api/v1/products/:id/variants` | `{ sku, name, purchasePrice, sellingPrice, attributes? }` | Produits | `catalog.controller.ts` | **Confirmé (code)** |
| `updateVariant` | PATCH | `/api/v1/products/:id/variants/:variantId` | `{ sku?, name?, purchasePrice?, sellingPrice?, attributes? }` | Produits | `catalog.controller.ts` | **Confirmé (code)** |
| `listAllVariants` | GET | `/api/v1/variants` | `search?, page, pageSize` (jointure avec `stock.quantity`) | POS, Stocks, Achats, Retours | `catalog.controller.ts` (VariantsController) | **Confirmé (code)** |

---

## Stocks & Inventaire

| Méthode client | HTTP | Chemin | Corps | Pages | Réf. Cloud | État |
|---|---|---|---|---|---|---|
| `getStock` | GET | `/api/v1/inventory/:variantId` | `variantId` (UUID) | Stocks | `inventory.controller.ts` | **Confirmé (code)** |
| `adjustStock` | POST | `/api/v1/inventory/:variantId/adjust` | `{ quantity, note? }` — quantité absolue cible ; génère mouvement `ADJUSTMENT`. | Stocks | `inventory.controller.ts` | **Confirmé (code)** |

---

## Ventes (Caisse POS & Historique)

| Méthode client | HTTP | Chemin | Paramètres / Corps | Pages | Réf. Cloud | État |
|---|---|---|---|---|---|---|
| `listSales` | GET | `/api/v1/sales` | `from?, to?, customerId?, page, pageSize` | Historique, Retours | `sales.controller.ts` | **Confirmé (code)** |
| `getSale` | GET | `/api/v1/sales/:id` | `id` (UUID) → vente complète avec `items` et prix | Historique, POS (reçu), Retours | `sales.controller.ts` | **Confirmé (code)** |
| `createSale` | POST | `/api/v1/sales` | `{ customerId?, discount?, items: [{ variantId, quantity }] }` + `Idempotency-Key` ; les prix sont fixés côté serveur ; pas de `paymentMethod`. | POS | `sales.controller.ts`, `create-sale.dto.ts` | **Confirmé (code)** |

---

## Achats Fournisseurs

| Méthode client | HTTP | Chemin | Paramètres / Corps | Pages | Réf. Cloud | État |
|---|---|---|---|---|---|---|
| `listPurchases` | GET | `/api/v1/purchases` | `from?, to?, supplierId?, page, pageSize` | Achats | `purchasing.controller.ts` | **Confirmé (code)** |
| `receivePurchase` | POST | `/api/v1/purchases/receive` | `{ supplierId?, items: [{ variantId, quantity, unitPrice }] }` + `Idempotency-Key` ; incrémente le stock. | Achats | `purchasing.controller.ts`, `receive-purchase.dto.ts` | **Confirmé (code)** |

---

## Retours Ventes

| Méthode client | HTTP | Chemin | Paramètres / Corps | Pages | Réf. Cloud | État |
|---|---|---|---|---|---|---|
| `listReturns` | GET | `/api/v1/returns` | `from?, to?, saleId?, page, pageSize` | Retours | `returns.controller.ts` | **Confirmé (code)** |
| `getReturn` | GET | `/api/v1/returns/:id` | `id` (UUID) | Retours | `returns.controller.ts` | **Confirmé (code)** |
| `createReturn` | POST | `/api/v1/returns` | `{ saleId, reason?, items: [{ saleItemId, quantity, condition? }] }` + `Idempotency-Key` ; condition `RESTOCK` ou `DAMAGED`. | Retours | `returns.controller.ts`, `create-return.dto.ts` | **Confirmé (code)** |

---

## Clients, Fournisseurs & Dépenses

| Méthode client | HTTP | Chemin | Paramètres / Corps | Pages | Réf. Cloud | État |
|---|---|---|---|---|---|---|
| `listCustomers` | GET | `/api/v1/customers` | `page, pageSize` | Clients, POS | `customers.controller.ts` | **Confirmé (code)** |
| `getCustomer` | GET | `/api/v1/customers/:id` | `id` (UUID) | Clients, Historique | `customers.controller.ts` | **Confirmé (code)** |
| `createCustomer` | POST | `/api/v1/customers` | `{ name, phone? }` | Clients | `customers.controller.ts` | **Confirmé (code)** |
| `listSuppliers` | GET | `/api/v1/suppliers` | `page, pageSize` | Fournisseurs, Achats | `suppliers.controller.ts` | **Confirmé (code)** |
| `createSupplier` | POST | `/api/v1/suppliers` | `{ name, phone? }` | Fournisseurs | `suppliers.controller.ts` | **Confirmé (code)** |
| `listExpenses` | GET | `/api/v1/expenses` | `page, pageSize` | Dépenses | `expenses.controller.ts` | **Confirmé (code)** |
| `createExpense` | POST | `/api/v1/expenses` | `{ category, description?, amount }` | Dépenses | `expenses.controller.ts` | **Confirmé (code)** |

---

## Rapports & Exports Officiels

| Méthode client | HTTP | Chemin | Paramètres / Format | Pages | Réf. Cloud | État |
|---|---|---|---|---|---|---|
| `getDashboardReport` | GET | `/api/v1/reports/dashboard` | `from?, to?, lowStockThreshold?` | Dashboard | `reports.controller.ts` | **Confirmé (code)** |
| `exportSalesExcel` | GET | `/api/v1/reports/sales/excel` | `from?, to?` → feuille Excel `.xlsx` | Rapports, Dashboard | `reports.controller.ts` | **Confirmé (code)** |
| `exportInventoryExcel` | GET | `/api/v1/reports/inventory/excel` | — → feuille Excel `.xlsx` | Rapports, Dashboard | `reports.controller.ts` | **Confirmé (code)** |
| `exportSalesPdf` | GET | `/api/v1/reports/sales/pdf` | `from?, to?` → document PDF professionnel | Rapports, Dashboard | `reports.controller.ts` | **Confirmé (code)** |
| `exportInventoryPdf` | GET | `/api/v1/reports/inventory/pdf` | — → document PDF professionnel | Rapports, Dashboard | `reports.controller.ts` | **Confirmé (code)** |
