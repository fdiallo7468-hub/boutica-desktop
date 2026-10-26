import React, { useCallback, useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { useUIStore } from './renderer/store/uiStore.ts';
import { apiClient } from './renderer/lib/api-client.ts';
import { DesktopShell } from './renderer/layouts/DesktopShell.tsx';
import { SplashScreen } from './renderer/pages/SplashScreen.tsx';
import { WelcomeScreen } from './renderer/pages/WelcomeScreen.tsx';
import { OnboardingScreen } from './renderer/pages/OnboardingScreen.tsx';
import { LoginPage } from './renderer/pages/LoginPage.tsx';
import { RegisterPage } from './renderer/pages/RegisterPage.tsx';
import { DashboardPage } from './renderer/pages/DashboardPage.tsx';
import { PosSalePage } from './renderer/pages/PosSalePage.tsx';
import { ProductsPage } from './renderer/pages/ProductsPage.tsx';
import { InventoryPage } from './renderer/pages/InventoryPage.tsx';
import { SalesHistoryPage } from './renderer/pages/SalesHistoryPage.tsx';
import { PurchasesPage } from './renderer/pages/PurchasesPage.tsx';
import { ReturnsPage } from './renderer/pages/ReturnsPage.tsx';
import { CustomersPage } from './renderer/pages/CustomersPage.tsx';
import { SuppliersPage } from './renderer/pages/SuppliersPage.tsx';
import { ExpensesPage } from './renderer/pages/ExpensesPage.tsx';
import { ReportsPage } from './renderer/pages/ReportsPage.tsx';
import { SettingsPage } from './renderer/pages/SettingsPage.tsx';
import { CommandPalette } from './renderer/components/ui/CommandPalette.tsx';
import { ShortcutsHelpModal } from './renderer/components/ui/ShortcutsHelpModal.tsx';
import { ReceiptModal } from './renderer/components/ui/ReceiptModal.tsx';
import { useKeyboardShortcuts } from './renderer/hooks/useKeyboardShortcuts.ts';

export default function App() {
  const { currentPage, session, setSession, entryView, setEntryView } = useUIStore();
  const [startupError, setStartupError] = useState<string | null>(null);

  // Initialise l'écoute globale des 15 raccourcis clavier
  useKeyboardShortcuts();

  const checkSession = useCallback(async () => {
    setStartupError(null);
    try {
      // La session ne provient QUE d'une réponse serveur valide (jamais d'une session fabriquée localement).
      const currentSession = await apiClient.getSession();
      setSession(currentSession);
      return currentSession;
    } catch (err) {
      setSession(null);
      setStartupError(err instanceof Error ? err.message : 'Impossible de vérifier la session.');
      return null;
    }
  }, [setSession]);

  // Écoute de l'expiration de session (401 renvoyé par le processus principal)
  useEffect(() => {
    return apiClient.onSessionExpired(() => {
      setSession(null);
      setEntryView('login');
      toast.error('Votre session a expiré. Veuillez vous reconnecter.');
    });
  }, [setSession, setEntryView]);

  const handleSplashComplete = ({ hasSession, error }: { hasSession: boolean; error?: string | null }) => {
    if (hasSession) {
      // Session confirmée par le serveur : accès direct à l'application métier
      setStartupError(null);
      setEntryView('welcome');
      return;
    }

    if (error) {
      // Panne réseau : état d'erreur clair avec bouton Réessayer sur la page de connexion
      setStartupError(error);
      setEntryView('login');
      return;
    }

    // Aucune session : vérifier si l'utilisateur était en cours d'inscription ou de connexion
    setStartupError(null);
    const savedTarget = typeof window !== 'undefined' ? sessionStorage.getItem('boutica_target_view') : null;
    if (savedTarget && ['register', 'login', 'onboarding', 'welcome'].includes(savedTarget)) {
      setEntryView(savedTarget as any);
      return;
    }

    const hasSeenOnboarding = typeof window !== 'undefined' && localStorage.getItem('boutica_onboarding_completed') === 'true';
    setEntryView(hasSeenOnboarding ? 'welcome' : 'onboarding');
  };

  // 1. Splash Screen au démarrage
  if (entryView === 'splash') {
    return (
      <>
        <Toaster position="top-right" richColors />
        <SplashScreen onComplete={handleSplashComplete} />
      </>
    );
  }

  // 2. Si aucune session réelle n'est active, afficher le parcours d'entrée (Welcome, Onboarding, Login, Register)
  if (!session) {
    const renderEntryFlow = () => {
      switch (entryView) {
        case 'welcome':
          return <WelcomeScreen />;
        case 'onboarding':
          return <OnboardingScreen />;
        case 'register':
          return <RegisterPage />;
        case 'login':
        default:
          return <LoginPage startupError={startupError} onRetry={checkSession} />;
      }
    };

    return (
      <>
        <Toaster position="top-right" richColors />
        {renderEntryFlow()}
      </>
    );
  }

  // 3. Session réelle active : accès complet aux 12 modules métier
  const renderActivePage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'pos':
        return <PosSalePage />;
      case 'products':
        return <ProductsPage />;
      case 'inventory':
        return <InventoryPage />;
      case 'sales':
        return <SalesHistoryPage />;
      case 'purchases':
        return <PurchasesPage />;
      case 'returns':
        return <ReturnsPage />;
      case 'customers':
        return <CustomersPage />;
      case 'suppliers':
        return <SuppliersPage />;
      case 'expenses':
        return <ExpensesPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <DesktopShell>
      {renderActivePage()}
      <CommandPalette />
      <ShortcutsHelpModal />
      <ReceiptModal />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: '12px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
          },
        }}
      />
    </DesktopShell>
  );
}
