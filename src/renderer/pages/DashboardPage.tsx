import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  FileSpreadsheet,
  FileText,
  Layers,
  Package,
  Plus,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  XCircle,
  CreditCard,
  Building2,
  Tag,
} from 'lucide-react';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { StockBadge } from '../components/ui/StockBadge.tsx';
import { apiClient } from '../lib/api-client.ts';
import { useUIStore } from '../store/uiStore.ts';
import type {
  DashboardReport,
  Sale,
  Expense,
  Purchase,
  ReturnOrder,
} from '../types/api.ts';
import { toast } from 'sonner';
import { LoadError, errorText } from '../components/ui/LoadError.tsx';
import { formatMoney, parseMoneyToNumber } from '../lib/money.ts';
import {
  getGreeting,
  getPeriodRange,
  aggregateSalesByDay,
  computeAverageCart,
  type DashboardPeriod,
} from '../lib/dashboard-analytics.ts';
import { RevenueChart } from '../components/dashboard/RevenueChart.tsx';

type ActivityTab = 'all' | 'sales' | 'expenses' | 'purchases' | 'returns';

interface ActivityItem {
  id: string;
  type: 'sale' | 'expense' | 'purchase' | 'return';
  title: string;
  subtitle: string;
  amount: number;
  date: string;
  status?: string;
  targetPage: 'sales' | 'expenses' | 'purchases' | 'returns';
}

