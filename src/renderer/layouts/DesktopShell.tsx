import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Receipt,
  Truck,
  RotateCcw,
  Users,
  Building2,
  Wallet,
  FileSpreadsheet,
  Settings,
  Search,
  Minus,
  Square,
  X,
  LogOut,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Keyboard,
} from 'lucide-react';
import { useUIStore, AppPage } from '../store/uiStore.ts';
import { BouticaLogo } from '../components/ui/BouticaLogo.tsx';
import { apiClient } from '../lib/api-client.ts';
import { toast } from 'sonner';

interface DesktopShellProps {
  children: React.ReactNode;
}

export const DesktopShell: React.FC<DesktopShellProps> = ({ children }) => {
  const {
    currentPage,
    setCurrentPage,
    isSidebarCollapsed,
    toggleSidebar,
    setCommandPaletteOpen,
    setShortcutsModalOpen,
    isOnline,
    setOnline,
    isBackendHealthy,
    setBackendHealthy,
    session,
    setSession,
  } = useUIStore();

  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.bouticaDesktop?.isElectron) {
      setIsElectron(true);
    }

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Auto-collapse sidebar if screen is narrow (on mount & resize)
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        if (!useUIStore.getState().isSidebarCollapsed) {
          useUIStore.getState().toggleSidebar();
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Initial backend health check
    apiClient
      .checkHealth()
      .then(() => setBackendHealthy(true))
      .catch(() => setBackendHealthy(false));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('resize', handleResize);
    };
  }, [setOnline, setBackendHealthy]);

  const handleSignOut = async () => {
    try {
      const { serverConfirmed } = await apiClient.signOut();
      if (serverConfirmed) {
        toast.success('Déconnexion effectuée');
      } else {
        toast.warning('Session locale fermée, mais la déconnexion n’a pas pu être confirmée par le serveur.');
      }
    } catch {
      toast.warning('Session locale fermée, mais la déconnexion n’a pas pu être confirmée par le serveur.');
    } finally {
      setSession(null); // l'accès aux pages métier est coupé dans tous les cas
    }
  };

  const navItems: Array<{ page: AppPage; label: string; icon: React.ReactNode; badge?: string }> = [
    { page: 'dashboard', label: 'Tableau de bord', icon: <LayoutDashboard className="w-5 h-5" />, badge: 'Ctrl+1' },
    { page: 'pos', label: 'Caisse POS', icon: <ShoppingCart className="w-5 h-5" />, badge: 'F2' },
    { page: 'products', label: 'Produits & Variantes', icon: <Package className="w-5 h-5" />, badge: 'Ctrl+2' },
    { page: 'inventory', label: 'Gestion des Stocks', icon: <Boxes className="w-5 h-5" />, badge: 'Ctrl+3' },
    { page: 'sales', label: 'Historique des Ventes', icon: <Receipt className="w-5 h-5" />, badge: 'Ctrl+4' },
    { page: 'purchases', label: 'Réception Achats', icon: <Truck className="w-5 h-5" />, badge: 'Ctrl+5' },
    { page: 'returns', label: 'Retours Marchandises', icon: <RotateCcw className="w-5 h-5" />, badge: 'Ctrl+9' },
    { page: 'customers', label: 'Clients', icon: <Users className="w-5 h-5" />, badge: 'Ctrl+6' },
    { page: 'suppliers', label: 'Fournisseurs', icon: <Building2 className="w-5 h-5" />, badge: 'Ctrl+8' },
    { page: 'expenses', label: 'Dépenses', icon: <Wallet className="w-5 h-5" />, badge: 'Ctrl+7' },
    { page: 'reports', label: 'Rapports & Exports', icon: <FileSpreadsheet className="w-5 h-5" />, badge: 'Ctrl+0' },
    { page: 'settings', label: 'Paramètres', icon: <Settings className="w-5 h-5" />, badge: 'Ctrl+,' },
  ];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#FDFDFD] text-[#2B282C]">
      {/* 1. Desktop Application Titlebar */}
      <header className="drag-region h-10 w-full bg-[#FFFFFF] border-b border-[#E5E2E3] flex items-center justify-between px-3 shrink-0 select-none z-20">
        {/* Left: Window Title & Brand */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Basculer le menu latéral"
            className="p-1 rounded-md text-[#706C70] hover:text-[#2B282C] hover:bg-[#F7F6F6] lg:hidden"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${!isSidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>
          <BouticaLogo variant="mark" size="sm" />
          <span className="text-xs font-bold text-[#2B282C] tracking-tight">
            Boutica Desktop
          </span>
          <span className="text-[10px] text-[#706C70] hidden xl:inline">
            — Gestion Commerciale (Boutica Construction)
          </span>
        </div>

        {/* Center: Command Palette & Shortcuts Trigger */}
        <div className="no-drag flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            aria-label="Ouvrir la palette de commandes (Ctrl+K)"
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 rounded-[10px] bg-[#F7F6F6] hover:bg-[#EAE8E9] border border-[#E5E2E3] text-xs text-[#706C70] transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-[#9A050E]" />
            <span className="hidden sm:inline">Rechercher ou actionner...</span>
            <kbd className="font-mono text-[10px] px-1 sm:px-1.5 py-0.2 rounded bg-white border border-[#E5E2E3] text-[#2B282C]">
              Ctrl+K
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => setShortcutsModalOpen(true)}
            aria-label="Guide des raccourcis clavier (F1)"
            title="Guide des 15 raccourcis clavier (F1)"
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-[10px] bg-[#F7F6F6] hover:bg-[#EAE8E9] border border-[#E5E2E3] text-xs text-[#706C70] transition-colors"
          >
            <Keyboard className="w-3.5 h-3.5 text-[#706C70]" />
            <span className="hidden lg:inline">Raccourcis</span>
            <kbd className="font-mono text-[10px] px-1 sm:px-1.5 py-0.2 rounded bg-white border border-[#E5E2E3] text-[#9A050E] font-bold">
              F1
            </kbd>
          </button>
        </div>

        {/* Right: Connectivity & Window Controls */}
        <div className="no-drag flex items-center gap-2">
          {/* Status Indicator */}
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
              isOnline && isBackendHealthy !== false
                ? 'bg-[#EAF6EF] text-[#16804A]'
                : 'bg-[#FCEAEC] text-[#C62828]'
            }`}
            title={
              isOnline && isBackendHealthy !== false
                ? 'Connecté à Boutica Cloud'
                : 'Serveur Boutica Cloud déconnecté'
            }
          >
            {isOnline && isBackendHealthy !== false ? (
              <>
                <Wifi className="w-3 h-3" />
                <span className="hidden md:inline">En ligne</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3" />
                <span className="hidden md:inline">Hors-ligne</span>
              </>
            )}
          </div>

          {/* Native Window Controls (Desktop Electron or Mocked in Browser) */}
          <div className="flex items-center ml-2 border-l border-[#E5E2E3] pl-2">
            <button
              type="button"
              onClick={() => window.bouticaDesktop?.minimizeWindow()}
              aria-label="Réduire"
              className="p-1 rounded hover:bg-[#F7F6F6] text-[#706C70] transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => window.bouticaDesktop?.maximizeWindow()}
              aria-label="Agrandir"
              className="p-1 rounded hover:bg-[#F7F6F6] text-[#706C70] transition-colors"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => window.bouticaDesktop?.closeWindow()}
              aria-label="Fermer"
              className="p-1 rounded hover:bg-[#C62828] hover:text-white text-[#706C70] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Offline / Degradation Warning Alert */}
      {(!isOnline || isBackendHealthy === false) && (
        <div className="bg-[#FFF4DF] border-b border-[#D99016]/30 px-4 py-1.5 flex items-center justify-between text-xs text-[#995B00] shrink-0">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-[#D99016]" />
            <span>
              <strong>Attention :</strong> Le serveur Boutica Cloud est actuellement inaccessible.
              Aucune donnée n’est mise en cache : les consultations et les enregistrements
              nécessitent une connexion active.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              apiClient.checkHealth()
                .then(() => {
                  setBackendHealthy(true);
                  toast.success('Connexion rétablie avec Boutica Cloud');
                })
                .catch(() => toast.error('Toujours inaccessible'));
            }}
            className="underline font-semibold hover:text-[#5F0203]"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* 3. Main Workspace with Sidebar and Content Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Navigation Sidebar */}
        <aside
          className={`bg-white border-r border-[#E5E2E3] flex flex-col justify-between shrink-0 transition-all duration-200 z-10 ${
            isSidebarCollapsed ? 'w-16 sm:w-18' : 'w-56 sm:w-64'
          }`}
        >
          {/* Top Brand & Actions */}
          <div className="flex flex-col p-2.5 sm:p-3 space-y-3">
            {/* Logo */}
            <div className="flex items-center justify-between px-1 py-1">
              {isSidebarCollapsed ? (
                <div className="mx-auto cursor-pointer" onClick={toggleSidebar}>
                  <BouticaLogo variant="app-icon" size="sm" />
                </div>
              ) : (
                <div className="cursor-pointer" onClick={() => setCurrentPage('dashboard')}>
                  <BouticaLogo variant="full" size="md" />
                </div>
              )}
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label={isSidebarCollapsed ? 'Développer le menu' : 'Réduire le menu'}
                className="p-1.5 rounded-lg text-[#706C70] hover:text-[#2B282C] hover:bg-[#F7F6F6] hidden md:block"
              >
                {isSidebarCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Quick Action: New Sale (POS) */}
            <button
              type="button"
              onClick={() => setCurrentPage('pos')}
              className={`flex items-center gap-3 w-full py-2.5 px-3 rounded-[12px] font-semibold text-sm transition-all shadow-xs ${
                currentPage === 'pos'
                  ? 'bg-[#5F0203] text-white'
                  : 'bg-[#9A050E] text-white hover:bg-[#AA3035] active:bg-[#5F0203]'
              } ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
              title="Nouvelle Vente Caisse (F2)"
            >
              <ShoppingCart className="w-5 h-5 shrink-0" />
              {!isSidebarCollapsed && (
                <div className="flex items-center justify-between w-full">
                  <span>Nouvelle Vente</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/20">F2</span>
                </div>
              )}
            </button>

            {/* Navigation links */}
            <nav className="space-y-0.5 pt-1 overflow-y-auto max-h-[calc(100vh-250px)]">
              {navItems.map((item) => {
                const isActive = currentPage === item.page;
                return (
                  <button
                    key={item.page}
                    type="button"
                    onClick={() => setCurrentPage(item.page)}
                    className={`flex items-center gap-3 w-full py-2 px-3 rounded-[10px] text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#FCEAEC] text-[#9A050E] font-semibold'
                        : 'text-[#706C70] hover:text-[#2B282C] hover:bg-[#F7F6F6]'
                    } ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
                    title={item.label}
                  >
                    <span className={isActive ? 'text-[#9A050E]' : 'text-[#706C70]'}>
                      {item.icon}
                    </span>
                    {!isSidebarCollapsed && (
                      <span className="truncate flex-1 text-left">{item.label}</span>
                    )}
                    {!isSidebarCollapsed && item.badge && (
                      <span className="text-[10px] font-mono text-[#9A050E] font-bold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom: Current User Account & Sign Out */}
          <div className="p-2.5 sm:p-3 border-t border-[#E5E2E3] bg-[#FDFDFD]">
            <div className={`flex items-center gap-2.5 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-[#FCEAEC] text-[#9A050E] flex items-center justify-center font-bold text-xs shrink-0">
                {session?.user.name ? session.user.name.slice(0, 2).toUpperCase() : 'BO'}
              </div>
              {!isSidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[#2B282C] truncate">
                    {session?.user.name || 'Gérant Boutica'}
                  </div>
                  <div className="text-[11px] text-[#706C70] truncate">
                    {session?.user.email || 'commerce@boutica.ci'}
                  </div>
                </div>
              )}
              {!isSidebarCollapsed && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Se déconnecter"
                  aria-label="Se déconnecter"
                  className="p-1.5 rounded-lg text-[#706C70] hover:text-[#C62828] hover:bg-[#FCEAEC] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Dynamic Content Viewport */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-[#FDFDFD] p-3 sm:p-4 md:p-6 focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
};
