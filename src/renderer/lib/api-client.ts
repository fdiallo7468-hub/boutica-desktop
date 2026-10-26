/**
 * Centralized typed API client for Boutica Cloud
 * Aucune donnée simulée ou fictive : toutes les requêtes sont adressées au véritable backend Boutica Cloud.
 */

import type { ReportDownloadType, ReceiptPdfData } from '../types/desktop.ts';
import type {
  PaginatedResponse,
  UserSession,
  SaleItem,
  PurchaseItem,
  ReturnItem,
  Product,
  Variant,
  StockItem,
  Sale,
  Purchase,
  ReturnOrder,
  Customer,
  Supplier,
  Expense,
  DashboardReport,
  CreateProductInput,
  UpdateProductInput,
  AddVariantInput,
  UpdateVariantInput,
  AdjustStockInput,
  CreateSaleInput,
  ReceivePurchaseInput,
  CreateReturnInput,
  CreateCustomerInput,
  CreateSupplierInput,
  CreateExpenseInput,
} from '../types/api.ts';

const DEFAULT_API_URL = 'https://boutica-cloud.onrender.com';
const PROXY_API_PREFIX = '/api/boutica-cloud';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Serveur injoignable ou délai dépassé : le résultat d'une écriture est alors INCERTAIN. */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

function bridge() {
  const b = typeof window !== 'undefined' ? window.bouticaDesktop : undefined;
  if (!b) {
    throw new ApiError(
      0,
      'Boutica Desktop doit être lancé dans l’application Electron (le pont sécurisé est indisponible).'
    );
  }
  return b;
}

type Query = Record<string, string | number | undefined | null>;

/**
 * Client de Boutica Cloud.
 * En environnement Electron, toute requête transite par le pont IPC du processus principal (sécurité safeStorage + Bearer token).
 * En environnement web (navigateur), les appels transitent par le proxy local même origine `/api/boutica-cloud` pour contourner CORS.
 */
export class BouticaApiClient {
  private sessionExpiredListeners = new Set<() => void>();

