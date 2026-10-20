import React, { useEffect, useRef, useState } from 'react';
import {
  RotateCcw,
  Plus,
  RefreshCw,
  Eye,
  AlertCircle,
  Package,
} from 'lucide-react';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { StatusBadge } from '../components/ui/StatusBadge.tsx';
import { formatMoney, generateIdempotencyKey } from '../lib/money.ts';
import { apiClient, ApiError } from '../lib/api-client.ts';
import { LoadError, errorText } from '../components/ui/LoadError.tsx';
import type { ReturnOrder, Sale, SaleItem } from '../types/api.ts';
import { toast } from 'sonner';

export const ReturnsPage: React.FC = () => {
  const [returns, setReturns] = useState<ReturnOrder[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Return Creation Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [returnCondition, setReturnCondition] = useState<'RESTOCK' | 'DAMAGED'>('RESTOCK');
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [selectedSaleItemId, setSelectedSaleItemId] = useState('');
  const [isLoadingSaleItems, setIsLoadingSaleItems] = useState(false);
  const [variantNames, setVariantNames] = useState<Map<string, string>>(new Map());
  const attemptRef = useRef<{ fingerprint: string; key: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    const [returnsRes, salesRes, variantsRes] = await Promise.allSettled([
      apiClient.listReturns({ pageSize: 50 }),
      apiClient.listSales({ pageSize: 50 }),
      apiClient.listAllVariants({ pageSize: 100 }),
    ]);
    if (returnsRes.status === 'fulfilled') {
      setReturns(returnsRes.value.data || []);
    } else {
      setReturns([]);
      setLoadError(errorText(returnsRes.reason, 'Impossible de charger les retours'));
    }
    setSales(salesRes.status === 'fulfilled' ? salesRes.value.data || [] : []);
    if (variantsRes.status === 'fulfilled') {
      setVariantNames(new Map(variantsRes.value.data.map((v) => [v.id, v.name])));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Lignes de la vente choisie (données serveur) : l'utilisateur choisit l'article retourné.
  useEffect(() => {
    setSaleItems([]);
    setSelectedSaleItemId('');
    if (!selectedSaleId) return;
    let cancelled = false;
    setIsLoadingSaleItems(true);
    apiClient
      .getSale(selectedSaleId)
      .then((sale) => {
        if (cancelled) return;
        setSaleItems(sale.items || []);
        setSelectedSaleItemId(sale.items?.[0]?.id ?? '');
      })
      .catch((err) => !cancelled && toast.error(errorText(err, 'Impossible de charger les articles de la vente')))
      .finally(() => !cancelled && setIsLoadingSaleItems(false));
    return () => {
      cancelled = true;
    };
  }, [selectedSaleId]);

  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    const item = saleItems.find((i) => i.id === selectedSaleItemId);
    if (!selectedSaleId || !item) {
      toast.error('Veuillez sélectionner la vente d’origine et l’article retourné');
      return;
    }
    if (returnQuantity < 1 || returnQuantity > item.quantity) {
      toast.error(`La quantité doit être comprise entre 1 et ${item.quantity} (quantité vendue)`);
      return;
    }

    const payload = {
      saleId: selectedSaleId,
      reason: returnReason.trim() || undefined,
      items: [{ saleItemId: item.id, quantity: returnQuantity, condition: returnCondition }],
    };
    const fingerprint = JSON.stringify(payload);
    if (!attemptRef.current || attemptRef.current.fingerprint !== fingerprint) {
      attemptRef.current = { fingerprint, key: generateIdempotencyKey() };
    }

    setIsSubmitting(true);
    try {
      await apiClient.createReturn(payload, attemptRef.current.key);
      attemptRef.current = null;
      toast.success('Retour confirmé par le serveur');
      setIsCreateOpen(false);
      setSelectedSaleId('');
      setReturnReason('');
      void loadData();
    } catch (err) {
      const uncertain = err instanceof ApiError && (err.isNetworkError || err.status >= 500);
      if (uncertain) {
        toast.error('Résultat incertain (réponse du serveur non reçue). Cliquez de nouveau sur « Valider le retour » : la demande sera rejouée sans doublon.', { duration: 12000 });
      } else {
        attemptRef.current = null;
        toast.error(errorText(err, 'Le retour a été refusé par le serveur'));
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
          <h1 className="text-xl font-bold text-[#2B282C]">Retours de Marchandises</h1>
          <p className="text-xs text-[#706C70] mt-0.5">
            Gestion des retours clients, réintégrations en stock et constats d'avaries
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="tertiary"
            size="sm"
            onClick={loadData}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Actualiser
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Nouveau Retour
          </Button>
        </div>
      </div>

      {/* Returns List Table */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F6F6] text-[#706C70] uppercase font-semibold border-b border-[#E5E2E3]">
              <tr>
                <th className="py-3 px-4">Réf. Retour</th>
                <th className="py-3 px-4">Vente d'origine</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Motif</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 font-bold text-[#C62828]">Montant Remboursé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2E3]">
              {returns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#706C70]">
                    Aucun retour enregistré
                  </td>
                </tr>
              ) : (
                returns.map((r) => (
                  <tr key={r.id} className="hover:bg-[#FDFDFD] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#2B282C] flex items-center gap-2">
                      <div className="p-1 rounded bg-[#FCEAEC] text-[#9A050E]">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </div>
                      <span>{r.id.slice(0, 12)}...</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#706C70]">
                      {r.saleId ? r.saleId.slice(0, 12) + '...' : '—'}
                    </td>
                    <td className="py-3 px-4 text-[#706C70]">
                      {new Date(r.createdAt).toLocaleString('fr-FR')}
                    </td>
                    <td className="py-3 px-4 text-[#706C70]">{r.reason || 'Retour standard'}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="py-3 px-4 tabular-nums font-bold text-sm text-[#C62828]">
                      {formatMoney(r.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Create Return */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Enregistrer un retour client"
        description="Associez le retour à un ticket de vente existant."
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
              onClick={handleCreateReturn}
            >
              Valider le retour
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateReturn} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-[#2B282C] block mb-1">
              Ticket de vente d'origine
            </label>
            <select
              value={selectedSaleId}
              onChange={(e) => setSelectedSaleId(e.target.value)}
              required
              className="w-full h-10 text-xs bg-white border border-[#E5E2E3] rounded-[10px] px-3 text-[#2B282C] focus:outline-none focus:border-[#9A050E]"
            >
              <option value="">Sélectionner une vente...</option>
              {sales.map((s) => (
                <option key={s.id} value={s.id}>
                  Vente #{s.id.slice(0, 8)} — {formatMoney(s.total)} ({new Date(s.createdAt).toLocaleDateString('fr-FR')})
                </option>
              ))}
            </select>
          </div>

          {selectedSaleId && (
            <div>
              <label className="text-xs font-semibold text-[#2B282C] block mb-1">Article retourné</label>
              <select
                value={selectedSaleItemId}
                onChange={(e) => {
                  setSelectedSaleItemId(e.target.value);
                  setReturnQuantity(1);
                }}
                disabled={isLoadingSaleItems || saleItems.length === 0}
                className="w-full h-10 text-xs bg-white border border-[#E5E2E3] rounded-[10px] px-3 text-[#2B282C] focus:outline-none focus:border-[#9A050E] disabled:opacity-60"
              >
                {isLoadingSaleItems && <option value="">Chargement…</option>}
                {saleItems.map((it) => (
                  <option key={it.id} value={it.id}>
                    {variantNames.get(it.variantId) ?? `Article ${it.variantId.slice(0, 8)}`} — vendu : {it.quantity}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#2B282C] block mb-1">
                Condition
              </label>
              <select
                value={returnCondition}
                onChange={(e) => setReturnCondition(e.target.value as any)}
                className="w-full h-10 text-xs bg-white border border-[#E5E2E3] rounded-[10px] px-3 text-[#2B282C] focus:outline-none focus:border-[#9A050E]"
              >
                <option value="RESTOCK">Réintégrer au stock (Intact)</option>
                <option value="DAMAGED">Matériau endommagé (Rebut)</option>
              </select>
            </div>

            <Input
              label="Quantité retournée"
              type="number"
              min="1"
              value={returnQuantity}
              onChange={(e) => setReturnQuantity(parseInt(e.target.value) || 1)}
              required
            />
          </div>

          <Input
            label="Motif du retour (optionnel)"
            placeholder="ex: Erreur de calibre fer, surplus de chantier..."
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
          />
        </form>
      </Modal>
    </div>
  );
};
