import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  User,
  CreditCard,
  Banknote,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Package,
} from 'lucide-react';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Input } from '../components/ui/Input.tsx';
import { StockBadge } from '../components/ui/StockBadge.tsx';
import { formatMoney, calculateSubtotal, calculateNetTotal, generateIdempotencyKey, parseMoneyToNumber } from '../lib/money.ts';
import { apiClient, ApiError } from '../lib/api-client.ts';
import { LoadError, errorText } from '../components/ui/LoadError.tsx';
import { useUIStore } from '../store/uiStore.ts';
import type { Variant, Customer, CreateSaleInput, Sale, SaleItem } from '../types/api.ts';
import { toast } from 'sonner';

export const PosSalePage: React.FC = () => {
  const {
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    posDiscount,
    setPosDiscount,
    posCustomerId,
    setPosCustomerId,
    openReceipt,
  } = useUIStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [variants, setVariants] = useState<Variant[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Tentative de vente en cours : la clé d'idempotence est conservée tant que le résultat est incertain.
  const attemptRef = useRef<{ fingerprint: string; key: string } | null>(null);

  // Catalogue (variantes du serveur) et clients — aucune donnée locale de remplacement
  const loadData = async () => {
    setIsLoadingVariants(true);
    setLoadError(null);
    const [variantsRes, customersRes] = await Promise.allSettled([
      apiClient.listAllVariants({ search: searchTerm || undefined, pageSize: 50 }),
      apiClient.listCustomers({ pageSize: 100 }),
    ]);

    if (variantsRes.status === 'fulfilled') {
      setVariants(variantsRes.value.data || []);
    } else {
      setVariants([]);
      setLoadError(errorText(variantsRes.reason, 'Impossible de charger le catalogue'));
    }

    if (customersRes.status === 'fulfilled') {
      setCustomers(customersRes.value.data || []);
    } else {
      setCustomers([]);
      toast.warning('Liste des clients indisponible : vente comptoir uniquement');
    }
    setIsLoadingVariants(false);
  };

  useEffect(() => {
    loadData();
  }, [searchTerm]);

  // Totals calculations
  const cartSubtotal = useMemo(() => {
    return calculateSubtotal(
      cart.map((item) => ({
        quantity: item.quantity,
        unitPrice: item.variant.sellingPrice,
      }))
    );
  }, [cart]);

  const netTotal = useMemo(() => {
    return calculateNetTotal(cartSubtotal, posDiscount);
  }, [cartSubtotal, posDiscount]);

  const handleCheckout = async () => {
    if (isSubmitting) return;
    if (cart.length === 0) {
      toast.error('Le panier est vide');
      return;
    }

    const payload: CreateSaleInput = {
      customerId: posCustomerId || undefined,
      discount: posDiscount > 0 ? posDiscount : undefined,
      items: cart.map((item) => ({ variantId: item.variant.id, quantity: item.quantity })),
    };

    // Même panier => même clé (rejeu sans doublon si le résultat précédent était incertain).
    const fingerprint = JSON.stringify(payload);
    if (!attemptRef.current || attemptRef.current.fingerprint !== fingerprint) {
      attemptRef.current = { fingerprint, key: generateIdempotencyKey() };
    }
    const { key } = attemptRef.current;

    setIsSubmitting(true);
    try {
      const created = await apiClient.createSale(payload, key);
      attemptRef.current = null; // vente confirmée par le serveur

      // Le détail serveur fait foi pour le reçu (prix et montants calculés par Boutica Cloud).
      let sale: Sale & { items?: SaleItem[] } = created;
      try {
        sale = await apiClient.getSale(created.id);
      } catch {
        /* on garde la réponse de création si elle contient les montants */
      }

      const selectedCustomer = customers.find((c) => c.id === posCustomerId);
      const nameByVariant = new Map(cart.map((c) => [c.variant.id, c.variant.name]));

      if (sale.total === undefined || sale.total === null) {
        toast.success('Vente enregistrée par le serveur.');
        toast.warning('Le serveur n’a pas renvoyé le détail de la vente : reçu non généré.');
      } else {
        const lines = (sale.items ?? []).map((it) => {
          const unitPrice = parseMoneyToNumber(it.unitPrice);
          return {
            name: nameByVariant.get(it.variantId) ?? `Article ${it.variantId.slice(0, 8)}`,
            quantity: it.quantity,
            unitPrice,
            total: Math.round(unitPrice * it.quantity * 100) / 100,
          };
        });
        openReceipt({
          saleId: sale.id,
          saleDate: sale.createdAt,
          customerName: selectedCustomer ? selectedCustomer.name : 'Client Comptoir',
          items: lines,
          subtotal: parseMoneyToNumber(sale.subtotal),
          discount: parseMoneyToNumber(sale.discount),
          total: parseMoneyToNumber(sale.total),
        });
        toast.success('Vente confirmée et enregistrée');
      }

      clearCart();
      void loadData(); // les quantités en stock ont changé côté serveur
    } catch (err) {
      const uncertain = err instanceof ApiError && (err.isNetworkError || err.status >= 500);
      if (!uncertain) attemptRef.current = null; // refus définitif : une nouvelle tentative = nouvelle clé
      if (uncertain) {
        toast.error(
          'Le résultat de la vente est incertain (réponse du serveur non reçue). Le panier est conservé : cliquez de nouveau sur « Valider » pour réessayer sans risque de doublon.',
          { duration: 12000 }
        );
      } else {
        toast.error(errorText(err, 'La vente a été refusée par le serveur'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-130px)]">
      {/* Left Column: Search & Catalog Grid */}
      <div className="flex-1 flex flex-col min-w-0 space-y-4">
        {/* Header & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#2B282C]">Caisse & Vente Comptoir</h1>
            <p className="text-xs text-[#706C70]">Sélectionnez les articles ou scannez le code SKU</p>
          </div>
          <div className="w-full sm:w-72">
            <Input
              placeholder="Rechercher par nom, SKU (ex: CIM-425)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
        </div>

        {loadError && <LoadError message={loadError} onRetry={loadData} />}

        {/* Variants Catalog Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {isLoadingVariants ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-32 rounded-[14px] bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : variants.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-[#E5E2E3] rounded-[18px]">
              <Package className="w-10 h-10 text-[#706C70] mb-2" />
              <p className="text-sm font-semibold text-[#2B282C]">Aucun article trouvé</p>
              <p className="text-xs text-[#706C70]">Essayez un autre mot-clé ou ajoutez un produit au catalogue.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {variants.map((variant) => {
                const stockQty = variant.quantity ?? 0;
                const isOutOfStock = stockQty <= 0;
                return (
                  <Card
                    key={variant.id}
                    hoverEffect={!isOutOfStock}
                    onClick={() => {
                      if (!isOutOfStock) {
                        addToCart(variant, 1);
                      } else {
                        toast.error('Article en rupture de stock');
                      }
                    }}
                    className={`flex flex-col justify-between h-36 ${
                      isOutOfStock ? 'opacity-60 cursor-not-allowed bg-[#F7F6F6]' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-xs text-[#2B282C] line-clamp-2">
                          {variant.name}
                        </div>
                        <StockBadge quantity={stockQty} />
                      </div>
                      <div className="text-[10px] text-[#706C70] font-mono mt-1">
                        SKU: {variant.sku}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#E5E2E3]/60">
                      <div className="text-sm font-bold text-[#9A050E] tabular-nums">
                        {formatMoney(variant.sellingPrice)}
                      </div>
                      <Button
                        variant={isOutOfStock ? 'tertiary' : 'secondary'}
                        size="sm"
                        disabled={isOutOfStock}
                        leftIcon={<Plus className="w-3.5 h-3.5" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isOutOfStock) addToCart(variant, 1);
                        }}
                      >
                        Ajouter
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Active POS Shopping Cart & Summary */}
      <div className="w-full lg:w-96 flex flex-col bg-white rounded-[18px] border border-[#E5E2E3] shadow-[0_2px_10px_rgba(43,40,44,0.05)] overflow-hidden shrink-0">
        {/* Cart Header */}
        <div className="p-4 border-b border-[#E5E2E3] bg-[#FDFDFD] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#9A050E]" />
            <h2 className="text-sm font-bold text-[#2B282C]">Panier en cours</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#FCEAEC] text-[#9A050E] font-bold">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-xs text-[#C62828] hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Vider
            </button>
          )}
        </div>

        {/* Customer Selector */}
        <div className="p-3 border-b border-[#E5E2E3] bg-[#F7F6F6]">
          <label className="text-[11px] font-semibold text-[#706C70] flex items-center gap-1.5 mb-1">
            <User className="w-3.5 h-3.5 text-[#9A050E]" />
            Client associé
          </label>
          <select
            value={posCustomerId || ''}
            onChange={(e) => setPosCustomerId(e.target.value || null)}
            className="w-full h-8 text-xs bg-white border border-[#E5E2E3] rounded-[8px] px-2 text-[#2B282C] focus:outline-none focus:border-[#9A050E]"
          >
            <option value="">Client Comptoir (Passage)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `(${c.phone})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#706C70]">
              <ShoppingCart className="w-8 h-8 text-[#E5E2E3] mb-2" />
              <p className="text-xs font-semibold text-[#2B282C]">Panier vide</p>
              <p className="text-[11px]">Cliquez sur un article à gauche pour l'ajouter.</p>
            </div>
          ) : (
            cart.map((item) => {
              const lineTotal = item.quantity * parseFloat(item.variant.sellingPrice);
              return (
                <div
                  key={item.variant.id}
                  className="p-2.5 rounded-[12px] bg-[#FDFDFD] border border-[#E5E2E3] flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-xs font-semibold text-[#2B282C] line-clamp-1">
                      {item.variant.name}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.variant.id)}
                      className="text-[#706C70] hover:text-[#C62828] p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Quantity Selector */}
                    <div className="flex items-center gap-1.5 border border-[#E5E2E3] rounded-[8px] bg-white p-0.5">
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.variant.id, item.quantity - 1)}
                        className="p-1 rounded text-[#706C70] hover:bg-[#F7F6F6]"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center text-xs font-bold tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCartQuantity(item.variant.id, item.quantity + 1)}
                        className="p-1 rounded text-[#706C70] hover:bg-[#F7F6F6]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Unit & Line Total */}
                    <div className="text-right">
                      <div className="text-xs font-bold text-[#2B282C] tabular-nums">
                        {formatMoney(lineTotal)}
                      </div>
                      <div className="text-[10px] text-[#706C70]">
                        {formatMoney(item.variant.sellingPrice)} / u
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer: Discount, Payment mode & Totals */}
        <div className="p-4 border-t border-[#E5E2E3] bg-[#FDFDFD] space-y-3">
          {/* Discount Field */}
          <div className="flex items-center justify-between text-xs gap-3">
            <span className="text-[#706C70] font-medium">Remise commerciale :</span>
            <input
              type="number"
              min="0"
              max={cartSubtotal}
              value={posDiscount || ''}
              onChange={(e) => setPosDiscount(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="w-28 h-8 text-right px-2 rounded-[8px] border border-[#E5E2E3] text-xs font-semibold text-[#2B282C] focus:border-[#9A050E] focus:outline-none"
            />
          </div>

          <p className="text-[10px] text-[#706C70] leading-snug">
            Boutica Cloud n’enregistre pas encore le mode de paiement : seules la vente, la remise et le client sont conservés.
          </p>

          {/* Totals Breakdown */}
          <div className="space-y-1 text-xs pt-1">
            <div className="flex justify-between text-[#706C70]">
              <span>Sous-total brut :</span>
              <span className="tabular-nums font-medium">{formatMoney(cartSubtotal)}</span>
            </div>
            {posDiscount > 0 && (
              <div className="flex justify-between text-[#C62828]">
                <span>Remise déduite :</span>
                <span className="tabular-nums font-medium">-{formatMoney(posDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-[#9A050E] pt-2 border-t border-[#E5E2E3]">
              <span>TOTAL ESTIMÉ :</span>
              <span className="tabular-nums">{formatMoney(netTotal)}</span>
            </div>
            <p className="text-[10px] text-[#706C70]">Montant définitif calculé et enregistré par le serveur.</p>
          </div>

          {/* Encaisser Button */}
          <Button
            variant="primary"
            size="lg"
            disabled={cart.length === 0}
            isLoading={isSubmitting}
            onClick={handleCheckout}
            className="w-full shadow-md"
            leftIcon={<CheckCircle2 className="w-5 h-5" />}
          >
            Valider la vente
          </Button>
        </div>
      </div>
    </div>
  );
};
