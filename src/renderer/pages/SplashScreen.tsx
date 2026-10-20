import React, { useEffect, useState } from 'react';
import { BouticaLogo } from '../components/ui/BouticaLogo.tsx';
import { apiClient } from '../lib/api-client.ts';
import { useUIStore } from '../store/uiStore.ts';

interface SplashScreenProps {
  onComplete: (result: { hasSession: boolean; error?: string | null }) => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const { setSession, setBackendHealthy } = useUIStore();
  const [statusMessage, setStatusMessage] = useState('Démarrage de Boutica Desktop...');
  const [canSkip, setCanSkip] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // Timeout de sécurité pour ne jamais bloquer l'utilisateur si le réseau est lent
    const safetyTimer = setTimeout(() => {
      if (isMounted) setCanSkip(true);
    }, 2500);

    const initialize = async () => {
      const startTime = Date.now();
      let hasSession = false;
      let sessionError: string | null = null;

      // 1. Vérification de connectivité serveur
      try {
        if (isMounted) setStatusMessage('Connexion à Boutica Cloud...');
        await apiClient.checkHealth();
        if (isMounted) setBackendHealthy(true);
      } catch {
        if (isMounted) setBackendHealthy(false);
      }

      // 2. Vérification de session réelle
      try {
        if (isMounted) setStatusMessage('Vérification de la session...');
        const session = await apiClient.getSession();
        if (session && isMounted) {
          setSession(session);
          hasSession = true;
        } else if (isMounted) {
          setSession(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setSession(null);
          // Panne réseau ou serveur temporairement indisponible : ne pas déconnecter silencieusement
          const isNetwork =
            err?.status === 0 ||
            err?.isNetworkError ||
            err?.message?.includes('injoignable') ||
            err?.message?.includes('délai');
          if (isNetwork) {
            sessionError = err?.message || 'Le serveur Boutica Cloud est temporairement injoignable.';
          }
        }
      }

      // 3. Durée minimale de 800ms
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, 800 - elapsed);

      setTimeout(() => {
        if (isMounted) {
          onComplete({ hasSession, error: sessionError });
        }
      }, remainingTime);
    };

    void initialize();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
    };
  }, [setSession, setBackendHealthy, onComplete]);

  return (
    <div className="fixed inset-0 h-screen w-screen flex flex-col items-center justify-between bg-[#FDFDFD] p-8 select-none z-50">
      {/* Top brand line */}
      <div className="w-full max-w-xs h-1 rounded-full bg-gradient-to-r from-transparent via-[#9A050E]/40 to-transparent" />

      {/* Center hero logo & typography */}
      <div className="flex flex-col items-center text-center animate-fade-in">
        <div className="relative mb-6">
          {/* Subtle pulse halo */}
          <div className="absolute inset-0 rounded-[24px] bg-[#9A050E]/15 blur-xl animate-pulse" />
          <BouticaLogo variant="app-icon" size="xl" className="relative shadow-lg" />
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-[#2B282C]">
          BOUTICA
        </h1>
        <p className="text-xs uppercase tracking-widest text-[#706C70] mt-1 font-semibold">
          Gestion Commerciale Fluo
        </p>

        {/* Loading spinner & status text */}
        <div className="mt-8 flex flex-col items-center gap-2.5">
          <div className="w-6 h-6 border-2 border-[#9A050E] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[#706C70] font-medium tracking-wide">
            {statusMessage}
          </span>
        </div>

        {canSkip && (
          <button
            type="button"
            onClick={() => onComplete({ hasSession: Boolean(useUIStore.getState().session) })}
            className="mt-4 text-xs font-semibold text-[#9A050E] hover:underline"
          >
            Accéder directement →
          </button>
        )}
      </div>

      {/* Footer copyright */}
      <div className="text-[11px] text-[#706C70] text-center font-medium">
        Boutica Desktop — Logiciel certifié pour commerces et chantiers
      </div>
    </div>
  );
};
