import React, { useEffect, useState } from 'react';
import {
  Building2,
  Plus,
  RefreshCw,
  Phone,
  Search,
} from 'lucide-react';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { LoadError, errorText } from '../components/ui/LoadError.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { apiClient } from '../lib/api-client.ts';
import type { Supplier } from '../types/api.ts';
import { toast } from 'sonner';

export const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSuppliers = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await apiClient.listSuppliers({ pageSize: 100 });
      setSuppliers(res.data || []);
    } catch (err) {
      setSuppliers([]);
      setLoadError(errorText(err, 'Impossible de charger les fournisseurs'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  // Écoute des raccourcis globaux (Actualiser Ctrl+R et Créer Ctrl+N)
  useEffect(() => {
    const handleRefresh = () => {
      loadSuppliers();
    };
    const handleCreateNew = () => {
      setIsCreateOpen(true);
    };
    window.addEventListener('boutica:refresh', handleRefresh);
    window.addEventListener('boutica:create-new', handleCreateNew);
    return () => {
      window.removeEventListener('boutica:refresh', handleRefresh);
      window.removeEventListener('boutica:create-new', handleCreateNew);
    };
  }, []);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Le nom du fournisseur est obligatoire');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.createSupplier({
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      toast.success('Fournisseur enregistré avec succès');
      setIsCreateOpen(false);
      setName('');
      setPhone('');
      loadSuppliers();
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de l’ajout du fournisseur');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.phone && s.phone.includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      {loadError && <LoadError message={loadError} onRetry={loadSuppliers} />}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E2E3]">
        <div>
          <h1 className="text-xl font-bold text-[#2B282C]">Fournisseurs de Matériaux</h1>
          <p className="text-xs text-[#706C70] mt-0.5">
            Annuaire des usines, distributeurs et fabricants partenaires
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="tertiary"
            size="sm"
            onClick={loadSuppliers}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            title="Actualiser la liste (Ctrl+R)"
          >
            <span>Actualiser</span>
            <kbd className="hidden md:inline font-mono text-[9px] px-1 py-0.2 rounded bg-black/5 text-[#706C70]">Ctrl+R</kbd>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            title="Créer un fournisseur (Ctrl+N)"
          >
            <span>Nouveau Fournisseur</span>
            <kbd className="hidden md:inline font-mono text-[9px] px-1 py-0.2 rounded bg-white/20 text-white font-bold">Ctrl+N</kbd>
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <div className="w-full sm:w-80">
        <Input
          data-search="true"
          placeholder="Rechercher un fournisseur (Ctrl+F)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Suppliers Table */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F6F6] text-[#706C70] uppercase font-semibold border-b border-[#E5E2E3]">
              <tr>
                <th className="py-3 px-4">Fournisseur</th>
                <th className="py-3 px-4">Contact Téléphonique</th>
                <th className="py-3 px-4">Date de Création</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2E3]">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-[#706C70]">
                    Aucun fournisseur enregistré
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-[#FDFDFD] transition-colors">
                    <td className="py-3 px-4 font-semibold text-[#2B282C] flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#EAF2FB] text-[#3478C8]">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <span>{s.name}</span>
                    </td>
                    <td className="py-3 px-4 text-[#706C70]">
                      {s.phone ? (
                        <span className="flex items-center gap-1.5 font-mono">
                          <Phone className="w-3 h-3 text-[#16804A]" />
                          {s.phone}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#706C70]">
                      {new Date(s.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Create Supplier */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Ajouter un fournisseur"
        description="Enregistrez un nouveau partenaire pour vos réceptions d'approvisionnement."
        maxWidth="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="ghost" size="sm" onClick={() => setIsCreateOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              onClick={handleCreateSupplier}
            >
              Enregistrer
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateSupplier} className="space-y-3">
          <Input
            label="Raison sociale du fournisseur"
            placeholder="ex: Cimenterie Nationale"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            leftIcon={<Building2 className="w-4 h-4" />}
          />
          <Input
            label="Numéro de contact"
            placeholder="ex: +225 21 00 00 00"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            leftIcon={<Phone className="w-4 h-4" />}
          />
        </form>
      </Modal>
    </div>
  );
};
