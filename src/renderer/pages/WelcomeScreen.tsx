import React from 'react';
import { ShoppingCart, Boxes, TrendingUp, ArrowRight, LogIn, Sparkles } from 'lucide-react';
import { BouticaLogo } from '../components/ui/BouticaLogo.tsx';
import { Button } from '../components/ui/Button.tsx';
import { useUIStore } from '../store/uiStore.ts';

export const WelcomeScreen: React.FC = () => {
  const { setEntryView } = useUIStore();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-between bg-[#FDFDFD] text-[#2B282C] p-6 sm:p-10 relative">
      {/* Top Brand Accent Bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#5F0203] via-[#9A050E] to-[#AA3035]" />

      {/* Header */}
      <header className="w-full max-w-5xl flex items-center justify-between py-2">
        <BouticaLogo variant="full" size="md" />
        <button
          type="button"
          onClick={() => setEntryView('login')}
          className="text-xs font-semibold text-[#706C70] hover:text-[#9A050E] transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[#F7F6F6]"
        >
          <LogIn className="w-4 h-4" />
          <span>Espace Connexion</span>
        </button>
      </header>

      {/* Main Content Hero */}
      <main className="w-full max-w-3xl flex flex-col items-center text-center my-auto py-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FCEAEC] border border-[#9A050E]/20 text-[#9A050E] text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Solution professionnelle de gestion de commerce</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-[#2B282C] tracking-tight leading-tight max-w-2xl">
          La gestion commerciale tout-en-un pour votre entreprise
        </h1>

        <p className="text-sm sm:text-base text-[#706C70] mt-4 max-w-xl leading-relaxed">
          Boutica Desktop centralise votre point de vente, le contrôle des stocks en temps réel,
          les réceptions fournisseurs et vos rapports comptables certifiés.
        </p>

        {/* 3 Value Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mt-10 mb-10 text-left">
          <div className="p-4 rounded-[14px] bg-white border border-[#E5E2E3] shadow-xs flex flex-col gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#FCEAEC] text-[#9A050E] flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#2B282C]">Caisse POS Rapide</h3>
            <p className="text-xs text-[#706C70] leading-relaxed">
              Vente comptoir au clavier, gestion des remises et impression immédiate des tickets 80 mm.
            </p>
          </div>

          <div className="p-4 rounded-[14px] bg-white border border-[#E5E2E3] shadow-xs flex flex-col gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#FFF4DF] text-[#D99016] flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#2B282C]">Stocks & Variantes</h3>
            <p className="text-xs text-[#706C70] leading-relaxed">
              Suivi précis par référence SKU, alertes automatiques de rupture et inventaires sécurisés.
            </p>
          </div>

          <div className="p-4 rounded-[14px] bg-white border border-[#E5E2E3] shadow-xs flex flex-col gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#EAF6EF] text-[#16804A] flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#2B282C]">Rapports & Marges</h3>
            <p className="text-xs text-[#706C70] leading-relaxed">
              Visibilité sur vos bénéfices, vos dépenses d'exploitation et exports certifiés Excel / PDF.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full sm:flex-1 font-bold shadow-md"
            rightIcon={<ArrowRight className="w-4 h-4" />}
            onClick={() => setEntryView('onboarding')}
          >
            Commencer
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="w-full sm:flex-1 font-semibold"
            leftIcon={<LogIn className="w-4 h-4" />}
            onClick={() => setEntryView('login')}
          >
            Se connecter
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setEntryView('register')}
          className="mt-4 text-xs text-[#706C70] hover:text-[#9A050E] font-medium transition-colors"
        >
          Nouvelle entreprise ?{' '}
          <span className="font-bold underline text-[#9A050E]">Créer une boutique</span>
        </button>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl py-2 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#706C70] border-t border-[#E5E2E3]/60 gap-2">
        <span>Boutica Desktop — Développé par Fluo</span>
        <div className="flex items-center gap-4">
          <span>Franc CFA (XOF / XAF) & Multidevise</span>
          <span>•</span>
          <span>Boutica Cloud v2.1</span>
        </div>
      </footer>
    </div>
  );
};
