/**
 * Boutica Desktop — Processus principal Electron.
 *
 * Responsabilités :
 *  - fenêtre sécurisée (contextIsolation, sandbox, pas de nodeIntegration) ;
 *  - authentification Better Auth auprès de Boutica Cloud ; le jeton de session reste ICI
 *    (chiffré via safeStorage s'il est disponible, sinon en mémoire seulement) ;
 *  - proxy HTTP vers /api/v1/* (jeton Bearer ajouté ici, contourne aussi CORS depuis file://) ;
 *  - téléchargement de rapports, impression de reçus, contrôles de fenêtre.
 */
import { app, BrowserWindow, dialog, ipcMain, net, safeStorage, shell } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_API_BASE = 'https://boutica-cloud.onrender.com';
const REQUEST_TIMEOUT_MS = 60_000; // Render (offre gratuite) peut mettre ~50 s à se réveiller
const REPORT_TYPES = ['sales/excel', 'inventory/excel', 'sales/pdf', 'inventory/pdf'] as const;

let mainWindow: BrowserWindow | null = null;
let sessionToken: string | null = null; // jamais transmis au renderer
let apiBaseUrl = DEFAULT_API_BASE;

const devServerUrl = process.env.BOUTICA_DEV_SERVER_URL || null;
const rendererDir = path.join(__dirname, '..', 'dist', 'renderer');

// ───────────────────────── Stockage local (userData) ─────────────────────────

const userFile = (name: string) => path.join(app.getPath('userData'), name);

function readConfig(): { apiBaseUrl?: string } {
  try {
    return JSON.parse(fs.readFileSync(userFile('config.json'), 'utf8'));
  } catch {
    return {};
  }
}

function writeConfig(cfg: { apiBaseUrl?: string }) {
  fs.writeFileSync(userFile('config.json'), JSON.stringify(cfg), 'utf8');
}

/** https obligatoire, sauf http://localhost / 127.0.0.1 pour le développement. */
function normalizeBaseUrl(raw: string): string | null {
  try {
    const u = new URL(raw.trim());
    if (u.username || u.password || u.search || u.hash) return null;
    const isLocal = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    if (u.protocol !== 'https:' && !(u.protocol === 'http:' && isLocal)) return null;
    return u.origin + u.pathname.replace(/\/+$/, '');
  } catch {
    return null;
  }
}

function persistToken(token: string | null) {
  const file = userFile('session.bin');
  try {
    if (!token) {
      fs.rmSync(file, { force: true });
      return;
    }
    // Pas de chiffrement disponible => on ne persiste PAS le jeton (session limitée à l'exécution).
    if (safeStorage.isEncryptionAvailable()) {
      fs.writeFileSync(file, safeStorage.encryptString(token));
    }
  } catch {
    /* le stockage est un confort : l'échec ne doit pas bloquer l'application */
  }
}

function loadPersistedToken(): string | null {
  try {
    if (!safeStorage.isEncryptionAvailable()) return null;
    return safeStorage.decryptString(fs.readFileSync(userFile('session.bin')));
  } catch {
    return null;
  }
}

function setToken(token: string | null) {
  sessionToken = token;
  persistToken(token);
}

function notifySessionExpired() {
  setToken(null);
  mainWindow?.webContents.send('boutica:session-expired');
}

// ───────────────────────── HTTP vers Boutica Cloud ─────────────────────────

interface RawResult {
  status: number; // 0 = réseau / délai
  ok: boolean;
  headers: Headers | null;
  bytes: Buffer | null;
  error?: string;
}

