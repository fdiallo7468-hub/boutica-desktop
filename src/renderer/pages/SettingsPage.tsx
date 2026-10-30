import React, { useEffect, useState } from 'react';
import {
  Settings,
  Server,
  Printer,
  Coins,
  Keyboard,
  Info,
  CheckCircle2,
  Save,
  Lock,
  KeyRound,
} from 'lucide-react';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Input } from '../components/ui/Input.tsx';
import { BouticaLogo } from '../components/ui/BouticaLogo.tsx';
import { apiClient } from '../lib/api-client.ts';
import { toast } from 'sonner';
import { useUIStore } from '../store/uiStore.ts';

export const SettingsPage: React.FC = () => {
  const session = useUIStore((st) => st.session);
  const [apiUrl, setApiUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingServer, setIsTestingServer] = useState(false);

  // Authenticated password update
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    apiClient
      .getApiBaseUrl()
      .then(setApiUrl)
      .catch(() => setApiUrl(''));
  }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const saved = await apiClient.setApiBaseUrl(apiUrl);
      setApiUrl(saved);
      toast.success('Adresse du serveur enregistrée');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Adresse invalide');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingServer(true);
    try {
      const res = await apiClient.checkHealth();
      toast.success(`Serveur joignable (${res.service ?? res.status})`);
    } catch {
      toast.error('Impossible de joindre le serveur à cette adresse');
    } finally {
      setIsTestingServer(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Veuillez renseigner votre mot de passe actuel');
      return;
    }
    if (newPassword.length < 10) {
      toast.error('Le nouveau mot de passe doit comporter au moins 10 caractères');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Les deux nouveaux mots de passe ne correspondent pas');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await apiClient.changePassword({ currentPassword, newPassword });
      toast.success('Votre mot de passe a été mis à jour avec succès');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err?.message || 'Échec de la mise à jour du mot de passe');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E2E3]">
        <div>
          <h1 className="text-xl font-bold text-[#2B282C]">Paramètres du Logiciel</h1>
          <p className="text-xs text-[#706C70] mt-0.5">
            Configuration du serveur, imprimante de caisse et raccourcis clavier
          </p>
        </div>
      </div>

      {/* Backend Cloud Server Connection */}
      <Card>
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#E5E2E3]">
          <Server className="w-5 h-5 text-[#9A050E]" />
          <div>
            <h2 className="text-sm font-bold text-[#2B282C]">Serveur Boutica Cloud</h2>
            <p className="text-xs text-[#706C70]">
              Adresse du backend NestJS hébergé ou passerelle d'entreprise
            </p>
          </div>
        </div>

        <div className="pt-4 space-y-3">
          <Input
            label="URL de l'API Boutica Cloud"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            helperText="Par défaut : https://boutica-cloud.onrender.com (Toute modification déconnecte la session active)"
          />

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleTestConnection}
              isLoading={isTestingServer}
            >
              Tester la connectivité
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveSettings}
              isLoading={isSaving}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Enregistrer la nouvelle adresse
            </Button>
          </div>
        </div>
      </Card>

      {/* Security & Password Update */}
      <Card>
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#E5E2E3]">
          <Lock className="w-5 h-5 text-[#9A050E]" />
          <div>
            <h2 className="text-sm font-bold text-[#2B282C]">Sécurité du Compte & Mot de Passe</h2>
            <p className="text-xs text-[#706C70]">
              Mettez à jour le mot de passe de votre compte {session?.user.email ? `(${session.user.email})` : ''}
            </p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="pt-4 space-y-3 max-w-lg">
          <Input
            label="Mot de passe actuel"
            type="password"
            placeholder="••••••••••••"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            leftIcon={<Lock className="w-4 h-4" />}
          />

          <Input
            label="Nouveau mot de passe"
            type="password"
            placeholder="Au moins 10 caractères"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            helperText="Exigence Boutica Cloud : au moins 10 caractères"
            leftIcon={<KeyRound className="w-4 h-4" />}
          />

          <Input
            label="Confirmer le nouveau mot de passe"
            type="password"
            placeholder="Répétez le nouveau mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isUpdatingPassword}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Mettre à jour le mot de passe
            </Button>
          </div>
        </form>
      </Card>

      {/* POS Thermal Printer Settings */}
      <Card>
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#E5E2E3]">
          <Printer className="w-5 h-5 text-[#9A050E]" />
          <div>
            <h2 className="text-sm font-bold text-[#2B282C]">Imprimante de Caisse & Tickets</h2>
            <p className="text-xs text-[#706C70]">
              Paramètres d'impression pour les reçus de vente comptoir
            </p>
          </div>
        </div>

        <div className="pt-4 space-y-2 text-xs text-[#706C70]">
          <p>
            Devise de la boutique (définie par Boutica Cloud, non modifiable ici) :{' '}
            <strong className="text-[#2B282C]">{session?.user.businessCurrency ?? 'non communiquée'}</strong>
          </p>
          <p>
            Les reçus s’impriment via la boîte de dialogue d’impression du système (format 80 mm). Le choix
            d’un autre format n’est pas encore disponible.
          </p>
        </div>
      </Card>

      {/* Keyboard Shortcuts Reference */}
      <Card>
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#E5E2E3]">
          <Keyboard className="w-5 h-5 text-[#9A050E]" />
          <div>
            <h2 className="text-sm font-bold text-[#2B282C]">Raccourcis Clavier Desktop</h2>
            <p className="text-xs text-[#706C70]">
              Accélérez vos opérations quotidiennes de comptoir
            </p>
          </div>
        </div>

        <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F7F6F6] border border-[#E5E2E3]">
            <span className="text-[#2B282C] font-medium">Palette de commandes rapide</span>
            <kbd className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-[#E5E2E3] text-[#9A050E]">
              Ctrl + K
            </kbd>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F7F6F6] border border-[#E5E2E3]">
            <span className="text-[#2B282C] font-medium">Nouvelle vente (Caisse POS)</span>
            <kbd className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-[#E5E2E3] text-[#9A050E]">
              F2
            </kbd>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F7F6F6] border border-[#E5E2E3]">
            <span className="text-[#2B282C] font-medium">Fermer la boîte de dialogue</span>
            <kbd className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-[#E5E2E3] text-[#706C70]">
              Échap / ESC
            </kbd>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#F7F6F6] border border-[#E5E2E3]">
            <span className="text-[#2B282C] font-medium">Imprimer le ticket actuel</span>
            <kbd className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-white border border-[#E5E2E3] text-[#706C70]">
              Ctrl + P
            </kbd>
          </div>
        </div>
      </Card>

      {/* About Application */}
      <Card className="bg-[#FDFDFD]">
        <div className="flex items-start gap-4">
          <BouticaLogo variant="app-icon" size="md" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-[#2B282C]">Boutica Desktop — V1.0.0</h3>
            <p className="text-xs text-[#706C70]">
              Application desktop pour l'écosystème commercial Boutica développé par <strong>Fluo</strong>.
            </p>
            <p className="text-[11px] text-[#706C70] pt-1">
              Architecture : Electron + React + TypeScript + Tailwind CSS + Mantine / TanStack.
              Sécurité : Context Isolation activée, Preload IPC restreint, communication chiffrée HTTPS.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
