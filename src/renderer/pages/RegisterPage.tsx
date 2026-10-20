import React, { useState } from 'react';
import {
  User,
  Building2,
  Lock,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Mail,
  Phone,
  Eye,
  EyeOff,
  Coins,
  MapPin,
  Briefcase,
  AlertCircle,
  Store,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { BouticaLogo } from '../components/ui/BouticaLogo.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Input } from '../components/ui/Input.tsx';
import { apiClient } from '../lib/api-client.ts';
import { useUIStore } from '../store/uiStore.ts';
import { toast } from 'sonner';

export const RegisterPage: React.FC = () => {
  const { setSession, setEntryView } = useUIStore();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Personal info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Step 2: Business info
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('Matériaux de construction & Quincaillerie');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessCurrency, setBusinessCurrency] = useState('XOF');

  // Step 3: Security & password
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form handling & loading
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation helpers
  const validateStep1 = () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Veuillez renseigner votre prénom et votre nom.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Veuillez renseigner une adresse e-mail valide.');
      return false;
    }
    setError(null);
    return true;
  };

  const validateStep2 = () => {
    if (!businessName.trim()) {
      setError('Le nom de votre boutique ou entreprise est obligatoire.');
      return false;
    }
    setError(null);
    return true;
  };

  const isPasswordLongEnough = password.length >= 10;
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  const isPasswordValid = isPasswordLongEnough && hasNumber && hasLetter;
  const doPasswordsMatch = password === confirmPassword && password.length > 0;

  const validateStep3 = () => {
    if (!isPasswordValid) {
      setError('Le mot de passe doit contenir au moins 10 caractères, dont une lettre et un chiffre.');
      return false;
    }
    if (!doPasswordsMatch) {
      setError('Les deux mots de passe ne correspondent pas.');
      return false;
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    setError(null);
    if (currentStep === 1 && validateStep1()) setCurrentStep(2);
    else if (currentStep === 2 && validateStep2()) setCurrentStep(3);
    else if (currentStep === 3 && validateStep3()) setCurrentStep(4);
  };

  const handleBack = () => {
    setError(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
    }
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    try {
      // Inscription réelle auprès de Boutica Cloud
      const session = await apiClient.signUp({
        name: fullName,
        email: email.trim().toLowerCase(),
        password,
        businessName: businessName.trim(),
        businessCurrency: businessCurrency || 'XOF',
      });

      // Nettoyer les données sensibles de la mémoire du composant
      setPassword('');
      setConfirmPassword('');

      setSession(session);
      toast.success('Votre compte Boutica a été créé avec succès !');
    } catch (err: any) {
      let msg = err?.message || 'Une erreur est survenue lors de la création du compte. Vérifiez les informations ou réessayez.';
      if (
        msg.includes('USER_ALREADY_EXISTS') ||
        msg.toLowerCase().includes('user already exists') ||
        msg.toLowerCase().includes('déjà') ||
        err?.status === 422
      ) {
        msg = 'Un compte existe déjà avec cette adresse e-mail. Veuillez vous connecter.';
      }
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepTitles = [
    { num: 1, label: 'Responsable', icon: <User className="w-4 h-4" /> },
    { num: 2, label: 'Boutique', icon: <Building2 className="w-4 h-4" /> },
    { num: 3, label: 'Sécurité', icon: <Lock className="w-4 h-4" /> },
    { num: 4, label: 'Validation', icon: <CheckCircle2 className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-between bg-[#FDFDFD] text-[#2B282C] p-4 sm:p-8 relative">
      {/* Top Brand Accent Bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#5F0203] via-[#9A050E] to-[#AA3035]" />

      {/* Header */}
      <header className="w-full max-w-2xl flex items-center justify-between py-2">
        <div className="cursor-pointer" onClick={() => setEntryView('welcome')}>
          <BouticaLogo variant="full" size="md" />
        </div>
        <button
          type="button"
          onClick={() => setEntryView('login')}
          className="text-xs font-semibold text-[#706C70] hover:text-[#9A050E] transition-colors"
        >
          Déjà un compte ? <span className="font-bold underline text-[#9A050E]">Se connecter</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-2xl my-auto py-6">
        <div className="bg-white rounded-[18px] border border-[#E5E2E3] shadow-[0_8px_28px_rgba(43,40,44,0.08)] p-6 sm:p-8">
          {/* Header Title */}
          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-[#2B282C]">
              Création de votre espace Boutica
            </h1>
            <p className="text-xs text-[#706C70] mt-1">
              Configurez votre compte gérant et les paramètres initiaux de votre boutique
            </p>
          </div>

          {/* Stepper Progress Header */}
          <div className="grid grid-cols-4 gap-2 mb-8">
            {stepTitles.map((st) => {
              const isActive = currentStep === st.num;
              const isPast = currentStep > st.num;
              return (
                <div key={st.num} className="flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                      isActive
                        ? 'bg-[#9A050E] text-white shadow-xs'
                        : isPast
                        ? 'bg-[#EAF6EF] text-[#16804A]'
                        : 'bg-[#F7F6F6] text-[#706C70] border border-[#E5E2E3]'
                    }`}
                  >
                    {isPast ? <Check className="w-4 h-4 stroke-[3]" /> : st.icon}
                  </div>
                  <span
                    className={`text-[10px] font-semibold mt-1.5 hidden sm:inline ${
                      isActive ? 'text-[#9A050E]' : isPast ? 'text-[#16804A]' : 'text-[#706C70]'
                    }`}
                  >
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Error Banner */}
          {error && (
            <div className="w-full mb-6 p-3.5 rounded-[12px] bg-[#FCEAEC] border border-[#C62828]/20 flex flex-col gap-2 text-xs text-[#C62828]">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Information d'inscription</p>
                  <p>{error}</p>
                </div>
              </div>
              {error.includes('déjà') && (
                <div className="pt-2 border-t border-[#C62828]/20 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setEntryView('login')}
                    className="px-3 py-1.5 rounded-lg bg-[#9A050E] text-white font-bold text-xs hover:bg-[#7B030A] transition-colors shadow-xs"
                  >
                    Se connecter à ce compte →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 1: Personal Info */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Prénom"
                  placeholder="ex: Ibrahim"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoFocus
                />
                <Input
                  label="Nom"
                  placeholder="ex: Kouassi"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>

              <Input
                label="Adresse e-mail (Identifiant de connexion)"
                type="email"
                placeholder="contact@moncommerce.ci"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                leftIcon={<Mail className="w-4 h-4" />}
                helperText="Cette adresse sera utilisée pour vous connecter et recevoir vos accès."
              />

              <Input
                label="Numéro de téléphone personnel (optionnel — contact local)"
                type="tel"
                placeholder="+225 07 00 11 22 33"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                leftIcon={<Phone className="w-4 h-4" />}
                helperText="Votre compte responsable sur Boutica Cloud est créé avec votre nom complet et e-mail."
              />
            </div>
          )}

          {/* STEP 2: Business Info */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <Input
                label="Nom commercial de la boutique ou entreprise"
                placeholder="ex: Quincaillerie Moderne & Matériaux"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                autoFocus
                leftIcon={<Store className="w-4 h-4" />}
                helperText="Nom affiché en en-tête de vos tickets de caisse et rapports."
              />

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#2B282C]">
                  Secteur d'activité principal
                </label>
                <div className="relative">
                  <select
                    value={businessType}
                    onChange={(e) => setBusinessType(e.target.value)}
                    className="w-full px-3 py-2 rounded-[10px] bg-white border border-[#E5E2E3] text-xs text-[#2B282C] focus:outline-none focus:border-[#9A050E]"
                  >
                    <option value="Matériaux de construction & Quincaillerie">
                      Matériaux de construction & Quincaillerie
                    </option>
                    <option value="Commerce général & Négoce">Commerce général & Négoce</option>
                    <option value="Boutique & Distribution de détail">
                      Boutique & Distribution de détail
                    </option>
                    <option value="Électricité, Plomberie & Outillage">
                      Électricité, Plomberie & Outillage
                    </option>
                    <option value="Autre activité commerciale">Autre activité commerciale</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Téléphone professionnel (contact local)"
                  type="tel"
                  placeholder="+225 21 00 10 20"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  leftIcon={<Phone className="w-4 h-4" />}
                  helperText="Information locale (non persistée sur Boutica Cloud v2)."
                />

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#2B282C]">
                    Devise principale (enregistrée sur le serveur)
                  </label>
                  <select
                    value={businessCurrency}
                    onChange={(e) => setBusinessCurrency(e.target.value)}
                    className="w-full px-3 py-2 rounded-[10px] bg-white border border-[#E5E2E3] text-xs text-[#2B282C] focus:outline-none focus:border-[#9A050E]"
                  >
                    <option value="XOF">Franc CFA UEMOA (XOF)</option>
                    <option value="XAF">Franc CFA CEMAC (XAF)</option>
                    <option value="EUR">Euro (€ - EUR)</option>
                    <option value="USD">Dollar US ($ - USD)</option>
                    <option value="GNF">Franc Guinéen (GNF)</option>
                  </select>
                </div>
              </div>

              <Input
                label="Adresse ou localisation du magasin (contact local)"
                placeholder="ex: Abidjan, Zone Industrielle Yopougon"
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                leftIcon={<MapPin className="w-4 h-4" />}
                helperText="Information locale de localisation (non persistée sur Boutica Cloud v2)."
              />
            </div>
          )}

          {/* STEP 3: Security & Passwords */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="relative">
                <Input
                  label="Mot de passe"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[#706C70] hover:text-[#2B282C]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                />
              </div>

              <div className="relative">
                <Input
                  label="Confirmation du mot de passe"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  leftIcon={<Lock className="w-4 h-4" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-[#706C70] hover:text-[#2B282C]"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  }
                />
              </div>

              {/* Password strength checklist */}
              <div className="p-3.5 rounded-[12px] bg-[#F7F6F6] border border-[#E5E2E3] space-y-2 text-xs">
                <span className="font-semibold text-[#2B282C]">Exigences de sécurité :</span>
                <div className="space-y-1">
                  <div
                    className={`flex items-center gap-2 ${
                      isPasswordLongEnough ? 'text-[#16804A]' : 'text-[#706C70]'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Au moins 10 caractères</span>
                  </div>
                  <div
                    className={`flex items-center gap-2 ${
                      hasLetter && hasNumber ? 'text-[#16804A]' : 'text-[#706C70]'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Contient au moins une lettre et un chiffre</span>
                  </div>
                  <div
                    className={`flex items-center gap-2 ${
                      doPasswordsMatch ? 'text-[#16804A]' : 'text-[#706C70]'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Les mots de passe sont identiques</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Summary & Account Creation */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 rounded-[14px] bg-[#F7F6F6] border border-[#E5E2E3] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E5E2E3]">
                  <span className="text-xs font-bold text-[#2B282C] flex items-center gap-1.5">
                    <User className="w-4 h-4 text-[#9A050E]" />
                    Compte Responsable
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="text-xs font-semibold text-[#9A050E] hover:underline"
                  >
                    Modifier
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[#706C70]">Nom complet :</span>
                    <p className="font-semibold text-[#2B282C]">
                      {firstName} {lastName}
                    </p>
                  </div>
                  <div>
                    <span className="text-[#706C70]">E-mail :</span>
                    <p className="font-semibold text-[#2B282C] truncate">{email}</p>
                  </div>
                  {phone && (
                    <div>
                      <span className="text-[#706C70]">Téléphone :</span>
                      <p className="font-semibold text-[#2B282C]">{phone}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-[14px] bg-[#F7F6F6] border border-[#E5E2E3] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E5E2E3]">
                  <span className="text-xs font-bold text-[#2B282C] flex items-center gap-1.5">
                    <Store className="w-4 h-4 text-[#9A050E]" />
                    Informations Entreprise
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="text-xs font-semibold text-[#9A050E] hover:underline"
                  >
                    Modifier
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[#706C70]">Boutique :</span>
                    <p className="font-semibold text-[#2B282C]">{businessName}</p>
                  </div>
                  <div>
                    <span className="text-[#706C70]">Activité :</span>
                    <p className="font-semibold text-[#2B282C] truncate">{businessType}</p>
                  </div>
                  <div>
                    <span className="text-[#706C70]">Devise principale :</span>
                    <p className="font-semibold text-[#9A050E]">{businessCurrency}</p>
                  </div>
                  {businessAddress && (
                    <div>
                      <span className="text-[#706C70]">Localisation :</span>
                      <p className="font-semibold text-[#2B282C] truncate">{businessAddress}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-[10px] bg-[#EAF6EF] border border-[#16804A]/20 flex items-center gap-2.5 text-xs text-[#16804A]">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  Boutica Cloud enregistre et sécurise votre compte administrateur ({firstName} {lastName}, {email}) et votre boutique ({businessName}, devise {businessCurrency}).
                </span>
              </div>
            </div>
          )}

          {/* Stepper Footer Controls */}
          <div className="flex items-center justify-between gap-3 mt-8 pt-6 border-t border-[#E5E2E3]">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="md"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={handleBack}
                disabled={isSubmitting}
              >
                Précédent
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setEntryView('welcome')}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
            )}

            {currentStep < 4 ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                className="font-semibold"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={handleNext}
              >
                Continuer
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="md"
                className="font-bold shadow-md"
                isLoading={isSubmitting}
                rightIcon={<Check className="w-4 h-4" />}
                onClick={handleFinalSubmit}
              >
                Créer mon compte
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-2xl py-2 flex items-center justify-center text-[11px] text-[#706C70]">
        <span>Boutica Desktop — Inscription sécurisée</span>
      </footer>
    </div>
  );
};
