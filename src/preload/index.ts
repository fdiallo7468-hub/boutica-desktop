/**
 * Boutica Desktop — Preload (bridge IPC minimal et typé).
 * Aucune primitive Node ni aucun jeton n'est exposé au renderer.
 */
import { contextBridge, ipcRenderer } from 'electron';
import type { BouticaDesktopAPI } from '../renderer/types/desktop.ts';

const api: BouticaDesktopAPI = {
  isElectron: true,
  platform: process.platform as BouticaDesktopAPI['platform'],
  version: '0.1.0',

  minimizeWindow: () => ipcRenderer.invoke('boutica:window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('boutica:window-maximize'),
  closeWindow: () => ipcRenderer.invoke('boutica:window-close'),
  isMaximized: () => ipcRenderer.invoke('boutica:window-is-maximized'),

  api: (req) => ipcRenderer.invoke('boutica:api-request', req),

  auth: {
    signIn: (email, password) => ipcRenderer.invoke('boutica:auth-sign-in', email, password),
    signUp: (data) => ipcRenderer.invoke('boutica:auth-sign-up', data),
    changePassword: (data) => ipcRenderer.invoke('boutica:auth-change-password', data),
    getSession: () => ipcRenderer.invoke('boutica:auth-get-session'),
    signOut: () => ipcRenderer.invoke('boutica:auth-sign-out'),
    onSessionExpired: (cb) => {
      const listener = () => cb();
      ipcRenderer.on('boutica:session-expired', listener);
      return () => ipcRenderer.removeListener('boutica:session-expired', listener);
    },
  },

  config: {
    getApiBaseUrl: () => ipcRenderer.invoke('boutica:config-get-api-url'),
    setApiBaseUrl: (url) => ipcRenderer.invoke('boutica:config-set-api-url', url),
  },

  downloadReport: (type, params) => ipcRenderer.invoke('boutica:download-report', type, params),
  printReceipt: (html) => ipcRenderer.invoke('boutica:print-receipt', html),
};

contextBridge.exposeInMainWorld('bouticaDesktop', api);
