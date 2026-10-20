import React, { useState } from 'react';
import {
  Package,
  ShoppingCart,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Zap,
  ShieldCheck,
  Receipt,
  Truck,
  Boxes,
} from 'lucide-react';
import { BouticaLogo } from '../components/ui/BouticaLogo.tsx';
import { Button } from '../components/ui/Button.tsx';
import { useUIStore } from '../store/uiStore.ts';

interface StepContent {
  id: number;
  tag: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  points: Array<{ title: string; desc: string }>;
  badge: string;
}

const STEPS: StepContent[] = [
  {
    id: 1,
    tag: 'Étape 1 sur 3 — Catalogue & Stocks',
    title: 'Gérez vos produits, variantes et stocks avec rigueur',
    subtitle: 'Une vue d’ensemble complète sur tous vos articles de quincaillerie, matériaux ou marchandises.',
    icon: <Boxes className="w-12 h-12" />,
    iconColor: '#9A050E',
    iconBg: '#FCEAEC',
    badge: 'Contrôle des stocks',
    points: [
      {
        title: 'Organisation par variantes',
        desc: 'Associez plusieurs formats, diamètres ou conditionnements à une même référence mère.',
      },
      {
        title: 'Alertes stock bas automatiques',
        desc: 'Identifiez immédiatement les ruptures imminentes pour réapprovisionner à temps.',
      },
      {
        title: 'Ajustements d’inventaire tracés',
        desc: 'Définissez la quantité réelle absolue en consignant un motif explicite.',
      },
    ],
  },
  {
    id: 2,
    tag: 'Étape 2 sur 3 — Point de vente',
    title: 'Enregistrez vos ventes et encaissez en quelques secondes',
    subtitle: 'Une caisse comptoir ultra-réactive conçue pour la rapidité du service et le travail au clavier.',
    icon: <ShoppingCart className="w-12 h-12" />,
    iconColor: '#16804A',
    iconBg: '#EAF6EF',
    badge: 'Caisse POS (F2)',
    points: [
      {
        title: 'Recherche instantanée d’articles',
        desc: 'Retrouvez un article instantanément par mot-clé, code SKU ou libellé.',
      },
      {
        title: 'Calcul précis & remises commerciales',
        desc: 'Appliquez une remise commerciale et observez le total net recalculé en temps réel.',
      },
      {
        title: 'Impression immédiate de tickets',
        desc: 'Générez un reçu 80 mm officiel pour chaque vente avec ventilation claire des articles.',
      },
    ],
  },
  {
    id: 3,
    tag: 'Étape 3 sur 3 — Pilotage & Comptabilité',
    title: 'Suivez vos achats, vos dépenses et vos rapports certifiés',
    subtitle: 'Gardez la maîtrise absolue de vos flux financiers, de vos fournisseurs et de votre trésorerie.',
    icon: <FileSpreadsheet className="w-12 h-12" />,
    iconColor: '#3478C8',
    iconBg: '#EAF2FB',
    badge: 'Bilan d’activité',
    points: [
      {
        title: 'Réception de commandes fournisseurs',
        desc: 'Enregistrez vos bons d’achats et actualisez directement les stocks disponibles.',
      },
      {
        title: 'Suivi des dépenses d’exploitation',
        desc: 'Consignez les frais généraux (manutention, carburant, factures) pour mesurer la rentabilité.',
      },
      {
        title: 'Exports comptables Excel et PDF',
        desc: 'Téléchargez vos journaux de ventes et vos inventaires officiels à tout moment.',
      },
    ],
  },
];

export const OnboardingScreen: React.FC = () => {
  const { setEntryView } = useUIStore();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const step = STEPS[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === STEPS.length - 1;

  const markCompletedAndNavigate = (view: 'register' | 'login') => {
    try {
      localStorage.setItem('boutica_onboarding_completed', 'true');
    } catch {
      /* ignore */
    }
    setEntryView(view);
  };

  const handleNext = () => {
    if (isLast) {
      markCompletedAndNavigate('register');
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    markCompletedAndNavigate('register');
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-between bg-[#FDFDFD] text-[#2B282C] p-6 sm:p-10 relative">
      {/* Top Brand Accent Bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#5F0203] via-[#9A050E] to-[#AA3035]" />

      {/* Header with Boutica Logo & Skip Button */}
      <header className="w-full max-w-4xl flex items-center justify-between py-2">
        <BouticaLogo variant="full" size="md" />
        <button
          type="button"
          onClick={handleSkip}
          className="text-xs font-semibold text-[#706C70] hover:text-[#9A050E] transition-colors px-3 py-1.5 rounded-lg hover:bg-[#F7F6F6]"
        >
          Passer l'introduction →
        </button>
      </header>

      {/* Main Step Body */}
      <main className="w-full max-w-4xl my-auto py-6">
        <div className="bg-white rounded-[18px] border border-[#E5E2E3] shadow-[0_4px_24px_rgba(43,40,44,0.06)] p-6 sm:p-10">
          {/* Progress Indicators */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#E5E2E3]">
            <span className="text-xs font-bold uppercase tracking-wider text-[#9A050E]">
              {step.tag}
            </span>
            <div className="flex items-center gap-2">
              {STEPS.map((s, idx) => (
                <div
                  key={s.id}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentStepIndex
                      ? 'w-8 bg-[#9A050E]'
                      : idx < currentStepIndex
                      ? 'w-2 bg-[#9A050E]/40'
                      : 'w-2 bg-[#E5E2E3]'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Grid Layout: Visual on Left, Details on Right */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            {/* Visual Icon Presentation Box */}
            <div className="md:col-span-5 flex flex-col items-center justify-center p-8 rounded-[16px] bg-[#F7F6F6] border border-[#E5E2E3] text-center relative overflow-hidden">
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center shadow-xs mb-4"
                style={{ backgroundColor: step.iconBg, color: step.iconColor }}
              >
                {step.icon}
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white border border-[#E5E2E3] text-[#2B282C]">
                {step.badge}
              </span>
              <div className="mt-4 text-[11px] text-[#706C70] font-medium">
                Conçu pour le terrain et la précision commerciale
              </div>
            </div>

            {/* Content Details */}
            <div className="md:col-span-7 flex flex-col gap-4">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#2B282C] tracking-tight leading-tight">
                {step.title}
              </h2>
              <p className="text-sm text-[#706C70] leading-relaxed">
                {step.subtitle}
              </p>

              {/* 3 bullet highlights */}
              <div className="space-y-3 mt-2">
                {step.points.map((pt, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="p-1 rounded-full bg-[#EAF6EF] text-[#16804A] shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#2B282C]">{pt.title}</h4>
                      <p className="text-[11px] text-[#706C70] leading-normal">{pt.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 mt-10 pt-6 border-t border-[#E5E2E3]">
            <div>
              {!isFirst ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                  onClick={handlePrev}
                >
                  Précédent
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                  onClick={() => setEntryView('welcome')}
                >
                  Accueil
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {isLast ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => markCompletedAndNavigate('login')}
                  >
                    Se connecter
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    className="font-bold shadow-md"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                    onClick={() => markCompletedAndNavigate('register')}
                  >
                    Créer un compte
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto font-semibold"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  onClick={handleNext}
                >
                  Suivant
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl py-2 flex items-center justify-between text-[11px] text-[#706C70]">
        <span>Boutica Desktop — Guide de démarrage</span>
        <button
          type="button"
          onClick={() => markCompletedAndNavigate('login')}
          className="hover:text-[#9A050E] underline font-medium"
        >
          Déjà un compte ? Connectez-vous
        </button>
      </footer>
    </div>
  );
};
