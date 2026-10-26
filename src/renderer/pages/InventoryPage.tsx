import React, { useEffect, useState } from 'react';
import {
  Boxes,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { LoadError, errorText } from '../components/ui/LoadError.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { StockBadge } from '../components/ui/StockBadge.tsx';
import { formatMoney } from '../lib/money.ts';
import { apiClient } from '../lib/api-client.ts';
import type { Variant } from '../types/api.ts';
import { toast } from 'sonner';

export const InventoryPage: React.FC = () => {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Adjustment Modal
  const [adjustingVariant, setAdjustingVariant] = useState<Variant | null>(null);
  const [newQuantity, setNewQuantity] = useState<number>(0);
  const [adjustmentNote, setAdjustmentNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);

  const loadStockData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await apiClient.listAllVariants({ search: searchTerm, pageSize: 100 });
      setVariants(res.data || []);
    } catch (err) {
      setVariants([]);
      setLoadError(errorText(err, 'Impossible de charger les stocks'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStockData();
  }, [searchTerm]);

  // Écoute de l'événement d'actualisation globale (Ctrl+R / Cmd+R)
  useEffect(() => {
    const handleRefresh = () => {
      loadStockData();
    };
    window.addEventListener('boutica:refresh', handleRefresh);
    return () => window.removeEventListener('boutica:refresh', handleRefresh);
  }, []);

  const filteredVariants = variants.filter((v) => {
    const qty = v.quantity ?? 0;
    if (statusFilter === 'LOW') return qty > 0 && qty <= 5;
    if (statusFilter === 'OUT') return qty <= 0;
    return true;
  });

  const handleOpenAdjust = (variant: Variant) => {
    setAdjustingVariant(variant);
    setNewQuantity(variant.quantity ?? 0);
    setAdjustmentNote('');
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingVariant) return;

    if (newQuantity < 0) {
      toast.error('La quantité ne peut pas être négative');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.adjustStock(adjustingVariant.id, {
        quantity: Math.floor(newQuantity),
        note: adjustmentNote.trim() || undefined,
      });
      toast.success(`Stock mis à jour : ${Math.floor(newQuantity)} unités`);
      setAdjustingVariant(null);
      loadStockData();
    } catch (err) {
      // Échec serveur : le stock affiché reste celui du serveur, aucun succès n'est simulé.
      toast.error(errorText(err, 'L’ajustement du stock a été refusé par le serveur'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {loadError && <LoadError message={loadError} onRetry={loadStockData} />}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E2E3]">
        <div>
          <h1 className="text-xl font-bold text-[#2B282C]">Gestion des Stocks & Inventaire</h1>
          <p className="text-xs text-[#706C70] mt-0.5">
            Suivi des quantités physiques, alertes de rupture et régularisations d'inventaire
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="tertiary"
            size="sm"
            onClick={loadStockData}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            title="Actualiser les stocks (Ctrl+R)"
          >
            <span>Actualiser</span>
            <kbd className="hidden md:inline font-mono text-[9px] px-1 py-0.2 rounded bg-black/5 text-[#706C70]">Ctrl+R</kbd>
          </Button>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <Input
            data-search="true"
            placeholder="Rechercher par article ou SKU (Ctrl+F)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-[10px] bg-[#F7F6F6] border border-[#E5E2E3] text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded-[8px] font-semibold transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-white text-[#9A050E] shadow-xs'
                : 'text-[#706C70] hover:text-[#2B282C]'
            }`}
          >
            Tous ({variants.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('LOW')}
            className={`px-3 py-1 rounded-[8px] font-semibold transition-colors ${
              statusFilter === 'LOW'
                ? 'bg-white text-[#D99016] shadow-xs'
                : 'text-[#706C70] hover:text-[#2B282C]'
            }`}
          >
            Stock faible
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('OUT')}
            className={`px-3 py-1 rounded-[8px] font-semibold transition-colors ${
              statusFilter === 'OUT'
                ? 'bg-white text-[#C62828] shadow-xs'
                : 'text-[#706C70] hover:text-[#2B282C]'
            }`}
          >
            Rupture
          </button>
        </div>
      </div>

      {/* Stock Items Table */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F6F6] text-[#706C70] uppercase font-semibold border-b border-[#E5E2E3]">
              <tr>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Article</th>
                <th className="py-3 px-4">Prix de vente</th>
                <th className="py-3 px-4">Quantité en stock</th>
                <th className="py-3 px-4">État</th>
                <th className="py-3 px-4 text-right">Régularisation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2E3]">
              {filteredVariants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#706C70]">
                    Aucun article ne correspond aux filtres sélectionnés
                  </td>
                </tr>
              ) : (
                filteredVariants.map((v) => (
                  <tr key={v.id} className="hover:bg-[#FDFDFD] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#2B282C]">{v.sku}</td>
                    <td className="py-3 px-4 font-medium text-[#2B282C]">{v.name}</td>
                    <td className="py-3 px-4 tabular-nums font-semibold text-[#9A050E]">
                      {formatMoney(v.sellingPrice)}
                    </td>
                    <td className="py-3 px-4 tabular-nums font-bold text-sm text-[#2B282C]">
                      {v.quantity ?? 0}
                    </td>
                    <td className="py-3 px-4">
                      <StockBadge quantity={v.quantity ?? 0} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
                        onClick={() => handleOpenAdjust(v)}
                      >
                        Ajuster le stock
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Adjust Stock */}
      {adjustingVariant && (
        <Modal
          isOpen={Boolean(adjustingVariant)}
          onClose={() => setAdjustingVariant(null)}
          title="Régularisation du stock physique"
          description={`Article : ${adjustingVariant.name} (${adjustingVariant.sku})`}
          maxWidth="sm"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAdjustingVariant(null)}
              >
                Annuler
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
                onClick={handleSaveAdjustment}
              >
                Enregistrer le stock réel
              </Button>
            </div>
          }
        >
          <div className="p-3 rounded-lg bg-[#FFF4DF] border border-[#D99016]/30 flex items-start gap-2.5 text-xs text-[#995B00]">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#D99016]" />
            <div>
              <strong>Règle contractuelle Boutica Cloud :</strong> Vous devez saisir la <em>nouvelle quantité absolue</em> constatée lors du comptage physique, et non pas un delta ou écart.
            </div>
          </div>

          <form onSubmit={handleSaveAdjustment} className="space-y-3 pt-2">
            <div className="flex justify-between items-center text-xs text-[#706C70] pb-1 border-b border-[#E5E2E3]">
              <span>Quantité actuellement enregistrée :</span>
              <span className="font-bold text-[#2B282C] text-sm tabular-nums">
                {adjustingVariant.quantity ?? 0} unités
              </span>
            </div>

            <Input
              label="Nouvelle quantité absolue en stock"
              type="number"
              min="0"
              value={newQuantity}
              onChange={(e) => setNewQuantity(parseInt(e.target.value) || 0)}
              required
            />

            <Input
              label="Motif / Note d'inventaire (optionnel)"
              placeholder="ex: Comptage inventaire de fin de mois, casse, régularisation..."
              value={adjustmentNote}
              onChange={(e) => setAdjustmentNote(e.target.value)}
            />
          </form>
        </Modal>
      )}
    </div>
  );
};
