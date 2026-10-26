/**
 * Modèle CLIENT des objets Boutica Cloud.
 * Ce fichier n'est PAS une source de vérité du backend : il décrit ce que le Desktop attend.
 * L'état de vérification route par route est dans docs/API_CONTRACT_MATRIX.md.
 */

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

/** Session confirmée par Boutica Cloud (le jeton reste dans le processus principal Electron). */
export interface UserSession {
  user: {
    id: string;
    name?: string;
    email: string;
    role?: 'OWNER' | 'STAFF';
    businessId?: string;
    businessName?: string;
    businessCurrency?: string;
  };
  expiresAt?: string;
}

export interface Product {
  id: string;
  businessId: string;
  name: string;
  description?: string | null;
  category?: string | null;
  brand?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Variant {
  id: string;
  businessId: string;
  productId: string;
  sku: string;
  name: string;
  attributes: Record<string, string>;
  purchasePrice: string; // numeric string e.g. "12000.00"
  sellingPrice: string;  // numeric string e.g. "15000.00"
  imageUrl?: string | null;
  quantity?: number;     // Joined from stock table
  createdAt: string;
  updatedAt: string;
}

export interface StockItem {
  variantId: string;
  businessId: string;
  quantity: number;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  businessId: string;
  variantId: string;
  type: 'PURCHASE' | 'SALE' | 'RETURN' | 'ADJUSTMENT' | 'DAMAGE';
  quantity: number;
  referenceId?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface Customer {
  id: string;
  businessId: string;
  name: string;
  phone?: string | null;
  createdAt: string;
}

export interface Supplier {
  id: string;
  businessId: string;
  name: string;
  phone?: string | null;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  variantId: string;
  quantity: number;
  unitPrice: string;
  costAtSale?: string | null;
}

export interface Sale {
  id: string;
  businessId: string;
  customerId?: string | null;
  status: 'DRAFT' | 'COMPLETED' | 'CANCELLED';
  subtotal: string;
  discount: string;
  total: string;
  createdAt: string;
  items?: SaleItem[];
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  variantId: string;
  quantity: number;
  unitPrice: string;
}

export interface Purchase {
  id: string;
  businessId: string;
  supplierId?: string | null;
  status: 'DRAFT' | 'RECEIVED' | 'CANCELLED';
  total: string;
  createdAt: string;
  items?: PurchaseItem[];
}

export interface ReturnItem {
  id: string;
  returnId: string;
  saleItemId: string;
  variantId: string;
  quantity: number;
  unitPrice: string;
  condition: 'RESTOCK' | 'DAMAGED';
}

export interface ReturnOrder {
  id: string;
  businessId: string;
  saleId: string;
  status: 'COMPLETED' | 'CANCELLED';
  total: string;
  reason?: string | null;
  createdAt: string;
  items?: ReturnItem[];
}

export interface Expense {
  id: string;
  businessId: string;
  category: string;
  description?: string | null;
  amount: string;
  createdAt: string;
}

export interface DashboardReport {
  period: {
    from: string;
    to: string;
  };
  revenue: string;
  expensesTotal: string;
  estimatedProfit: string;
  stockValue: string;
  receivables: string | null;
  recentSales: Array<{
    id: string;
    total: string;
    customerId?: string | null;
    createdAt: string;
  }>;
  topProducts: Array<{
    variantId: string;
    productName: string;
    variantName: string;
    sku: string;
    quantitySold: number;
  }>;
  lowStockAlerts: Array<{
    variantId: string;
    quantity: number;
    variantName: string;
    sku: string;
  }>;
}

// Request DTOs
export interface CreateProductInput {
  name: string;
  description?: string;
  category?: string;
  brand?: string;
  imageUrl?: string;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  category?: string;
  brand?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  imageUrl?: string;
}

export interface AddVariantInput {
  sku: string;
  name: string;
  purchasePrice: number | string;
  sellingPrice: number | string;
  attributes?: Record<string, string>;
}

export interface UpdateVariantInput {
  sku?: string;
  name?: string;
  purchasePrice?: number | string;
  sellingPrice?: number | string;
  attributes?: Record<string, string>;
}

export interface AdjustStockInput {
  quantity: number; // absolute target stock
  note?: string;
}

export interface CreateSaleInput {
  customerId?: string;
  discount?: number;
  items: Array<{
    variantId: string;
    quantity: number;
  }>;
}

export interface ReceivePurchaseInput {
  supplierId?: string;
  items: Array<{
    variantId: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface CreateReturnInput {
  saleId: string;
  reason?: string;
  items: Array<{
    saleItemId: string;
    quantity: number;
    condition?: 'RESTOCK' | 'DAMAGED';
  }>;
}

export interface CreateCustomerInput {
  name: string;
  phone?: string;
}

export interface CreateSupplierInput {
  name: string;
  phone?: string;
}

export interface CreateExpenseInput {
  category: string;
  description?: string;
  amount: number;
}
