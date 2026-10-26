import React, { useEffect, useState } from 'react';
import {
  Receipt,
  Search,
  Calendar,
  Eye,
  Printer,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { StatusBadge } from '../components/ui/StatusBadge.tsx';
import { formatMoney } from '../lib/money.ts';
import { apiClient } from '../lib/api-client.ts';
import { useUIStore } from '../store/uiStore.ts';
import type { Sale, SaleItem } from '../types/api.ts';
import { toast } from 'sonner';
import { LoadError, errorText } from '../components/ui/LoadError.tsx';
import { parseMoneyToNumber } from '../lib/money.ts';

export const SalesHistoryPage: React.FC = () => {
  const { openReceipt } = useUIStore();
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Selected sale for viewing details
  const [selectedSale, setSelectedSale] = useState<(Sale & { items: SaleItem[] }) | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSales = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await apiClient.listSales({ pageSize: 50 });
      setSales(res.data || []);
    } catch (err) {
      setSales([]);
      setLoadError(errorText(err, 'Impossible de charger l’historique des ventes'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  // Écoute de l'événement d'actualisation globale (Ctrl+R / Cmd+R)
  useEffect(() => {
    const handleRefresh = () => {
      loadSales();
    };
    window.addEventListener('boutica:refresh', handleRefresh);
    return () => window.removeEventListener('boutica:refresh', handleRefresh);
  }, []);

  const handleViewSale = async (sale: Sale) => {
    setIsLoadingDetails(true);
    try {
      const details = await apiClient.getSale(sale.id);
      setSelectedSale(details);
    } catch (err) {
      toast.error(errorText(err, 'Impossible de charger le détail de la vente'));
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const [isPreparingReceipt, setIsPreparingReceipt] = useState(false);

  // Le reçu est reconstruit à partir des données serveur uniquement (noms d'articles et client réels).
  const handleReprintReceipt = async (sale: Sale & { items: SaleItem[] }) => {
    setIsPreparingReceipt(true);
    try {
      const [variantsRes, customerRes] = await Promise.allSettled([
        apiClient.listAllVariants({ pageSize: 100 }),
        sale.customerId ? apiClient.getCustomer(sale.customerId) : Promise.resolve(null),
      ]);
      const nameByVariant = new Map(
        variantsRes.status === 'fulfilled' ? variantsRes.value.data.map((v) => [v.id, v.name]) : []
      );
      const customerName =
        customerRes.status === 'fulfilled' && customerRes.value ? customerRes.value.name : 'Client Comptoir';

      openReceipt({
        saleId: sale.id,
        saleDate: sale.createdAt,
        customerName,
        items: (sale.items || []).map((item) => {
          const unitPrice = parseMoneyToNumber(item.unitPrice);
          return {
            name: nameByVariant.get(item.variantId) ?? `Article ${item.variantId.slice(0, 8)}`,
            quantity: item.quantity,
            unitPrice,
            total: Math.round(unitPrice * item.quantity * 100) / 100,
          };
        }),
        subtotal: parseMoneyToNumber(sale.subtotal),
        discount: parseMoneyToNumber(sale.discount),
        total: parseMoneyToNumber(sale.total),
      });
    } finally {
      setIsPreparingReceipt(false);
    }
  };

  return (
    <div className="space-y-6">
      {loadError && <LoadError message={loadError} onRetry={loadSales} />}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E2E3]">
        <div>
          <h1 className="text-xl font-bold text-[#2B282C]">Historique des Ventes</h1>
          <p className="text-xs text-[#706C70] mt-0.5">
            Journal complet des encaissements et réimpression de tickets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="tertiary"
            size="sm"
            onClick={loadSales}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            title="Actualiser la liste (Ctrl+R)"
          >
            <span>Actualiser</span>
            <kbd className="hidden md:inline font-mono text-[9px] px-1 py-0.2 rounded bg-black/5 text-[#706C70]">Ctrl+R</kbd>
          </Button>
        </div>
      </div>

      {/* Sales Table */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F6F6] text-[#706C70] uppercase font-semibold border-b border-[#E5E2E3]">
              <tr>
                <th className="py-3 px-4">Réf. Vente</th>
                <th className="py-3 px-4">Date & Heure</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4">Sous-total</th>
                <th className="py-3 px-4">Remise</th>
                <th className="py-3 px-4 font-bold text-[#9A050E]">Total Encaissé</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2E3]">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#706C70]">
                    Aucune vente enregistrée
                  </td>
                </tr>
              ) : (
                sales.map((s) => (
                  <tr key={s.id} className="hover:bg-[#FDFDFD] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#2B282C] flex items-center gap-2">
                      <div className="p-1 rounded bg-[#FCEAEC] text-[#9A050E]">
                        <ShoppingBag className="w-3.5 h-3.5" />
                      </div>
                      <span>{s.id.slice(0, 12)}...</span>
                    </td>
                    <td className="py-3 px-4 text-[#706C70]">
                      {new Date(s.createdAt).toLocaleString('fr-FR')}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="py-3 px-4 tabular-nums text-[#706C70]">
                      {formatMoney(s.subtotal)}
                    </td>
                    <td className="py-3 px-4 tabular-nums text-[#C62828]">
                      {parseMoneyToNumber(s.discount) > 0 ? `-${formatMoney(s.discount)}` : formatMoney(0)}
                    </td>
                    <td className="py-3 px-4 tabular-nums font-bold text-sm text-[#9A050E]">
                      {formatMoney(s.total)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleViewSale(s)}
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                      >
                        Détails
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Sale Detail Modal */}
      {selectedSale && (
        <Modal
          isOpen={Boolean(selectedSale)}
          onClose={() => setSelectedSale(null)}
          title={`Détail Vente #${selectedSale.id.slice(0, 8)}`}
          description={`Enregistrée le ${new Date(selectedSale.createdAt).toLocaleString('fr-FR')}`}
          maxWidth="md"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button variant="ghost" size="sm" onClick={() => setSelectedSale(null)}>
                Fermer
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Printer className="w-4 h-4" />}
                onClick={() => handleReprintReceipt(selectedSale)}
                isLoading={isPreparingReceipt}
              >
                Imprimer le ticket
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#F7F6F6] text-xs">
              <div>
                <span className="text-[#706C70]">Statut :</span>
                <div className="mt-1">
                  <StatusBadge status={selectedSale.status} />
                </div>
              </div>
              <div>
                <span className="text-[#706C70]">Sous-total :</span>
                <div className="font-bold tabular-nums text-[#2B282C] mt-1">
                  {formatMoney(selectedSale.subtotal)}
                </div>
              </div>
              <div>
                <span className="text-[#706C70]">Net Encaissé :</span>
                <div className="font-bold tabular-nums text-[#9A050E] text-sm mt-1">
                  {formatMoney(selectedSale.total)}
                </div>
              </div>
            </div>

            <div className="border border-[#E5E2E3] rounded-xl overflow-hidden">
              <div className="bg-[#F7F6F6] px-3 py-2 text-xs font-semibold text-[#706C70] border-b border-[#E5E2E3]">
                Lignes d'articles
              </div>
              <div className="p-3 divide-y divide-[#E5E2E3] text-xs">
                {(selectedSale.items || []).map((item, idx) => (
                  <div key={idx} className="py-2 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-[#2B282C]">Article {idx + 1}</div>
                      <div className="text-[10px] text-[#706C70]">
                        Quantité : {item.quantity} × {formatMoney(item.unitPrice)}
                      </div>
                    </div>
                    <div className="font-bold tabular-nums text-[#2B282C]">
                      {formatMoney(item.quantity * parseMoneyToNumber(item.unitPrice))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
