import React, { useEffect, useState } from 'react';
import { Mail, Lock, LogIn, Store, AlertCircle, Eye, EyeOff, ArrowLeft, UserPlus, HelpCircle } from 'lucide-react';
import { BouticaLogo } from '../components/ui/BouticaLogo.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { apiClient } from '../lib/api-client.ts';
import { useUIStore } from '../store/uiStore.ts';
import { toast } from 'sonner';

export const LoginPage: React.FC<{ startupError?: string | null; onRetry?: () => void }> = ({
  startupError,
  onRetry,
}) => {
  const { setSession, isBackendHealthy, setBackendHealthy, setEntryView } = useUIStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password info modal
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  // Disponibilité technique uniquement (/health)
  useEffect(() => {
    apiClient
      .checkHealth()
      .then(() => setBackendHealthy(true))
      .catch(() => setBackendHealthy(false));
  }, [setBackendHealthy]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Veuillez renseigner votre email et mot de passe.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const res = await apiClient.signIn(email.trim(), password);
      setSession(res);
      toast.success('Connexion réussie à Boutica Cloud');
    } catch (err: any) {
      const msg = err?.message || 'Identifiants invalides ou serveur indisponible.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-between bg-[#FDFDFD] p-4 sm:p-6 relative select-none">
      {/* Decorative Brand Accent Background */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#5F0203] via-[#9A050E] to-[#AA3035]" />

      {/* Top Bar with Back Link */}
      <header className="w-full max-w-md flex items-center justify-between py-2">
        <button
          type="button"
          onClick={() => setEntryView('welcome')}
          className="text-xs font-semibold text-[#706C70] hover:text-[#9A050E] transition-colors flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-[#F7F6F6]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Accueil</span>
        </button>

        <button
          type="button"
          onClick={() => setEntryView('register')}
          className="text-xs font-semibold text-[#9A050E] hover:underline flex items-center gap-1"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Créer un compte</span>
        </button>
      </header>

      {/* Login Card */}
      <main className="w-full max-w-md my-auto">
        <div className="w-full bg-white rounded-[18px] border border-[#E5E2E3] shadow-[0_8px_28px_rgba(43,40,44,0.10)] p-6 sm:p-8 flex flex-col items-center">
          {/* Logo */}
          <div className="mb-4">
            <BouticaLogo variant="app-icon" size="lg" />
          </div>

          <h1 className="text-xl font-bold text-[#2B282C] text-center">
            Connexion à Boutica
          </h1>
          <p className="text-xs text-[#706C70] text-center mt-1 mb-6">
            Accédez à votre espace de gestion commerciale certifié.
          </p>

          {/* Backend health status badge */}
          <div className="w-full mb-4 px-3 py-1.5 rounded-lg bg-[#F7F6F6] border border-[#E5E2E3] flex items-center justify-between text-xs text-[#706C70]">
            <span className="flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-[#9A050E]" />
              Boutica Cloud API
            </span>
            <span
              className={`font-semibold ${
                isBackendHealthy ? 'text-[#16804A]' : 'text-[#D99016]'
              }`}
            >
              {isBackendHealthy === null
                ? 'Vérification…'
                : isBackendHealthy
                ? 'Serveur joignable'
                : 'Serveur injoignable'}
            </span>
          </div>

          {startupError && !error && (
            <div className="w-full mb-4 p-3 rounded-[10px] bg-[#FFF4DF] border border-[#D99016]/30 text-xs text-[#995B00]">
              <p className="font-semibold">État de connexion serveur</p>
              <p className="mt-0.5">{startupError}</p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="underline font-semibold mt-1.5 hover:text-[#5F0203] block text-xs"
                >
                  Réessayer la connexion
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="w-full mb-4 p-3 rounded-[10px] bg-[#FCEAEC] border border-[#C62828]/20 flex items-start gap-2.5 text-xs text-[#C62828]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Erreur d'authentification</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSignIn} className="w-full space-y-4">
            <Input
              label="Adresse e-mail"
              type="email"
              placeholder="votre-email@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <div className="space-y-1">
              <Input
                label="Mot de passe"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[#706C70] hover:text-[#2B282C] focus:outline-none"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
              <div className="flex justify-end items-center pt-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setIsForgotModalOpen(true)}
                  className="text-[#706C70] hover:text-[#9A050E] transition-colors"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              className="w-full font-bold shadow-md"
              leftIcon={<LogIn className="w-4 h-4" />}
            >
              Se connecter
            </Button>
          </form>

          {/* Sign up prompt */}
          <div className="w-full mt-6 pt-4 border-t border-[#E5E2E3] text-center text-xs text-[#706C70]">
            <span>Nouvelle entreprise sur Boutica ? </span>
            <button
              type="button"
              onClick={() => setEntryView('register')}
              className="font-bold text-[#9A050E] hover:underline"
            >
              Créer votre boutique
            </button>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title="Réinitialisation du mot de passe"
        description="Assistance pour la récupération de vos accès Boutica"
        maxWidth="sm"
        footer={
          <div className="flex justify-end w-full">
            <Button variant="primary" size="sm" onClick={() => setIsForgotModalOpen(false)}>
              J'ai compris
            </Button>
          </div>
        }
      >
        <div className="space-y-3 text-xs text-[#706C70]">
          <div className="p-3 rounded-xl bg-[#F7F6F6] border border-[#E5E2E3] flex items-start gap-2.5 text-[#2B282C]">
            <HelpCircle className="w-4 h-4 text-[#9A050E] shrink-0 mt-0.5" />
            <p>
              La réinitialisation automatique par e-mail n'est pas activée sur l'infrastructure Boutica Cloud.
            </p>
          </div>
          <p>
            Pour des raisons de sécurité, les accès sont gérés par le propriétaire de la boutique ou par l'administrateur système.
          </p>
          <p>
            Si vous avez oublié votre mot de passe, veuillez contacter l'administrateur de votre compte Boutica ou le support Fluo.
          </p>
        </div>
      </Modal>

      {/* Footer */}
      <footer className="w-full max-w-md py-2 text-center text-[11px] text-[#706C70]">
        Boutica Desktop — Développé par Fluo
      </footer>
    </div>
  );
};
