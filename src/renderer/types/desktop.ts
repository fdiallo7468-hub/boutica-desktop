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
}

declare global {
  interface Window {
    bouticaDesktop?: BouticaDesktopAPI;
  }
}
