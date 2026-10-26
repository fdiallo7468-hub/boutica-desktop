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

  // Forgot password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'reset'>('request');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Social login state
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [socialConfigNotice, setSocialConfigNotice] = useState<string | null>(null);

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

  const handleSocialSignIn = async (provider: 'google' | 'apple') => {
    setSocialLoading(provider);
    setSocialConfigNotice(null);
    setError(null);
    try {
      const res = await apiClient.signInSocial(provider);
      if (res.notConfigured) {
        setSocialConfigNotice(
          `L'authentification ${provider === 'google' ? 'Google' : 'Apple'} n'est pas activée sur cette instance Boutica Cloud. Les variables d'environnement ${provider === 'google' ? 'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET' : 'APPLE_CLIENT_ID / APPLE_CLIENT_SECRET'} doivent être configurées sur le serveur.`
        );
        return;
      }
      if (res.ok && res.session) {
        setSession(res.session);
        toast.success(`Connexion réussie via ${provider === 'google' ? 'Google' : 'Apple'}`);
        return;
      }
      if (res.error) {
        if (
          res.error.includes('Provider not found') ||
          res.error.includes('404') ||
          res.error.includes('non configuré') ||
          res.error.includes('CLIENT_ID')
        ) {
          setSocialConfigNotice(
            `L'authentification ${provider === 'google' ? 'Google' : 'Apple'} n'est pas activée sur cette instance Boutica Cloud. Les variables d'environnement ${provider === 'google' ? 'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET' : 'APPLE_CLIENT_ID / APPLE_CLIENT_SECRET'} doivent être configurées sur le serveur.`
          );
        } else {
          setError(res.error);
        }
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (
        msg.includes('Provider not found') ||
        msg.includes('404') ||
        msg.includes('non configuré') ||
        msg.includes('CLIENT_ID')
      ) {
        setSocialConfigNotice(
          `L'authentification ${provider === 'google' ? 'Google' : 'Apple'} n'est pas activée sur cette instance Boutica Cloud. Les variables d'environnement ${provider === 'google' ? 'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET' : 'APPLE_CLIENT_ID / APPLE_CLIENT_SECRET'} doivent être configurées sur le serveur.`
        );
      } else {
        setError(`Échec de la connexion ${provider} : ${msg}`);
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotError('Veuillez saisir votre adresse e-mail.');
      return;
    }
    setIsForgotLoading(true);
    setForgotError(null);
    setForgotMessage(null);
    try {
      await apiClient.forgetPassword(forgotEmail.trim());
      setForgotMessage(
        'Demande prise en compte. Si un compte existe avec cette adresse, un message contenant les instructions a été envoyé via le service d’e-mails (Resend).'
      );
      setForgotStep('reset');
    } catch (err: any) {
      setForgotError(err?.message || 'Impossible d’envoyer la demande de réinitialisation.');
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken.trim() || !newPassword) {
      setForgotError('Veuillez renseigner le jeton reçu et votre nouveau mot de passe.');
      return;
    }
    if (newPassword.length < 10) {
      setForgotError('Le mot de passe doit comporter au moins 10 caractères.');
      return;
    }
    setIsForgotLoading(true);
    setForgotError(null);
    try {
      await apiClient.resetPassword(resetToken.trim(), newPassword);
      toast.success('Votre mot de passe a été réinitialisé avec succès !');
      setIsForgotModalOpen(false);
      setEmail(forgotEmail);
      setPassword('');
      setForgotStep('request');
      setForgotMessage(null);
    } catch (err: any) {
      setForgotError(err?.message || 'Jeton de réinitialisation invalide ou expiré.');
    } finally {
      setIsForgotLoading(false);
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

          {socialConfigNotice && (
            <div className="w-full mb-4 p-3 rounded-[10px] bg-[#FFF4DF] border border-[#D99016]/30 flex items-start gap-2.5 text-xs text-[#995B00]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Configuration Cloud requise</p>
                <p className="mt-0.5">{socialConfigNotice}</p>
              </div>
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
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotError(null);
                    setForgotMessage(null);
                    setForgotStep('request');
                    setIsForgotModalOpen(true);
                  }}
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

          {/* Social Sign In Divider */}
          <div className="w-full my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-[#E5E2E3]" />
            <span className="text-[11px] text-[#706C70] uppercase font-semibold">ou continuer avec</span>
            <div className="flex-1 h-px bg-[#E5E2E3]" />
          </div>

          {/* Google & Apple OAuth Buttons */}
          <div className="w-full grid grid-cols-2 gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="md"
              isLoading={socialLoading === 'google'}
              onClick={() => handleSocialSignIn('google')}
              className="w-full flex items-center justify-center gap-2 text-xs font-semibold"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Google</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="md"
              isLoading={socialLoading === 'apple'}
              onClick={() => handleSocialSignIn('apple')}
              className="w-full flex items-center justify-center gap-2 text-xs font-semibold"
            >
              <svg className="w-4 h-4 fill-current text-[#2B282C]" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.63-.76 1.05-1.83.93-2.9-.91.04-2.02.61-2.67 1.37-.58.67-1.09 1.76-.95 2.8 1.02.08 2.06-.51 2.69-1.27z" />
              </svg>
              <span>Apple</span>
            </Button>
          </div>

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

      {/* Forgot / Reset Password Modal */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title="Réinitialisation du mot de passe"
        description="Récupérez l'accès à votre compte Boutica Cloud via e-mail sécurisé"
        maxWidth="sm"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (forgotStep === 'reset') setForgotStep('request');
                else setIsForgotModalOpen(false);
              }}
            >
              {forgotStep === 'reset' ? 'Retour' : 'Annuler'}
            </Button>
            {forgotStep === 'request' ? (
              <Button
                variant="primary"
                size="sm"
                isLoading={isForgotLoading}
                onClick={handleRequestPasswordReset}
              >
                Envoyer le lien
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                isLoading={isForgotLoading}
                onClick={handleResetPassword}
              >
                Mettre à jour le mot de passe
              </Button>
            )}
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {forgotMessage && (
            <div className="p-3 rounded-xl bg-[#EAF6EF] border border-[#16804A]/20 text-[#16804A] leading-relaxed">
              {forgotMessage}
            </div>
          )}

          {forgotError && (
            <div className="p-3 rounded-xl bg-[#FCEAEC] border border-[#C62828]/20 text-[#C62828] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{forgotError}</span>
            </div>
          )}

          {forgotStep === 'request' ? (
            <form onSubmit={handleRequestPasswordReset} className="space-y-3">
              <p className="text-[#706C70]">
                Indiquez l’adresse e-mail associée à votre compte d’entreprise. Le service d’e-mails
                Cloud (Resend) vous transmettra un jeton de réinitialisation sécurisé.
              </p>
              <Input
                label="Adresse e-mail du compte"
                type="email"
                placeholder="votre-email@exemple.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                autoFocus
                leftIcon={<Mail className="w-4 h-4" />}
              />
              <div className="pt-2 text-right">
                <button
                  type="button"
                  onClick={() => setForgotStep('reset')}
                  className="text-[11px] text-[#9A050E] hover:underline"
                >
                  Vous possédez déjà un jeton de réinitialisation ?
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-3">
              <p className="text-[#706C70]">
                Saisissez le jeton reçu par e-mail ou extrait du lien de confirmation, puis
                définissez votre nouveau mot de passe (10 caractères minimum).
              </p>
              <Input
                label="Jeton de réinitialisation (Token)"
                type="text"
                placeholder="ex: eyJhbGciOi... ou code reçu"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                required
                autoFocus
              />
              <Input
                label="Nouveau mot de passe"
                type="password"
                placeholder="10 caractères minimum"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                leftIcon={<Lock className="w-4 h-4" />}
              />
            </form>
          )}
        </div>
      </Modal>

      {/* Footer */}
      <footer className="w-full max-w-md py-2 text-center text-[11px] text-[#706C70]">
        Boutica Desktop — Développé par Fluo
      </footer>
    </div>
  );
};
