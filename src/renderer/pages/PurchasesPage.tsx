import React, { useEffect, useRef, useState } from 'react';
import {
  Truck,
  Plus,
  RefreshCw,
  Eye,
  Trash2,
  Building2,
} from 'lucide-react';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { StatusBadge } from '../components/ui/StatusBadge.tsx';
import { formatMoney, generateIdempotencyKey } from '../lib/money.ts';
import { apiClient, ApiError } from '../lib/api-client.ts';
import { LoadError, errorText } from '../components/ui/LoadError.tsx';
import type { Purchase, Supplier, Variant } from '../types/api.ts';
import { toast } from 'sonner';

export const PurchasesPage: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Reception Modal
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [purchaseItems, setPurchaseItems] = useState<Array<{ variantId: string; quantity: number; unitPrice: number }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    const [purchasesRes, suppliersRes, variantsRes] = await Promise.allSettled([
      apiClient.listPurchases({ pageSize: 50 }),
      apiClient.listSuppliers({ pageSize: 50 }),
      apiClient.listAllVariants({ pageSize: 100 }),
    ]);

    if (purchasesRes.status === 'fulfilled') {
      setPurchases(purchasesRes.value.data || []);
    } else {
      setPurchases([]);
      setLoadError(errorText(purchasesRes.reason, 'Impossible de charger les achats'));
    }
    setSuppliers(suppliersRes.status === 'fulfilled' ? suppliersRes.value.data || [] : []);
    setVariants(variantsRes.status === 'fulfilled' ? variantsRes.value.data || [] : []);
    if (suppliersRes.status === 'rejected' || variantsRes.status === 'rejected') {
      toast.warning('Fournisseurs ou articles indisponibles : la réception est limitée.');
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Écoute des raccourcis globaux (Actualiser Ctrl+R et Créer Ctrl+N)
  useEffect(() => {
    const handleRefresh = () => {
      loadData();
    };
    const handleCreateNew = () => {
      setIsReceiveModalOpen(true);
      if (purchaseItems.length === 0 && variants.length > 0) {
        handleAddItemToReception();
      }
    };
    window.addEventListener('boutica:refresh', handleRefresh);
    window.addEventListener('boutica:create-new', handleCreateNew);
    return () => {
      window.removeEventListener('boutica:refresh', handleRefresh);
      window.removeEventListener('boutica:create-new', handleCreateNew);
    };
  }, [purchaseItems.length, variants.length]);

  const handleAddItemToReception = () => {
    if (variants.length === 0) return;
    setPurchaseItems((prev) => [
      ...prev,
      {
        variantId: variants[0].id,
        quantity: 1,
        unitPrice: parseFloat(variants[0].purchasePrice) || 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setPurchaseItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    setPurchaseItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        return { ...item, [field]: value };
      })
    );
  };

  const totalReceptionCost = purchaseItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const attemptRef = useRef<{ fingerprint: string; key: string } | null>(null);

  const handleReceivePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (purchaseItems.length === 0) {
      toast.error('Veuillez ajouter au moins une ligne d’article à réceptionner');
      return;
    }

    const payload = {
      supplierId: selectedSupplierId || undefined,
      items: purchaseItems.map((item) => ({
        variantId: item.variantId,
        quantity: Math.max(1, Math.floor(item.quantity)),
        unitPrice: Math.max(0.01, item.unitPrice),
      })),
    };
    const fingerprint = JSON.stringify(payload);
    if (!attemptRef.current || attemptRef.current.fingerprint !== fingerprint) {
      attemptRef.current = { fingerprint, key: generateIdempotencyKey() };
    }

    setIsSubmitting(true);
    try {
      await apiClient.receivePurchase(payload, attemptRef.current.key);
      attemptRef.current = null;
      toast.success('Réception confirmée par le serveur : stock mis à jour');
      setIsReceiveModalOpen(false);
      setPurchaseItems([]);
      void loadData();
    } catch (err) {
      const uncertain = err instanceof ApiError && (err.isNetworkError || err.status >= 500);
      if (uncertain) {
        toast.error('Résultat incertain (réponse du serveur non reçue). Cliquez de nouveau pour valider : la demande sera rejouée sans doublon.', { duration: 12000 });
      } else {
        attemptRef.current = null;
        toast.error(errorText(err, 'La réception a été refusée par le serveur'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {loadError && <LoadError message={loadError} onRetry={loadData} />}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E2E3]">
        <div>
          <h1 className="text-xl font-bold text-[#2B282C]">Réception des Achats Fournisseurs</h1>
          <p className="text-xs text-[#706C70] mt-0.5">
            Entrées en stock de matériaux et enregistrement des factures d'achat
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="tertiary"
            size="sm"
            onClick={loadData}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            title="Actualiser les achats (Ctrl+R)"
          >
            <span>Actualiser</span>
            <kbd className="hidden md:inline font-mono text-[9px] px-1 py-0.2 rounded bg-black/5 text-[#706C70]">Ctrl+R</kbd>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setIsReceiveModalOpen(true);
              if (purchaseItems.length === 0 && variants.length > 0) {
                handleAddItemToReception();
              }
            }}
            leftIcon={<Plus className="w-4 h-4" />}
            title="Réceptionner des marchandises (Ctrl+N)"
          >
            <span>Réceptionner Stock</span>
            <kbd className="hidden md:inline font-mono text-[9px] px-1 py-0.2 rounded bg-white/20 text-white font-bold">Ctrl+N</kbd>
          </Button>
        </div>
      </div>

      {/* Purchases List Table */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F6F6] text-[#706C70] uppercase font-semibold border-b border-[#E5E2E3]">
              <tr>
                <th className="py-3 px-4">Réf. Bon Achat</th>
                <th className="py-3 px-4">Date de Réception</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 font-bold text-[#16804A]">Montant Total Achat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2E3]">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-[#706C70]">
                    Aucun bon d'achat enregistré
                  </td>
                </tr>
              ) : (
                purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-[#FDFDFD] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#2B282C] flex items-center gap-2">
                      <div className="p-1 rounded bg-[#EAF6EF] text-[#16804A]">
                        <Truck className="w-3.5 h-3.5" />
                      </div>
                      <span>{p.id.slice(0, 12)}...</span>
                    </td>
                    <td className="py-3 px-4 text-[#706C70]">
                      {new Date(p.createdAt).toLocaleString('fr-FR')}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-3 px-4 tabular-nums font-bold text-sm text-[#16804A]">
                      {formatMoney(p.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Receive Purchase */}
      <Modal
        isOpen={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
        title="Réception de Matériaux Fournisseur"
        description="Les articles saisis seront immédiatement crédités au stock commercial."
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-xs font-bold text-[#2B282C]">
              Total Facture Achat :{' '}
              <span className="text-[#16804A] text-sm tabular-nums">
                {formatMoney(totalReceptionCost)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsReceiveModalOpen(false)}>
                Annuler
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
                onClick={handleReceivePurchase}
              >
                Confirmer la Réception
              </Button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleReceivePurchase} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[#2B282C] block mb-1">
              Fournisseur (Optionnel)
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full h-10 text-xs bg-white border border-[#E5E2E3] rounded-[10px] px-3 text-[#2B282C] focus:outline-none focus:border-[#9A050E]"
            >
              <option value="">Sélectionner un fournisseur...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.phone ? `(${s.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#2B282C]">Articles à réceptionner</span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddItemToReception}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Ajouter une ligne
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {purchaseItems.map((item, index) => (
                <div
                  key={index}
                  className="p-3 rounded-xl border border-[#E5E2E3] bg-[#FDFDFD] flex items-center gap-3"
                >
                  <div className="flex-1">
                    <label className="text-[10px] text-[#706C70] font-semibold block mb-0.5">
                      Variante
                    </label>
                    <select
                      value={item.variantId}
                      onChange={(e) => {
                        const selected = variants.find((v) => v.id === e.target.value);
                        handleUpdateItem(index, 'variantId', e.target.value);
                        if (selected) {
                          handleUpdateItem(index, 'unitPrice', parseFloat(selected.purchasePrice) || 0);
                        }
                      }}
                      className="w-full h-8 text-xs bg-white border border-[#E5E2E3] rounded-[8px] px-2"
                    >
                      {variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} ({v.sku})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-24">
                    <label className="text-[10px] text-[#706C70] font-semibold block mb-0.5">
                      Quantité
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 1)
                      }
                      className="w-full h-8 text-xs px-2 border border-[#E5E2E3] rounded-[8px] text-center font-bold"
                    />
                  </div>

                  <div className="w-32">
                    <label className="text-[10px] text-[#706C70] font-semibold block mb-0.5">
                      Prix Achat unitaire (XOF)
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) =>
                        handleUpdateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)
                      }
                      className="w-full h-8 text-xs px-2 border border-[#E5E2E3] rounded-[8px] text-right font-bold"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className="p-1 text-[#706C70] hover:text-[#C62828] mt-3"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
