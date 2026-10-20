import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Boxes,
  Wallet,
  Coins,
  AlertTriangle,
  ArrowUpRight,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { StockBadge } from '../components/ui/StockBadge.tsx';
import { formatMoney } from '../lib/money.ts';
import { apiClient } from '../lib/api-client.ts';
import { useUIStore } from '../store/uiStore.ts';
import type { DashboardReport } from '../types/api.ts';
import { toast } from 'sonner';
import { LoadError, errorText } from '../components/ui/LoadError.tsx';

export const DashboardPage: React.FC = () => {
  const { setCurrentPage } = useUIStore();
  const [report, setReport] = useState<DashboardReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient.getDashboardReport();
      setReport(data);
    } catch (err) {
      // Pas de chiffres de remplacement : un tableau de bord à zéro serait pris pour une vraie situation.
      setReport(null);
      setError(errorText(err, 'Données du tableau de bord indisponibles'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleDownloadExport = async (
    type: 'sales/excel' | 'inventory/excel' | 'sales/pdf' | 'inventory/pdf',
    _suggestedName?: string
  ) => {
    try {
      const res = await apiClient.downloadReport(type);
      if ('filePath' in res) toast.success('Rapport enregistré');
    } catch (err) {
      toast.error(errorText(err, 'Échec du téléchargement du rapport'));
    }
  };

  return (
    <div className="space-y-6">
      {error && <LoadError message={error} onRetry={fetchDashboardData} />}
      {/* Header with Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E2E3]">
        <div>
          <h1 className="text-xl font-bold text-[#2B282C]">Tableau de bord</h1>
          <p className="text-xs text-[#706C70] mt-0.5">
            Indicateurs d'activité en temps réel pour votre commerce de matériaux
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="tertiary"
            size="sm"
            onClick={fetchDashboardData}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Actualiser
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCurrentPage('pos')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Nouvelle Vente (F2)
          </Button>
        </div>
      </div>

      {/* KPI Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <Card>
          <div className="flex items-center justify-between text-[#706C70] text-xs font-medium">
            <span>Chiffre d'affaires</span>
            <div className="p-2 rounded-lg bg-[#EAF6EF] text-[#16804A]">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#2B282C] tabular-nums">
              {isLoading ? '...' : report ? formatMoney(report.revenue) : '—'}
            </div>
            <div className="text-[11px] text-[#16804A] font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>Ventes encaissées de la période</span>
            </div>
          </div>
        </Card>

        {/* Profit */}
        <Card>
          <div className="flex items-center justify-between text-[#706C70] text-xs font-medium">
            <span>Bénéfice estimé</span>
            <div className="p-2 rounded-lg bg-[#EAF2FB] text-[#3478C8]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#2B282C] tabular-nums">
              {isLoading ? '...' : report ? formatMoney(report.estimatedProfit) : '—'}
            </div>
            <div className="text-[11px] text-[#706C70] mt-1">
              Marge brute déduite des dépenses
            </div>
          </div>
        </Card>

        {/* Stock Value */}
        <Card>
          <div className="flex items-center justify-between text-[#706C70] text-xs font-medium">
            <span>Valeur du stock</span>
            <div className="p-2 rounded-lg bg-[#FFF4DF] text-[#D99016]">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#2B282C] tabular-nums">
              {isLoading ? '...' : report ? formatMoney(report.stockValue) : '—'}
            </div>
            <div className="text-[11px] text-[#706C70] mt-1">
              Au prix d'achat fournisseur
            </div>
          </div>
        </Card>

        {/* Expenses */}
        <Card>
          <div className="flex items-center justify-between text-[#706C70] text-xs font-medium">
            <span>Dépenses d'exploitation</span>
            <div className="p-2 rounded-lg bg-[#FCEAEC] text-[#C62828]">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#2B282C] tabular-nums">
              {isLoading ? '...' : report ? formatMoney(report.expensesTotal) : '—'}
            </div>
            <div className="text-[11px] text-[#706C70] mt-1">
              Charges et frais enregistrés
            </div>
          </div>
        </Card>
      </div>

      {/* Main Grid: Top Products & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Products */}
        <Card>
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E2E3]">
            <h2 className="text-sm font-bold text-[#2B282C]">Articles les plus vendus</h2>
            <button
              type="button"
              onClick={() => setCurrentPage('products')}
              className="text-xs text-[#9A050E] font-semibold hover:underline flex items-center gap-1"
            >
              Voir le catalogue
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#E5E2E3] mt-2">
            {!report?.topProducts || report.topProducts.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#706C70]">
                Aucune vente enregistrée sur cette période
              </div>
            ) : (
              report.topProducts.map((p, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-[#2B282C]">
                      {p.variantName || p.productName}
                    </div>
                    <div className="text-[10px] text-[#706C70]">SKU : {p.sku}</div>
                  </div>
                  <div className="text-xs font-bold text-[#16804A] bg-[#EAF6EF] px-2.5 py-1 rounded-full tabular-nums">
                    {p.quantitySold} vendus
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E2E3]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#D99016]" />
              <h2 className="text-sm font-bold text-[#2B282C]">Alertes de réapprovisionnement</h2>
            </div>
            <button
              type="button"
              onClick={() => setCurrentPage('inventory')}
              className="text-xs text-[#9A050E] font-semibold hover:underline flex items-center gap-1"
            >
              Gérer les stocks
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#E5E2E3] mt-2">
            {!report?.lowStockAlerts || report.lowStockAlerts.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#706C70]">
                Tous les niveaux de stock sont optimaux
              </div>
            ) : (
              report.lowStockAlerts.map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-[#2B282C]">{item.variantName}</div>
                    <div className="text-[10px] text-[#706C70]">SKU : {item.sku}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StockBadge quantity={item.quantity} />
                    <Button
                      variant="tertiary"
                      size="sm"
                      onClick={() => setCurrentPage('inventory')}
                    >
                      Ajuster
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Export Bar */}
      <Card padding="sm" className="bg-[#F7F6F6] border-dashed">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#16804A]" />
            <span className="text-xs font-semibold text-[#2B282C]">
              Exports officiels certifiés Boutica Cloud :
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<FileSpreadsheet className="w-3.5 h-3.5" />}
              onClick={() => handleDownloadExport('sales/excel', `ventes-${new Date().toISOString().slice(0, 10)}.xlsx`)}
            >
              Ventes (Excel)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<FileSpreadsheet className="w-3.5 h-3.5" />}
              onClick={() => handleDownloadExport('inventory/excel', `inventaire-${new Date().toISOString().slice(0, 10)}.xlsx`)}
            >
              Stock (Excel)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<FileText className="w-3.5 h-3.5" />}
              onClick={() => handleDownloadExport('sales/pdf', `rapport-ventes-${new Date().toISOString().slice(0, 10)}.pdf`)}
            >
              Rapport Ventes (PDF)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<FileText className="w-3.5 h-3.5" />}
              onClick={() => handleDownloadExport('inventory/pdf', `etat-stocks-${new Date().toISOString().slice(0, 10)}.pdf`)}
            >
              État Stocks (PDF)
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