async function cloudFetch(
  pathAndQuery: string,
  init: { method: string; body?: string; idempotencyKey?: string; token?: string | null; json?: boolean }
): Promise<RawResult> {
  const headers: Record<string, string> = { Accept: init.json === false ? '*/*' : 'application/json' };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  const token = init.token === undefined ? sessionToken : init.token;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (init.idempotencyKey) headers['Idempotency-Key'] = init.idempotencyKey;

  try {
    const res = await net.fetch(apiBaseUrl + pathAndQuery, {
      method: init.method,
      headers,
      body: init.body,
      credentials: 'omit',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const bytes = Buffer.from(await res.arrayBuffer());
    return { status: res.status, ok: res.ok, headers: res.headers, bytes };
  } catch (err) {
    const timeout = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
    return {
      status: 0,
      ok: false,
      headers: null,
      bytes: null,
      error: timeout
        ? 'Le serveur Boutica Cloud ne répond pas (délai dépassé). Il est peut-être en cours de démarrage : réessayez dans un instant.'
        : 'Impossible de contacter le serveur Boutica Cloud. Vérifiez votre connexion.',
    };
  }
}

function parseJson(bytes: Buffer | null): unknown {
  if (!bytes || bytes.length === 0) return null;
  try {
    return JSON.parse(bytes.toString('utf8'));
  } catch {
    return undefined; // contenu non JSON
  }
}

/** Extrait un message lisible des erreurs NestJS ({message: string | string[]}) et Better Auth ({message, code}). */
function errorMessageFrom(status: number, data: unknown, bytes: Buffer | null): string {
  if (data && typeof data === 'object') {
    const d = data as { message?: unknown; error?: unknown };
    if (Array.isArray(d.message)) return d.message.map(String).join(', ');
    if (typeof d.message === 'string' && d.message) return d.message;
    if (typeof d.error === 'string' && d.error) return d.error;
  }
  const text = bytes?.toString('utf8').trim();
  if (text && !text.startsWith('<')) return text.slice(0, 200);
  return `Erreur serveur (${status})`;
}

function toBridgeError(r: RawResult, data: unknown): string {
  return r.status === 0 ? r.error ?? 'Serveur injoignable' : errorMessageFrom(r.status, data, r.bytes);
}

// ───────────────────────── Validation ─────────────────────────

function isTrustedSender(event: IpcMainInvokeEvent): boolean {
  const url = event.senderFrame?.url ?? '';
  if (devServerUrl && url.startsWith(devServerUrl)) return true;
  return url.startsWith(pathToFileURL(rendererDir).href);
}

function isAllowedApiPath(p: unknown): p is string {
  return (
    typeof p === 'string' &&
    (p === '/health' || p.startsWith('/api/v1/')) &&
    !p.includes('..') &&
    !p.includes('?') &&
    !p.includes('#') &&
    !p.includes('//') &&
    !/[\\\s]/.test(p)
  );
}

function buildQuery(query: Record<string, unknown> | undefined): string {
  if (!query) return '';
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

function validateSession(data: unknown) {
  if (!data || typeof data !== 'object') return null;
  const d = data as { user?: Record<string, unknown>; session?: Record<string, unknown> };
  const u = d.user;
  if (!u || typeof u.id !== 'string' || typeof u.email !== 'string') return null;
  return {
    user: {
      id: u.id,
      name: typeof u.name === 'string' ? u.name : undefined,
      email: u.email,
      role: u.role === 'OWNER' || u.role === 'STAFF' ? (u.role as 'OWNER' | 'STAFF') : undefined,
      businessId: typeof u.businessId === 'string' ? u.businessId : undefined,
      businessName: typeof u.businessName === 'string' ? u.businessName : undefined,
      businessCurrency: typeof u.businessCurrency === 'string' ? u.businessCurrency : undefined,
    },
    expiresAt: d.session && typeof d.session.expiresAt === 'string' ? d.session.expiresAt : undefined,
  };
}

// ───────────────────────── Fenêtre ─────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    title: 'Boutica Desktop — Gestion Commerciale',
    backgroundColor: '#FDFDFD',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // CSP stricte en production. Le renderer n'émet aucune requête réseau : tout passe par l'IPC.
  if (!devServerUrl) {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
              "font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'none'; " +
              "object-src 'none'; base-uri 'self'; form-action 'none'",
          ],
        },
      });
    });
  }

  if (devServerUrl) {
    void mainWindow.loadURL(devServerUrl);
  } else {
    void mainWindow.loadFile(path.join(rendererDir, 'index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = devServerUrl ? url.startsWith(devServerUrl) : url.startsWith(pathToFileURL(rendererDir).href);
    if (!allowed) event.preventDefault();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ───────────────────────── IPC ─────────────────────────

function registerIpc() {
  ipcMain.handle('boutica:window-minimize', (e) => isTrustedSender(e) && mainWindow?.minimize());
  ipcMain.handle('boutica:window-maximize', (e) => {
    if (!isTrustedSender(e)) return;
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });
  ipcMain.handle('boutica:window-close', (e) => isTrustedSender(e) && mainWindow?.close());
  ipcMain.handle('boutica:window-is-maximized', (e) => (isTrustedSender(e) ? mainWindow?.isMaximized() ?? false : false));

  // Configuration
  ipcMain.handle('boutica:config-get-api-url', (e) => (isTrustedSender(e) ? apiBaseUrl : DEFAULT_API_BASE));
  ipcMain.handle('boutica:config-set-api-url', (e, url: unknown) => {
    if (!isTrustedSender(e)) return { ok: false, error: 'Appel non autorisé' };
    const normalized = typeof url === 'string' ? normalizeBaseUrl(url) : null;
    if (!normalized) return { ok: false, error: 'Adresse invalide : https:// obligatoire (http:// toléré uniquement pour localhost).' };
    if (normalized !== apiBaseUrl) {
      apiBaseUrl = normalized;
      writeConfig({ apiBaseUrl });
      setToken(null); // une session n'est valable que pour le serveur qui l'a émise
      mainWindow?.webContents.send('boutica:session-expired');
    }
    return { ok: true, url: apiBaseUrl };
  });

  // Authentification (Better Auth, hors /api/v1)
  ipcMain.handle('boutica:auth-sign-in', async (e, email: unknown, password: unknown) => {
    if (!isTrustedSender(e)) return { ok: false, error: 'Appel non autorisé' };
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return { ok: false, error: 'Veuillez renseigner votre email et mot de passe.' };
    }
    const r = await cloudFetch('/api/auth/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      token: null,
    });
    const data = parseJson(r.bytes);
    if (!r.ok) {
      return { ok: false, error: r.status === 401 || r.status === 400 ? 'Email ou mot de passe incorrect.' : toBridgeError(r, data) };
    }
    // Le plugin bearer renvoie le jeton signé dans l'en-tête `set-auth-token` ; repli sur le corps ({ token }).
    const headerToken = r.headers?.get('set-auth-token');
    const bodyToken = data && typeof data === 'object' ? (data as { token?: unknown }).token : undefined;
    const token = headerToken || (typeof bodyToken === 'string' ? bodyToken : null);
    if (!token) return { ok: false, error: 'Réponse de connexion inattendue : aucun jeton de session reçu.' };

    // La connexion n'est valide que si la session est confirmée par le serveur avec ce jeton.
    const s = await cloudFetch('/api/auth/get-session', { method: 'GET', token });
    const sessionData = parseJson(s.bytes);
    const session = s.ok ? validateSession(sessionData) : null;
    if (!session) return { ok: false, error: 'Connexion refusée : la session n’a pas pu être vérifiée auprès du serveur.' };

    setToken(token);
    return { ok: true, session };
  });

  ipcMain.handle('boutica:auth-sign-up', async (e, payload: unknown) => {
    if (!isTrustedSender(e)) return { ok: false, error: 'Appel non autorisé' };
    const p = payload as {
      name?: unknown;
      email?: unknown;
      password?: unknown;
      businessName?: unknown;
      businessCurrency?: unknown;
    };
    if (
      !p ||
      typeof p.email !== 'string' ||
      typeof p.password !== 'string' ||
      typeof p.name !== 'string' ||
      typeof p.businessName !== 'string'
    ) {
      return { ok: false, error: 'Informations d’inscription incomplètes.' };
    }

    const r = await cloudFetch('/api/auth/sign-up/email', {
      method: 'POST',
      body: JSON.stringify({
        name: p.name.trim(),
        email: p.email.trim(),
        password: p.password,
        businessName: p.businessName.trim(),
        businessCurrency: typeof p.businessCurrency === 'string' ? p.businessCurrency.trim() : undefined,
      }),
      token: null,
    });
    const data = parseJson(r.bytes);
    if (!r.ok) {
      return { ok: false, error: toBridgeError(r, data) };
    }

    const headerToken = r.headers?.get('set-auth-token');
    const bodyToken = data && typeof data === 'object' ? (data as { token?: unknown }).token : undefined;
    const token = headerToken || (typeof bodyToken === 'string' ? bodyToken : null);

    if (token) {
      const s = await cloudFetch('/api/auth/get-session', { method: 'GET', token });
      const sessionData = parseJson(s.bytes);
      const session = s.ok ? validateSession(sessionData) : null;
      if (session) {
        setToken(token);
        return { ok: true, session };
      }
    }

    // Tenter la connexion automatique si Better Auth n'a pas retourné le token directement
    const loginRes = await cloudFetch('/api/auth/sign-in/email', {
      method: 'POST',
      body: JSON.stringify({ email: p.email.trim(), password: p.password }),
      token: null,
    });
    const loginData = parseJson(loginRes.bytes);
    const loginToken =
      loginRes.headers?.get('set-auth-token') ||
      (loginData && typeof loginData === 'object' ? (loginData as { token?: unknown }).token : null);
    if (loginToken && typeof loginToken === 'string') {
      const s = await cloudFetch('/api/auth/get-session', { method: 'GET', token: loginToken });
      const session = s.ok ? validateSession(parseJson(s.bytes)) : null;
      if (session) {
        setToken(loginToken);
        return { ok: true, session };
      }
    }

    return { ok: false, error: 'Compte créé mais session impossible à initialiser. Veuillez vous connecter.' };
  });

  ipcMain.handle('boutica:auth-change-password', async (e, payload: unknown) => {
    if (!isTrustedSender(e)) return { ok: false, error: 'Appel non autorisé' };
    if (!sessionToken) return { ok: false, error: 'Session expirée. Veuillez vous reconnecter.' };
    const p = payload as { currentPassword?: unknown; newPassword?: unknown };
    if (!p || typeof p.currentPassword !== 'string' || typeof p.newPassword !== 'string') {
      return { ok: false, error: 'Champs de mot de passe invalides.' };
    }
    if (p.newPassword.length < 10) {
      return { ok: false, error: 'Le nouveau mot de passe doit comporter au moins 10 caractères.' };
    }
    const r = await cloudFetch('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: p.currentPassword,
        newPassword: p.newPassword,
        revokeOtherSessions: true,
      }),
    });
    const data = parseJson(r.bytes);
    if (!r.ok) {
      return { ok: false, error: toBridgeError(r, data) };
    }
    return { ok: true };
  });

  ipcMain.handle('boutica:auth-get-session', async (e) => {
    if (!isTrustedSender(e)) return { ok: false, error: 'Appel non autorisé', network: false };
    if (!sessionToken) return { ok: true, session: null };
    const r = await cloudFetch('/api/auth/get-session', { method: 'GET' });
    if (r.status === 0 || r.status >= 500) {
      // Panne réseau ou serveur en cours de démarrage (Render 502/503) : ne pas déconnecter !
      return { ok: false, error: toBridgeError(r, parseJson(r.bytes)), network: true };
    }
    const data = parseJson(r.bytes);
    if (r.status === 401) {
      setToken(null);
      return { ok: true, session: null };
    }
    if (!r.ok) return { ok: false, error: toBridgeError(r, data), network: false };
    const session = validateSession(data);
    if (!session) {
      setToken(null);
      return { ok: true, session: null };
    }
    return { ok: true, session };
  });

  ipcMain.handle('boutica:auth-sign-out', async (e) => {
    if (!isTrustedSender(e)) return { serverConfirmed: false };
    let serverConfirmed = false;
    if (sessionToken) {
      const r = await cloudFetch('/api/auth/sign-out', { method: 'POST', body: '{}' });
      serverConfirmed = r.ok;
    }
    setToken(null); // l'état local est toujours effacé
    return { serverConfirmed };
  });

  // Appels métier
  ipcMain.handle('boutica:api-request', async (e, req: unknown) => {
    if (!isTrustedSender(e)) return { ok: false, status: 0, data: null, error: 'Appel non autorisé' };
    const r0 = req as { method?: string; path?: unknown; query?: Record<string, unknown>; body?: unknown; idempotencyKey?: unknown };
    if (!r0 || !['GET', 'POST', 'PATCH'].includes(String(r0.method)) || !isAllowedApiPath(r0.path)) {
      return { ok: false, status: 0, data: null, error: 'Requête invalide' };
    }
    if (r0.path !== '/health' && !sessionToken) {
      notifySessionExpired();
      return { ok: false, status: 401, data: null, error: 'Session expirée. Veuillez vous reconnecter.' };
    }
    const idem = typeof r0.idempotencyKey === 'string' && r0.idempotencyKey.length <= 128 ? r0.idempotencyKey : undefined;
    const r = await cloudFetch(r0.path + buildQuery(r0.query), {
      method: String(r0.method),
      body: r0.body === undefined ? undefined : JSON.stringify(r0.body),
      idempotencyKey: idem,
    });
    if (r.status === 401 && r0.path !== '/health') notifySessionExpired();
    const data = r.status === 204 ? null : parseJson(r.bytes);
    if (r.ok && data === undefined) {
      return { ok: false, status: r.status, data: null, error: 'Réponse inattendue du serveur (JSON attendu).' };
    }
    return r.ok
      ? { ok: true, status: r.status, data }
      : { ok: false, status: r.status, data, error: toBridgeError(r, data) };
  });

  // Rapports binaires (Excel / PDF) : téléchargement vers un fichier choisi par l'utilisateur
  ipcMain.handle('boutica:download-report', async (e, type: unknown, params: { from?: string; to?: string } | undefined) => {
    if (!isTrustedSender(e) || !mainWindow) return { success: false, error: 'Appel non autorisé' };
    if (!REPORT_TYPES.includes(type as (typeof REPORT_TYPES)[number])) return { success: false, error: 'Type de rapport invalide' };
    if (!sessionToken) {
      notifySessionExpired();
      return { success: false, error: 'Session expirée. Veuillez vous reconnecter.' };
    }
    const r = await cloudFetch(`/api/v1/reports/${type as string}${buildQuery(params)}`, { method: 'GET', json: false });
    if (r.status === 401) notifySessionExpired();
    if (!r.ok || !r.bytes) {
      const data = r.bytes ? parseJson(r.bytes) : null;
      const msg = r.status === 404 ? 'Cet export n’est pas disponible sur le serveur Boutica Cloud.' : toBridgeError(r, data);
      return { success: false, error: msg };
    }
    const contentType = r.headers?.get('content-type') ?? '';
    if (/json|html/i.test(contentType)) return { success: false, error: 'Réponse inattendue : le serveur n’a pas renvoyé un fichier.' };

    const disposition = r.headers?.get('content-disposition') ?? '';
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
    const ext = (type as string).endsWith('pdf') ? 'pdf' : 'xlsx';
    const fallbackName = `boutica-${(type as string).replace('/', '-')}.${ext}`;
    const defaultName = match ? path.basename(decodeURIComponent(match[1])) : fallbackName;

    const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, { defaultPath: defaultName });
    if (canceled || !filePath) return { success: false, canceled: true };
    try {
      await fs.promises.writeFile(filePath, r.bytes);
      return { success: true, filePath };
    } catch {
      return { success: false, error: 'Impossible d’écrire le fichier à cet emplacement.' };
    }
  });

  // Impression de reçu (HTML statique, sans JavaScript)
  ipcMain.handle('boutica:print-receipt', async (e, html: unknown) => {
    if (!isTrustedSender(e)) return { success: false, error: 'Appel non autorisé' };
    if (typeof html !== 'string' || html.length === 0 || html.length > 200_000) return { success: false, error: 'Contenu de reçu invalide' };
    const printWin = new BrowserWindow({
      show: false,
      webPreferences: { javascript: false, sandbox: true, contextIsolation: true, nodeIntegration: false },
    });
    try {
      await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    } catch {
      printWin.close();
      return { success: false, error: 'Impossible de préparer le reçu' };
    }
    return new Promise<{ success: boolean; error?: string }>((resolve) => {
      printWin.webContents.print(
        { silent: false, printBackground: true, pageSize: { width: 80000, height: 200000 } },
        (success, failureReason) => {
          printWin.close();
          resolve(success ? { success: true } : { success: false, error: failureReason || 'Impression annulée ou échouée' });
        }
      );
    });
  });
}

// ───────────────────────── Cycle de vie ─────────────────────────

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  void app.whenReady().then(() => {
    const envUrl = process.env.BOUTICA_API_URL ? normalizeBaseUrl(process.env.BOUTICA_API_URL) : null;
    const stored = readConfig().apiBaseUrl ? normalizeBaseUrl(readConfig().apiBaseUrl as string) : null;
    apiBaseUrl = envUrl ?? stored ?? DEFAULT_API_BASE;
    sessionToken = loadPersistedToken(); // validé auprès du serveur par le renderer au démarrage
    registerIpc();
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
