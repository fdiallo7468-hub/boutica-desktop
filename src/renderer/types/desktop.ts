/**
 * Contrat entre le renderer et le processus principal Electron (exposé par le preload).
 * Le jeton de session Better Auth reste dans le processus principal : le renderer ne le voit jamais.
 */

export type HttpMethod = 'GET' | 'POST' | 'PATCH';

export interface BridgeRequest {
  method: HttpMethod;
  /** Chemin commençant par /api/v1/ (ou /health). Jamais d'URL absolue. */
  path: string;
  query?: Record<string, string | number | undefined | null>;
  body?: unknown;
  idempotencyKey?: string;
}

export interface BridgeResponse {
  ok: boolean;
  /** 0 = serveur injoignable / délai dépassé. */
  status: number;
  data: unknown;
  /** Message lisible, présent si !ok. */
  error?: string;
}

export interface BridgeSession {
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

export type ReportDownloadType = 'sales/excel' | 'inventory/excel' | 'sales/pdf' | 'inventory/pdf';

export interface ReceiptPdfData {
  saleId: string;
  saleDate: string;
  businessName?: string;
  storeName?: string;
  businessAddress?: string;
  storeAddress?: string;
  businessPhone?: string;
  businessCurrency?: string;
  customerName?: string;
  paymentMethod?: string;
  notes?: string;
  items: Array<{
    name: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
}

export interface BouticaDesktopAPI {
  isElectron: true;
  platform: 'win32' | 'darwin' | 'linux';
  version: string;

  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  isMaximized: () => Promise<boolean>;

  api: (req: BridgeRequest) => Promise<BridgeResponse>;

  auth: {
    signIn: (email: string, password: string) => Promise<{ ok: true; session: BridgeSession } | { ok: false; error: string }>;
    signUp: (data: {
      name: string;
      email: string;
      password: string;
      businessName: string;
      businessCurrency?: string;
    }) => Promise<{ ok: true; session: BridgeSession } | { ok: false; error: string }>;
    changePassword: (data: {
      currentPassword: string;
      newPassword: string;
    }) => Promise<{ ok: true } | { ok: false; error: string }>;
    forgetPassword: (email: string) => Promise<{ ok: boolean; message: string; error?: string }>;
    resetPassword: (token: string, newPassword: string) => Promise<{ ok: boolean; error?: string }>;
    signInSocial: (provider: 'google' | 'apple') => Promise<{
      ok: boolean;
      session?: BridgeSession;
      error?: string;
      notConfigured?: boolean;
    }>;
    getSession: () => Promise<{ ok: true; session: BridgeSession | null } | { ok: false; error: string; network: boolean }>;
    signOut: () => Promise<{ serverConfirmed: boolean }>;
    onSessionExpired: (cb: () => void) => () => void;
  };

  config: {
    getApiBaseUrl: () => Promise<string>;
    setApiBaseUrl: (url: string) => Promise<{ ok: true; url: string } | { ok: false; error: string }>;
  };

  downloadReport: (
    type: ReportDownloadType,
    params?: { from?: string; to?: string }
  ) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;

  printReceipt: (htmlContent: string) => Promise<{ success: boolean; error?: string }>;

  saveReceiptPdf: (data: ReceiptPdfData) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;

  uploadProductImage: (fileData: { name: string; type: string; base64: string }) => Promise<{
    success: boolean;
    url?: string;
    key?: string;
    error?: string;
    cloudUnsupported?: boolean;
  }>;
}

declare global {
  interface Window {
    bouticaDesktop?: BouticaDesktopAPI;
  }
}