export const DashboardPage: React.FC = () => {
  const { setCurrentPage, session } = useUIStore();
  const [period, setPeriod] = useState<DashboardPeriod>('month');

  // Main reports & lists state
  const [report, setReport] = useState<DashboardReport | null>(null);
  const [periodSales, setPeriodSales] = useState<Sale[]>([]);
  const [todaySales, setTodaySales] = useState<Sale[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<Purchase[]>([]);
  const [recentReturns, setRecentReturns] = useState<ReturnOrder[]>([]);
  const [totalProductsCount, setTotalProductsCount] = useState<number>(0);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activityTab, setActivityTab] = useState<ActivityTab>('all');

  const currency = session?.user.businessCurrency || 'XOF';

  // Greeting and localized date
  const greetingInfo = useMemo(() => {
    return getGreeting(session?.user.name);
  }, [session?.user.name]);

  const todayFormatted = useMemo(() => {
    const now = new Date();
    const str = now.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return str.charAt(0).toUpperCase() + str.slice(1);
  }, []);

  const loadDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    const range = getPeriodRange(period);
    const todayRange = getPeriodRange('today');

    try {
      // 1. Fetch dashboard report from Cloud for the selected period
      const reportPromise = apiClient.getDashboardReport({
        from: range.from.toISOString(),
        to: range.to.toISOString(),
        lowStockThreshold: 10,
      });

      // 2. Fetch sales for the selected period (for daily chart aggregation)
      const salesPromise = apiClient
        .listSales({
          from: range.from.toISOString(),
          to: range.to.toISOString(),
          pageSize: 100,
        })
        .catch(() => ({ data: [], total: 0 }));

      // 3. Fetch today's sales (if period is not 'today', so we always know today's sales)
      const todaySalesPromise =
        period === 'today'
          ? Promise.resolve(null)
          : apiClient
              .listSales({
                from: todayRange.from.toISOString(),
                to: todayRange.to.toISOString(),
                pageSize: 100,
              })
              .catch(() => ({ data: [], total: 0 }));

      // 4. Fetch supplementary activity lists (expenses, purchases, returns, products count)
      const expensesPromise = apiClient
        .listExpenses({ pageSize: 6 })
        .catch(() => ({ data: [], total: 0 }));

      const purchasesPromise = apiClient
        .listPurchases({ pageSize: 6 })
        .catch(() => ({ data: [], total: 0 }));

      const returnsPromise = apiClient
        .listReturns({ pageSize: 6 })
        .catch(() => ({ data: [], total: 0 }));

      const productsPromise = apiClient
        .listProducts({ pageSize: 1 })
        .catch(() => ({ data: [], total: 0 }));

      const [
        reportData,
        salesRes,
        todaySalesRes,
        expensesRes,
        purchasesRes,
        returnsRes,
        productsRes,
      ] = await Promise.all([
        reportPromise,
        salesPromise,
        todaySalesPromise,
        expensesPromise,
        purchasesPromise,
        returnsPromise,
        productsPromise,
      ]);

      setReport(reportData);
      setPeriodSales(salesRes.data || []);
      setTodaySales(todaySalesRes ? todaySalesRes.data || [] : salesRes.data || []);
      setRecentExpenses(expensesRes.data || []);
      setRecentPurchases(purchasesRes.data || []);
      setRecentReturns(returnsRes.data || []);
      setTotalProductsCount(productsRes.total || 0);
    } catch (err) {
      setReport(null);
      setError(errorText(err, 'Données du tableau de bord indisponibles'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Écoute de l'événement d'actualisation globale (Ctrl+R / Cmd+R)
  useEffect(() => {
    const handleRefresh = () => {
      loadDashboardData();
    };
    window.addEventListener('boutica:refresh', handleRefresh);
    return () => window.removeEventListener('boutica:refresh', handleRefresh);
  }, [loadDashboardData]);

  // Calculations for commercial KPIs
  const todayRevenue = useMemo(() => {
    return todaySales
      .filter((s) => s.status !== 'CANCELLED')
      .reduce((acc, s) => acc + parseMoneyToNumber(s.total), 0);
  }, [todaySales]);

  const todaySalesCount = useMemo(() => {
    return todaySales.filter((s) => s.status !== 'CANCELLED').length;
  }, [todaySales]);

  const periodSalesCount = useMemo(() => {
    return periodSales.filter((s) => s.status !== 'CANCELLED').length;
  }, [periodSales]);

  const periodRevenue = useMemo(() => {
    if (report?.revenue) return parseMoneyToNumber(report.revenue);
    return periodSales
      .filter((s) => s.status !== 'CANCELLED')
      .reduce((acc, s) => acc + parseMoneyToNumber(s.total), 0);
  }, [report?.revenue, periodSales]);

  const averageCart = useMemo(() => {
    return computeAverageCart(periodRevenue, periodSalesCount);
  }, [periodRevenue, periodSalesCount]);

  // Stock health counts
  const stockSummary = useMemo(() => {
    const alerts = report?.lowStockAlerts || [];
    const outOfStock = alerts.filter((a) => a.quantity <= 0);
    const lowStock = alerts.filter((a) => a.quantity > 0);
    return {
      totalAlerts: alerts.length,
      outOfStockCount: outOfStock.length,
      lowStockCount: lowStock.length,
    };
  }, [report?.lowStockAlerts]);

  // Aggregate daily points for the chart
  const chartPoints = useMemo(() => {
    return aggregateSalesByDay(periodSales, period);
  }, [periodSales, period]);

  // Unified recent activity feed
  const combinedActivities = useMemo(() => {
    const list: ActivityItem[] = [];

    // 1. Sales
    (report?.recentSales || []).forEach((s) => {
      list.push({
        id: `sale-${s.id}`,
        type: 'sale',
        title: `Vente #${s.id.slice(0, 8)}`,
        subtitle: s.customerId ? 'Client comptoir identifié' : 'Client passage',
        amount: parseMoneyToNumber(s.total),
        date: s.createdAt,
        status: 'Terminée',
        targetPage: 'sales',
      });
    });

    // 2. Expenses
    recentExpenses.forEach((exp) => {
      list.push({
        id: `exp-${exp.id}`,
        type: 'expense',
        title: `Dépense : ${exp.category}`,
        subtitle: exp.description || 'Frais d’exploitation',
        amount: parseMoneyToNumber(exp.amount),
        date: exp.createdAt,
        targetPage: 'expenses',
      });
    });

    // 3. Purchases
    recentPurchases.forEach((pur) => {
      list.push({
        id: `pur-${pur.id}`,
        type: 'purchase',
        title: `Achat Fournisseur #${pur.id.slice(0, 8)}`,
        subtitle: pur.status === 'RECEIVED' ? 'Marchandises réceptionnées' : 'Commande en cours',
        amount: parseMoneyToNumber(pur.total),
        date: pur.createdAt,
        status: pur.status,
        targetPage: 'purchases',
      });
    });

    // 4. Returns
    recentReturns.forEach((ret) => {
      list.push({
        id: `ret-${ret.id}`,
        type: 'return',
        title: `Retour Vente #${ret.saleId?.slice(0, 8) || ret.id.slice(0, 8)}`,
        subtitle: ret.reason || 'Retour article en magasin',
        amount: parseMoneyToNumber(ret.total),
        date: ret.createdAt,
        status: ret.status,
        targetPage: 'returns',
      });
    });

    // Sort chronologically (newest first)
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return list;
  }, [report?.recentSales, recentExpenses, recentPurchases, recentReturns]);

  const filteredActivities = useMemo(() => {
    if (activityTab === 'all') return combinedActivities.slice(0, 10);
    const typeMap: Record<Exclude<ActivityTab, 'all'>, ActivityItem['type']> = {
      sales: 'sale',
      expenses: 'expense',
      purchases: 'purchase',
      returns: 'return',
    };
    const targetType = typeMap[activityTab];
    return combinedActivities.filter((a) => a.type === targetType).slice(0, 10);
  }, [combinedActivities, activityTab]);

  const handleDownloadExport = async (
    type: 'sales/excel' | 'inventory/excel' | 'sales/pdf' | 'inventory/pdf'
  ) => {
    try {
      const res = await apiClient.downloadReport(type);
      if ('filePath' in res) toast.success('Rapport officiel téléchargé avec succès');
    } catch (err) {
      toast.error(errorText(err, 'Échec du téléchargement du rapport'));
    }
  };

  return (
    <div className="space-y-6">
      {error && <LoadError message={error} onRetry={() => loadDashboardData(false)} />}

      {/* 1. Header with Personalized Welcome, Business info, Period Filter & Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-[#E5E2E3]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-[#706C70] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#9A050E]" />
              {todayFormatted}
            </span>
            {session?.user.businessName && (
              <>
                <span className="text-[#E5E2E3]">•</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#F7F6F6] border border-[#E5E2E3] text-[11px] font-semibold text-[#2B282C]">
                  <Building2 className="w-3 h-3 text-[#9A050E]" />
                  {session.user.businessName}
                </span>
              </>
            )}
          </div>
          <h1 className="text-2xl font-bold text-[#2B282C] tracking-tight">
            {greetingInfo.fullMessage}
          </h1>
          <p className="text-xs text-[#706C70] mt-0.5">
            Voici le résumé de votre activité commerciale et la situation de votre stock de matériaux.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector Tabs */}
          <div className="flex items-center bg-[#F7F6F6] p-0.5 sm:p-1 rounded-xl border border-[#E5E2E3] text-[11px] sm:text-xs overflow-x-auto">
            {(
              [
                { key: 'today', label: "Aujourd'hui" },
                { key: '7d', label: '7 jours' },
                { key: '30d', label: '30 jours' },
                { key: 'month', label: 'Ce mois' },
              ] as const
            ).map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  period === p.key
                    ? 'bg-white text-[#9A050E] shadow-xs'
                    : 'text-[#706C70] hover:text-[#2B282C]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Button
            variant="tertiary"
            size="sm"
            onClick={() => loadDashboardData(true)}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Actualiser
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setCurrentPage('pos')}
            leftIcon={<Plus className="w-4 h-4" />}
            className="shadow-sm font-bold"
          >
            Nouvelle Vente (F2)
          </Button>
        </div>
      </div>

      {/* 2. Commercial KPI Cards Grid (8 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: CA Période */}
        <Card padding="md" className="relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#706C70] mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px]">CA Période</span>
            <div className="p-1.5 rounded-lg bg-[#FCEAEC] text-[#9A050E]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-[#2B282C] tabular-nums">
            {isLoading ? (
              <div className="h-7 w-28 bg-[#F7F6F6] rounded animate-pulse" />
            ) : (
              formatMoney(periodRevenue, currency)
            )}
          </div>
          <div className="text-[11px] text-[#706C70] mt-1.5 flex items-center justify-between">
            <span>{periodSalesCount} vente{periodSalesCount > 1 ? 's' : ''} validée{periodSalesCount > 1 ? 's' : ''}</span>
            <span className="font-medium text-[#16804A]">Comptant</span>
          </div>
        </Card>

        {/* Card 2: CA du Jour */}
        <Card padding="md" className="relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#706C70] mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px]">CA du Jour</span>
            <div className="p-1.5 rounded-lg bg-[#EAF6EF] text-[#16804A]">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-[#16804A] tabular-nums">
            {isLoading ? (
              <div className="h-7 w-28 bg-[#F7F6F6] rounded animate-pulse" />
            ) : (
              formatMoney(todayRevenue, currency)
            )}
          </div>
          <div className="text-[11px] text-[#706C70] mt-1.5 flex items-center justify-between">
            <span>{todaySalesCount} vente{todaySalesCount > 1 ? 's' : ''} aujourd'hui</span>
            <span className="text-[#16804A] font-semibold">En direct</span>
          </div>
        </Card>

        {/* Card 3: Panier Moyen & Volume */}
        <Card padding="md" className="relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#706C70] mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Panier Moyen</span>
            <div className="p-1.5 rounded-lg bg-[#F7F6F6] text-[#2B282C]">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-[#2B282C] tabular-nums">
            {isLoading ? (
              <div className="h-7 w-28 bg-[#F7F6F6] rounded animate-pulse" />
            ) : (
              formatMoney(averageCart, currency)
            )}
          </div>
          <div className="text-[11px] text-[#706C70] mt-1.5 flex items-center justify-between">
            <span>Par ticket de caisse</span>
            <span className="tabular-nums font-mono text-[#706C70]">{periodSalesCount} tickets</span>
          </div>
        </Card>

        {/* Card 4: Bénéfice Net Estimé */}
        <Card padding="md" className="relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#706C70] mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Bénéfice Net Estimé</span>
            <div className="p-1.5 rounded-lg bg-[#FFF4DF] text-[#D99016]">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-[#2B282C] tabular-nums">
            {isLoading ? (
              <div className="h-7 w-28 bg-[#F7F6F6] rounded animate-pulse" />
            ) : (
              formatMoney(report?.estimatedProfit, currency)
            )}
          </div>
          <div className="text-[11px] text-[#706C70] mt-1.5 flex items-center justify-between">
            <span>Marge brute - Dépenses</span>
            <span className="font-medium text-[#D99016]">Calcul réel</span>
          </div>
        </Card>

        {/* Card 5: Dépenses de la période */}
        <Card padding="md" className="relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#706C70] mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Dépenses Période</span>
            <div className="p-1.5 rounded-lg bg-[#FCEAEC] text-[#C62828]">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-[#C62828] tabular-nums">
            {isLoading ? (
              <div className="h-7 w-28 bg-[#F7F6F6] rounded animate-pulse" />
            ) : (
              formatMoney(report?.expensesTotal, currency)
            )}
          </div>
          <div className="text-[11px] text-[#706C70] mt-1.5 flex items-center justify-between">
            <span>Charges d'exploitation</span>
            <button
              type="button"
              onClick={() => setCurrentPage('expenses')}
              className="text-[#9A050E] hover:underline font-semibold"
            >
              Détails
            </button>
          </div>
        </Card>

        {/* Card 6: Valeur du Stock */}
        <Card padding="md" className="relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#706C70] mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Valeur du Stock</span>
            <div className="p-1.5 rounded-lg bg-[#F7F6F6] text-[#2B282C]">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-[#2B282C] tabular-nums">
            {isLoading ? (
              <div className="h-7 w-28 bg-[#F7F6F6] rounded animate-pulse" />
            ) : (
              formatMoney(report?.stockValue, currency)
            )}
          </div>
          <div className="text-[11px] text-[#706C70] mt-1.5 flex items-center justify-between">
            <span>Valorisé au coût d'achat</span>
            <button
              type="button"
              onClick={() => setCurrentPage('inventory')}
              className="text-[#9A050E] hover:underline font-semibold"
            >
              Inventaire
            </button>
          </div>
        </Card>

        {/* Card 7: Référentiel Catalogue */}
        <Card padding="md" className="relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#706C70] mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Catalogue Produits</span>
            <div className="p-1.5 rounded-lg bg-[#F7F6F6] text-[#2B282C]">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-[#2B282C] tabular-nums">
            {isLoading ? (
              <div className="h-7 w-28 bg-[#F7F6F6] rounded animate-pulse" />
            ) : (
              `${totalProductsCount} familles`
            )}
          </div>
          <div className="text-[11px] text-[#706C70] mt-1.5 flex items-center justify-between">
            <span>Matériaux & articles</span>
            <button
              type="button"
              onClick={() => setCurrentPage('products')}
              className="text-[#9A050E] hover:underline font-semibold"
            >
              Catalogue
            </button>
          </div>
        </Card>

        {/* Card 8: Créances Clients & Dettes */}
        <Card padding="md" className="relative overflow-hidden bg-[#FAF9F9]">
          <div className="flex items-center justify-between text-xs text-[#706C70] mb-2">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Créances Clients</span>
            <div className="p-1.5 rounded-lg bg-[#E5E2E3] text-[#706C70]">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-[#706C70] tabular-nums">
            {formatMoney(0, currency)}
          </div>
          <div className="text-[11px] text-[#706C70] mt-1.5 flex items-center justify-between" title="Le schéma Cloud n'implémente pas encore d'échéancier de crédit client">
            <span>Ventes comptant</span>
            <span className="text-[10px] bg-[#E5E2E3] px-1.5 py-0.5 rounded text-[#706C70]">Comptoir</span>
          </div>
        </Card>
      </div>

      {/* 3. Middle Section: Revenue Chart & Top Selling Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Interactive Revenue Chart (2 cols) */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E2E3] mb-4">
            <div>
              <h2 className="text-sm font-bold text-[#2B282C] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#9A050E]" />
                Évolution des Ventes & Chiffre d'Affaires
              </h2>
              <p className="text-[11px] text-[#706C70]">
                Analyse chronologique sur {period === 'today' ? "la journée en cours" : period === '7d' ? 'les 7 derniers jours' : period === '30d' ? 'les 30 derniers jours' : 'le mois en cours'}
              </p>
            </div>
          </div>

          <RevenueChart
            data={chartPoints}
            currency={currency}
            isLoading={isLoading}
          />
        </Card>

        {/* Top 5 Products Sold (1 col) */}
        <Card>
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E2E3]">
            <div>
              <h2 className="text-sm font-bold text-[#2B282C] flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-[#9A050E]" />
                Meilleures Ventes
              </h2>
              <p className="text-[11px] text-[#706C70]">Articles les plus demandés</p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentPage('products')}
              className="text-xs text-[#9A050E] font-semibold hover:underline flex items-center gap-1"
            >
              Catalogue
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#E5E2E3] mt-2">
            {!report?.topProducts || report.topProducts.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#706C70]">
                <Package className="w-6 h-6 mx-auto mb-1.5 text-[#A8A4A8]" />
                Aucune vente enregistrée sur cette période
              </div>
            ) : (
              report.topProducts.map((p, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div className="max-w-[70%]">
                    <div className="text-xs font-semibold text-[#2B282C] truncate">
                      {p.variantName || p.productName}
                    </div>
                    <div className="text-[10px] text-[#706C70] font-mono">SKU : {p.sku}</div>
                  </div>
                  <div className="text-xs font-bold text-[#16804A] bg-[#EAF6EF] px-2.5 py-1 rounded-full tabular-nums shrink-0">
                    {p.quantitySold} vendus
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* 4. Lower Section: Stock Health / Alerts & Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Stock Alerts & Inventory Health */}
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E5E2E3]">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#D99016]" />
              <div>
                <h2 className="text-sm font-bold text-[#2B282C]">État des Stocks & Réapprovisionnement</h2>
                <div className="flex items-center gap-2 text-[11px] text-[#706C70] mt-0.5">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#C62828]" />
                    {stockSummary.outOfStockCount} rupture{stockSummary.outOfStockCount > 1 ? 's' : ''}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#D99016]" />
                    {stockSummary.lowStockCount} stock{stockSummary.lowStockCount > 1 ? 's' : ''} bas
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCurrentPage('inventory')}
              className="text-xs text-[#9A050E] font-semibold hover:underline flex items-center gap-1 shrink-0"
            >
              Gérer les stocks
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-[#E5E2E3] mt-2">
            {!report?.lowStockAlerts || report.lowStockAlerts.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#16804A] bg-[#EAF6EF]/40 rounded-xl my-2 flex flex-col items-center justify-center">
                <CheckCircle2 className="w-6 h-6 mb-1 text-[#16804A]" />
                <span className="font-semibold">Tous les niveaux de stock sont optimaux</span>
                <span className="text-[11px] text-[#706C70] mt-0.5">Aucun article ne nécessite de réassort urgent</span>
              </div>
            ) : (
              report.lowStockAlerts.slice(0, 6).map((item, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div className="max-w-[65%]">
                    <div className="text-xs font-semibold text-[#2B282C] truncate">
                      {item.variantName}
                    </div>
                    <div className="text-[10px] text-[#706C70] font-mono">SKU : {item.sku}</div>
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

        {/* Recent Business Activity Feed */}
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E5E2E3]">
            <div>
              <h2 className="text-sm font-bold text-[#2B282C] flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#9A050E]" />
                Activités Récentes de l'Entreprise
              </h2>
              <p className="text-[11px] text-[#706C70]">Dernières opérations commerciales enregistrées</p>
            </div>
            {/* Filter Pills */}
            <div className="flex items-center gap-1 text-[11px]">
              {(
                [
                  { key: 'all', label: 'Toutes' },
                  { key: 'sales', label: 'Ventes' },
                  { key: 'expenses', label: 'Dépenses' },
                  { key: 'purchases', label: 'Achats' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActivityTab(tab.key)}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-colors ${
                    activityTab === tab.key
                      ? 'bg-[#9A050E] text-white'
                      : 'text-[#706C70] hover:bg-[#F7F6F6]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-[#E5E2E3] mt-2">
            {filteredActivities.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#706C70]">
                Aucune activité récente pour cette catégorie
              </div>
            ) : (
              filteredActivities.map((act) => (
                <div
                  key={act.id}
                  onClick={() => setCurrentPage(act.targetPage)}
                  className="py-2.5 flex items-center justify-between hover:bg-[#FDFDFD] cursor-pointer rounded-lg px-1 transition-colors"
                >
                  <div className="flex items-center gap-2.5 max-w-[65%]">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        act.type === 'sale'
                          ? 'bg-[#EAF6EF] text-[#16804A]'
                          : act.type === 'expense'
                          ? 'bg-[#FCEAEC] text-[#C62828]'
                          : act.type === 'purchase'
                          ? 'bg-[#F0F4FA] text-[#2563EB]'
                          : 'bg-[#FFF4DF] text-[#D99016]'
                      }`}
                    >
                      {act.type === 'sale' ? (
                        <ShoppingCart className="w-3.5 h-3.5" />
                      ) : act.type === 'expense' ? (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      ) : act.type === 'purchase' ? (
                        <Package className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-semibold text-[#2B282C] truncate">{act.title}</div>
                      <div className="text-[10px] text-[#706C70] truncate">{act.subtitle}</div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`text-xs font-bold tabular-nums ${
                        act.type === 'sale' ? 'text-[#16804A]' : 'text-[#2B282C]'
                      }`}
                    >
                      {act.type === 'expense' ? '-' : act.type === 'sale' ? '+' : ''}
                      {formatMoney(act.amount, currency)}
                    </div>
                    <div className="text-[10px] text-[#706C70]">
                      {new Date(act.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* 5. Certified Cloud Exports Bar */}
      <Card padding="sm" className="bg-[#F7F6F6] border-dashed">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-1 sm:px-2">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#16804A] shrink-0" />
            <span className="text-xs font-semibold text-[#2B282C]">
              Exports officiels certifiés Boutica Cloud :
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<FileSpreadsheet className="w-3.5 h-3.5" />}
              onClick={() => handleDownloadExport('sales/excel')}
            >
              Ventes (Excel)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<FileSpreadsheet className="w-3.5 h-3.5" />}
              onClick={() => handleDownloadExport('inventory/excel')}
            >
              Stock (Excel)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<FileText className="w-3.5 h-3.5" />}
              onClick={() => handleDownloadExport('sales/pdf')}
            >
              Rapport Ventes (PDF)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<FileText className="w-3.5 h-3.5" />}
              onClick={() => handleDownloadExport('inventory/pdf')}
            >
              État Stocks (PDF)
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