  private getStoredToken(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem('boutica_auth_token') || sessionStorage.getItem('boutica_auth_token');
    } catch {
      return null;
    }
  }

  private setStoredToken(token: string) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('boutica_auth_token', token);
      sessionStorage.setItem('boutica_auth_token', token);
    } catch {
      /* ignore */
    }
  }

  private clearStoredToken() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('boutica_auth_token');
      sessionStorage.removeItem('boutica_auth_token');
    } catch {
      /* ignore */
    }
  }

  private getWebBaseUrl(): string {
    return PROXY_API_PREFIX;
  }

  private buildQuery(query: Query | undefined): string {
    if (!query) return '';
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === '') continue;
      qs.set(k, String(v));
    }
    const s = qs.toString();
    return s ? `?${s}` : '';
  }

  private notifySessionExpired() {
    this.clearStoredToken();
    this.sessionExpiredListeners.forEach((cb) => {
      try {
        cb();
      } catch {
        /* ignore */
      }
    });
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH',
    path: string,
    opts: { query?: Query; body?: unknown; idempotencyKey?: string } = {}
  ): Promise<T> {
    if (typeof window !== 'undefined' && window.bouticaDesktop) {
      const res = await bridge().api({ method, path, ...opts });
      if (!res.ok) {
        throw new ApiError(res.status, res.error ?? `Erreur serveur (${res.status})`, res.data);
      }
      return res.data as T;
    }

    // Mode Web : appel via le proxy local sécurisé
    const token = this.getStoredToken();
    if (path !== '/health' && !token) {
      this.notifySessionExpired();
      throw new ApiError(401, 'Session expirée. Veuillez vous reconnecter.');
    }

    const qs = this.buildQuery(opts.query);
    const url = `${this.getWebBaseUrl()}${path}${qs}`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (opts.idempotencyKey) {
      headers['Idempotency-Key'] = opts.idempotencyKey;
    }

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      });

      if (res.status === 401 && path !== '/health') {
        this.notifySessionExpired();
        throw new ApiError(401, 'Session expirée. Veuillez vous reconnecter.');
      }

      if (res.status === 204) {
        return null as T;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = data?.message || data?.error || `Erreur serveur (${res.status})`;
        throw new ApiError(res.status, msg, data);
      }

      return data as T;
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(0, `Serveur Boutica Cloud injoignable (${err?.message || 'erreur réseau'}).`);
    }
  }

  // --- HEALTH ---
  async checkHealth(): Promise<{ status: string; service?: string; timestamp?: string }> {
    if (typeof window !== 'undefined' && window.bouticaDesktop) {
      return this.request('GET', '/health');
    }
    try {
      const res = await fetch(`${this.getWebBaseUrl()}/health`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      throw new ApiError(0, 'Serveur Boutica Cloud injoignable');
    }
  }

  // --- AUTHENTICATION (Better Auth) ---
  async signIn(email: string, password: string): Promise<UserSession> {
    if (typeof window !== 'undefined' && window.bouticaDesktop) {
      const res = await window.bouticaDesktop.auth.signIn(email, password);
      if (!res.ok) throw new ApiError(401, res.error);
      return res.session;
    }

    // Appel via le proxy même origine (évite les erreurs CORS)
    try {
      const res = await fetch(`${this.getWebBaseUrl()}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = data?.message || data?.error || (res.status === 401 ? 'Email ou mot de passe incorrect.' : `Erreur (${res.status})`);
        throw new ApiError(res.status, msg);
      }
      const token = res.headers.get('set-auth-token') || data?.token;
      if (!token) throw new ApiError(500, 'Aucun jeton de session reçu du serveur.');

      const s = await fetch(`${this.getWebBaseUrl()}/api/auth/get-session`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const rawSession = await s.json().catch(() => null);
      if (!s.ok || !rawSession || !rawSession.user) {
        throw new ApiError(401, 'Connexion refusée : la session n’a pas pu être vérifiée auprès du serveur.');
      }
      this.setStoredToken(token);
      return {
        user: {
          id: String(rawSession.user.id),
          name: rawSession.user.name,
          email: rawSession.user.email,
          role: rawSession.user.role || 'OWNER',
          businessId: rawSession.user.businessId,
          businessName: rawSession.user.businessName || 'Boutica Store',
          businessCurrency: rawSession.user.businessCurrency || 'XOF',
        },
        expiresAt: rawSession.session?.expiresAt || rawSession.expiresAt,
      };
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(0, `Impossible de contacter le serveur Boutica Cloud (${err?.message || 'erreur réseau'}).`);
    }
  }

  async signUp(data: {
    name: string;
    email: string;
    password: string;
    businessName: string;
    businessCurrency?: string;
  }): Promise<UserSession> {
    if (typeof window !== 'undefined' && window.bouticaDesktop) {
      const res = await window.bouticaDesktop.auth.signUp(data);
      if (!res.ok) throw new ApiError(400, res.error);
      return res.session;
    }

    try {
      const res = await fetch(`${this.getWebBaseUrl()}/api/auth/sign-up/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name.trim(),
          email: data.email.trim().toLowerCase(),
          password: data.password,
          businessName: data.businessName.trim(),
          businessCurrency: data.businessCurrency?.trim() || 'XOF',
        }),
      });
      const resData = await res.json().catch(() => null);
      if (!res.ok) {
        let msg = resData?.message || resData?.error || `Erreur d'inscription (${res.status})`;
        if (msg === 'User already exists' || res.status === 422) {
          msg = 'Un compte existe déjà avec cette adresse e-mail. Veuillez vous connecter.';
        }
        throw new ApiError(res.status, msg);
      }
      let token = (resData && typeof resData.token === 'string' ? resData.token : null) || res.headers.get('set-auth-token');

      if (!token) {
        // Enregistrement réussi, tenter de récupérer le jeton via sign-in automatique
        const loginRes = await fetch(`${this.getWebBaseUrl()}/api/auth/sign-in/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.email.trim().toLowerCase(), password: data.password }),
        });
        const loginData = await loginRes.json().catch(() => null);
        token = (loginData && typeof loginData.token === 'string' ? loginData.token : null) || loginRes.headers.get('set-auth-token');
      }

      if (!token) {
        throw new ApiError(500, 'Compte créé mais aucun jeton de session reçu.');
      }

      const s = await fetch(`${this.getWebBaseUrl()}/api/auth/get-session`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const rawSession = await s.json().catch(() => null);
      if (!s.ok || !rawSession || !rawSession.user) {
        throw new ApiError(500, 'Session introuvable après création de compte.');
      }
      this.setStoredToken(token);
      return {
        user: {
          id: String(rawSession.user.id),
          name: rawSession.user.name || data.name,
          email: rawSession.user.email || data.email,
          role: rawSession.user.role || 'OWNER',
          businessId: rawSession.user.businessId,
          businessName: rawSession.user.businessName || data.businessName,
          businessCurrency: rawSession.user.businessCurrency || data.businessCurrency || 'XOF',
        },
        expiresAt: rawSession.session?.expiresAt || rawSession.expiresAt,
      };
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(0, `Impossible de contacter le serveur Boutica Cloud (${err?.message || 'erreur réseau'}).`);
    }
  }

  async getSession(): Promise<UserSession | null> {
    if (typeof window !== 'undefined' && window.bouticaDesktop) {
      const res = await window.bouticaDesktop.auth.getSession();
      if (!res.ok) throw new ApiError(res.network ? 0 : 500, res.error);
      return res.session;
    }
    const token = this.getStoredToken();
    if (!token) return null;
    try {
      const res = await fetch(`${this.getWebBaseUrl()}/api/auth/get-session`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(30000), // Délai suffisant pour le réveil du backend sur Render
      });
      if (res.status === 401) {
        this.clearStoredToken();
        return null;
      }
      if (!res.ok) {
        // Erreur serveur temporaire (502 Render, 503) : ne pas effacer le jeton local
        throw new ApiError(res.status, `Serveur Boutica Cloud momentanément indisponible (${res.status}).`);
      }
      const rawSession = await res.json().catch(() => null);
      if (!rawSession || (!rawSession.user && rawSession.session === null)) {
        // Confirmation explicite d'absence de session active
        this.clearStoredToken();
        return null;
      }
      if (!rawSession.user) {
        this.clearStoredToken();
        return null;
      }
      return {
        user: {
          id: String(rawSession.user.id),
          name: rawSession.user.name,
          email: rawSession.user.email,
          role: rawSession.user.role || 'OWNER',
          businessId: rawSession.user.businessId,
          businessName: rawSession.user.businessName || 'Boutica Store',
          businessCurrency: rawSession.user.businessCurrency || 'XOF',
        },
        expiresAt: rawSession.session?.expiresAt || rawSession.expiresAt,
      };
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      // Erreur réseau ou timeout : ne PAS supprimer le jeton et signaler l'indisponibilité
      throw new ApiError(0, `Serveur Boutica Cloud injoignable (${err?.message || 'délai dépassé'}).`);
    }
  }

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<void> {
    if (typeof window !== 'undefined' && window.bouticaDesktop) {
      const res = await window.bouticaDesktop.auth.changePassword(data);
      if (!res.ok) throw new ApiError(400, res.error);
      return;
    }
    const token = this.getStoredToken();
    if (!token) throw new ApiError(401, 'Veuillez vous connecter pour modifier votre mot de passe.');
    const res = await fetch(`${this.getWebBaseUrl()}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        revokeOtherSessions: true,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      throw new ApiError(res.status, d?.message || 'Impossible de mettre à jour le mot de passe.');
    }
  }

  async forgetPassword(email: string): Promise<string> {
    if (typeof window !== 'undefined' && window.bouticaDesktop) {
      const res = await window.bouticaDesktop.auth.forgetPassword(email);
      if (!res.ok) throw new ApiError(400, res.error || 'Impossible d’envoyer le lien de réinitialisation.');
      return res.message;
    }
    const res = await fetch(`${this.getWebBaseUrl()}/api/auth/forget-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
    const d = await res.json().catch(() => null);
    if (!res.ok) {
      throw new ApiError(res.status, d?.message || 'Impossible d’envoyer le lien de réinitialisation.');
    }
    return d?.message || 'Si cette adresse e-mail existe, un lien de réinitialisation vous a été envoyé.';
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (typeof window !== 'undefined' && window.bouticaDesktop) {
      const res = await window.bouticaDesktop.auth.resetPassword(token, newPassword);
      if (!res.ok) throw new ApiError(400, res.error || 'Échec de la réinitialisation du mot de passe.');
      return;
    }
    const res = await fetch(`${this.getWebBaseUrl()}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.trim(), newPassword }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      throw new ApiError(res.status, d?.message || 'Jeton invalide ou expiré.');
    }
  }

  async signInSocial(provider: 'google' | 'apple'): Promise<{ ok: boolean; session?: UserSession; notConfigured?: boolean; error?: string }> {
    if (typeof window !== 'undefined' && window.bouticaDesktop) {
      const res = await window.bouticaDesktop.auth.signInSocial(provider);
      return res;
    }
    const res = await fetch(`${this.getWebBaseUrl()}/api/auth/sign-in/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, callbackURL: window.location.origin }),
    });
    const d = await res.json().catch(() => null);
    if (res.status === 404 || /provider not found/i.test(d?.message || '')) {
      return {
        ok: false,
        notConfigured: true,
        error: `La connexion avec ${provider === 'google' ? 'Google' : 'Apple'} n'est pas configurée sur le serveur Boutica Cloud.`,
      };
    }
    if (!res.ok) {
      return { ok: false, error: d?.message || 'Erreur d’authentification sociale.' };
    }
    if (d?.url) {
      window.location.href = d.url;
      return { ok: true };
    }
    return { ok: false, error: 'Réponse inattendue du fournisseur OAuth.' };
  }

  async signOut(): Promise<{ serverConfirmed: boolean }> {
    if (typeof window !== 'undefined' && window.bouticaDesktop) {
      return window.bouticaDesktop.auth.signOut();
    }
    const token = this.getStoredToken();
    let serverConfirmed = false;
    if (token) {
      try {
        const res = await fetch(`${this.getWebBaseUrl()}/api/auth/sign-out`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: '{}',
        });
        serverConfirmed = res.ok;
      } catch {
        serverConfirmed = false;
      }
    }
    this.clearStoredToken();
    return { serverConfirmed };
  }

  onSessionExpired(cb: () => void): () => void {
    if (typeof window !== 'undefined' && window.bouticaDesktop) {
      return window.bouticaDesktop.auth.onSessionExpired(cb);
    }
    this.sessionExpiredListeners.add(cb);
    return () => {
      this.sessionExpiredListeners.delete(cb);
    };
  }

  async getApiBaseUrl(): Promise<string> {
    if (typeof window !== 'undefined' && window.bouticaDesktop) {
      return window.bouticaDesktop.config.getApiBaseUrl();
    }
    return DEFAULT_API_URL;
  }

  async setApiBaseUrl(url: string): Promise<string> {
    if (typeof window !== 'undefined' && window.bouticaDesktop) {
      const res = await bridge().config.setApiBaseUrl(url);
      if (!res.ok) throw new ApiError(0, res.error);
      return res.url;
    }
    return url;
  }

  // --- CATALOG & PRODUCTS ---
  async listProducts(params?: { category?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<Product>> {
    return this.request('GET', '/api/v1/products', { query: params });
  }

  async getProduct(id: string): Promise<Product> {
    return this.request('GET', `/api/v1/products/${enc(id)}`);
  }

  async createProduct(data: CreateProductInput): Promise<Product> {
    return this.request('POST', '/api/v1/products', { body: data });
  }

  async updateProduct(id: string, data: UpdateProductInput): Promise<Product> {
    return this.request('PATCH', `/api/v1/products/${enc(id)}`, { body: data });
  }

  async listProductVariants(productId: string, params?: { search?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<Variant>> {
    return this.request('GET', `/api/v1/products/${enc(productId)}/variants`, { query: params });
  }

  async addVariant(productId: string, data: AddVariantInput): Promise<Variant> {
    return this.request('POST', `/api/v1/products/${enc(productId)}/variants`, { body: data });
  }

  async updateVariant(productId: string, variantId: string, data: UpdateVariantInput): Promise<Variant> {
    return this.request('PATCH', `/api/v1/products/${enc(productId)}/variants/${enc(variantId)}`, { body: data });
  }

  async listAllVariants(params?: { search?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<Variant>> {
    return this.request('GET', '/api/v1/variants', { query: params });
  }

  // --- INVENTORY ---
  async getStock(variantId: string): Promise<StockItem> {
    return this.request('GET', `/api/v1/inventory/${enc(variantId)}`);
  }

  /** `quantity` est la quantité CIBLE absolue (pas un delta). */
  async adjustStock(variantId: string, data: AdjustStockInput): Promise<StockItem> {
    return this.request('POST', `/api/v1/inventory/${enc(variantId)}/adjust`, { body: data });
  }

  // --- SALES ---
  async listSales(params?: { from?: string; to?: string; customerId?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<Sale>> {
    return this.request('GET', '/api/v1/sales', { query: params });
  }

  async getSale(id: string): Promise<Sale & { items: SaleItem[] }> {
    return this.request('GET', `/api/v1/sales/${enc(id)}`);
  }

  /** La clé d'idempotence est OBLIGATOIRE ici : l'appelant la conserve pour rejouer une tentative incertaine. */
  async createSale(data: CreateSaleInput, idempotencyKey: string): Promise<Sale> {
    return this.request('POST', '/api/v1/sales', { body: data, idempotencyKey });
  }

  // --- PURCHASES ---
  async listPurchases(params?: { from?: string; to?: string; supplierId?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<Purchase>> {
    return this.request('GET', '/api/v1/purchases', { query: params });
  }

  async getPurchase(id: string): Promise<Purchase & { items: PurchaseItem[] }> {
    return this.request('GET', `/api/v1/purchases/${enc(id)}`);
  }

  async receivePurchase(data: ReceivePurchaseInput, idempotencyKey: string): Promise<Purchase> {
    return this.request('POST', '/api/v1/purchases/receive', { body: data, idempotencyKey });
  }

  // --- RETURNS ---
  async listReturns(params?: { from?: string; to?: string; saleId?: string; page?: number; pageSize?: number }): Promise<PaginatedResponse<ReturnOrder>> {
    return this.request('GET', '/api/v1/returns', { query: params });
  }

  async getReturn(id: string): Promise<ReturnOrder & { items: ReturnItem[] }> {
    return this.request('GET', `/api/v1/returns/${enc(id)}`);
  }

  async createReturn(data: CreateReturnInput, idempotencyKey: string): Promise<ReturnOrder> {
    return this.request('POST', '/api/v1/returns', { body: data, idempotencyKey });
  }

  // --- CUSTOMERS ---
  async listCustomers(params?: { page?: number; pageSize?: number }): Promise<PaginatedResponse<Customer>> {
    return this.request('GET', '/api/v1/customers', { query: params });
  }

  async getCustomer(id: string): Promise<Customer> {
    return this.request('GET', `/api/v1/customers/${enc(id)}`);
  }

  async createCustomer(data: CreateCustomerInput): Promise<Customer> {
    return this.request('POST', '/api/v1/customers', { body: data });
  }

  // --- SUPPLIERS ---
  async listSuppliers(params?: { page?: number; pageSize?: number }): Promise<PaginatedResponse<Supplier>> {
    return this.request('GET', '/api/v1/suppliers', { query: params });
  }

  async createSupplier(data: CreateSupplierInput): Promise<Supplier> {
    return this.request('POST', '/api/v1/suppliers', { body: data });
  }

  // --- EXPENSES ---
  async listExpenses(params?: { page?: number; pageSize?: number }): Promise<PaginatedResponse<Expense>> {
    return this.request('GET', '/api/v1/expenses', { query: params });
  }

  async createExpense(data: CreateExpenseInput): Promise<Expense> {
    return this.request('POST', '/api/v1/expenses', { body: data });
  }

  // --- REPORTS ---
  async getDashboardReport(params?: { from?: string; to?: string; lowStockThreshold?: number }): Promise<DashboardReport> {
    return this.request('GET', '/api/v1/reports/dashboard', { query: params });
  }

  async downloadReport(
    type: ReportDownloadType,
    params?: { from?: string; to?: string }
  ): Promise<{ filePath: string } | { canceled: true }> {
    if (typeof window !== 'undefined' && window.bouticaDesktop) {
      const res = await bridge().downloadReport(type, params);
      if (res.success && res.filePath) return { filePath: res.filePath };
      if (res.canceled) return { canceled: true };
      throw new ApiError(0, res.error ?? 'Échec du téléchargement du rapport');
    }

    const token = this.getStoredToken();
    const qs = this.buildQuery(params);
    const url = `${this.getWebBaseUrl()}/api/v1/reports/${type}${qs}`;
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError(res.status, 'Échec du téléchargement du rapport');
    const blob = await res.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    const ext = type.endsWith('/pdf') ? 'pdf' : 'xlsx';
    const filename = `boutica-rapport-${type.replace('/', '-')}-${Date.now()}.${ext}`;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
    return { filePath: filename };
  }

  async saveReceiptPdf(data: ReceiptPdfData): Promise<{ filePath: string } | { canceled: true }> {
    if (typeof window !== 'undefined' && window.bouticaDesktop) {
      const res = await window.bouticaDesktop.saveReceiptPdf(data);
      if (res.success && res.filePath) return { filePath: res.filePath };
      if (res.canceled) return { canceled: true };
      throw new ApiError(0, res.error || 'Échec de l’enregistrement du reçu PDF.');
    }
    // Web fallback: trigger browser print dialog
    window.print();
    return { filePath: 'impression-navigateur' };
  }

  async uploadProductImage(fileData: { name: string; type: string; base64: string }): Promise<{
    url?: string;
    key?: string;
    cloudUnsupported?: boolean;
    error?: string;
  }> {
    if (typeof window !== 'undefined' && window.bouticaDesktop) {
      return window.bouticaDesktop.uploadProductImage(fileData);
    }
    // Web fallback: try direct endpoint via proxy
    try {
      const res = await fetch(`${this.getWebBaseUrl()}/api/v1/media/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fileData.name, type: fileData.type }),
      });
      if (res.status === 404) {
        return {
          cloudUnsupported: true,
          error: "Le stockage R2 (/api/v1/media) n'est pas activé dans le module principal de Boutica Cloud (StorageModule manquant dans AppModule).",
        };
      }
      const d = await res.json().catch(() => null);
      if (!res.ok) return { error: d?.message || 'Échec de l’envoi de l’image' };
      return { url: d?.url, key: d?.key };
    } catch (err: any) {
      return { error: err?.message || 'Erreur réseau' };
    }
  }
}

const enc = encodeURIComponent;

export const apiClient = new BouticaApiClient();
