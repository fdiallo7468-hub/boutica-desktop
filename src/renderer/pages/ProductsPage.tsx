import React, { useEffect, useState } from 'react';
import {
  Package,
  Plus,
  Search,
  ChevronRight,
  Layers,
  Edit2,
  RefreshCw,
} from 'lucide-react';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { LoadError, errorText } from '../components/ui/LoadError.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { StatusBadge } from '../components/ui/StatusBadge.tsx';
import { StockBadge } from '../components/ui/StockBadge.tsx';
import { formatMoney } from '../lib/money.ts';
import { apiClient } from '../lib/api-client.ts';
import type { Product, Variant } from '../types/api.ts';
import { toast } from 'sonner';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('');
  const [newProductBrand, setNewProductBrand] = useState('');
  const [newProductDesc, setNewProductDesc] = useState('');

  // Selected product for variant management
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productVariants, setProductVariants] = useState<Variant[]>([]);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);

  // Add Variant Modal
  const [isAddVariantOpen, setIsAddVariantOpen] = useState(false);
  const [variantSku, setVariantSku] = useState('');
  const [variantName, setVariantName] = useState('');
  const [variantPurchasePrice, setVariantPurchasePrice] = useState('');
  const [variantSellingPrice, setVariantSellingPrice] = useState('');

  // Update Variant Modal
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [editSku, setEditSku] = useState('');
  const [editName, setEditName] = useState('');
  const [editPurchasePrice, setEditPurchasePrice] = useState('');
  const [editSellingPrice, setEditSellingPrice] = useState('');

  const [loadError, setLoadError] = useState<string | null>(null);

  const loadProducts = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await apiClient.listProducts({ pageSize: 100 });
      setProducts(res.data || []);
    } catch (err) {
      setProducts([]);
      setLoadError(errorText(err, 'Impossible de charger les produits'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = searchTerm.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : products;

  const loadVariantsForProduct = async (product: Product) => {
    setSelectedProduct(product);
    setIsLoadingVariants(true);
    try {
      const res = await apiClient.listProductVariants(product.id);
      setProductVariants(res.data || []);
    } catch (err) {
      setProductVariants([]);
      toast.error(errorText(err, 'Impossible de charger les variantes'));
    } finally {
      setIsLoadingVariants(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) {
      toast.error('Le nom du produit est obligatoire');
      return;
    }

    try {
      await apiClient.createProduct({
        name: newProductName.trim(),
        category: newProductCategory.trim() || undefined,
        brand: newProductBrand.trim() || undefined,
        description: newProductDesc.trim() || undefined,
      });
      toast.success('Produit créé avec succès');
      setIsCreateProductOpen(false);
      setNewProductName('');
      setNewProductCategory('');
      setNewProductBrand('');
      setNewProductDesc('');
      loadProducts();
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la création du produit');
    }
  };

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!variantSku || !variantName || !variantPurchasePrice || !variantSellingPrice) {
      toast.error('Veuillez renseigner tous les champs obligatoires');
      return;
    }

    const pPrice = parseFloat(variantPurchasePrice);
    const sPrice = parseFloat(variantSellingPrice);
    if (sPrice < pPrice) {
      toast.error('Le prix de vente doit être supérieur ou égal au prix d’achat');
      return;
    }

    try {
      await apiClient.addVariant(selectedProduct.id, {
        sku: variantSku.trim(),
        name: variantName.trim(),
        purchasePrice: pPrice,
        sellingPrice: sPrice,
      });
      toast.success('Variante ajoutée au produit');
      setIsAddVariantOpen(false);
      setVariantSku('');
      setVariantName('');
      setVariantPurchasePrice('');
      setVariantSellingPrice('');
      loadVariantsForProduct(selectedProduct);
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de l’ajout de la variante');
    }
  };

  const handleUpdateVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !editingVariant) return;

    try {
      await apiClient.updateVariant(selectedProduct.id, editingVariant.id, {
        sku: editSku.trim() || undefined,
        name: editName.trim() || undefined,
        purchasePrice: editPurchasePrice ? parseFloat(editPurchasePrice) : undefined,
        sellingPrice: editSellingPrice ? parseFloat(editSellingPrice) : undefined,
      });
      toast.success('Variante mise à jour');
      setEditingVariant(null);
      loadVariantsForProduct(selectedProduct);
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la mise à jour');
    }
  };

  return (
    <div className="space-y-6">
      {loadError && <LoadError message={loadError} onRetry={loadProducts} />}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E2E3]">
        <div>
          <h1 className="text-xl font-bold text-[#2B282C]">Catalogue Produits & Variantes</h1>
          <p className="text-xs text-[#706C70] mt-0.5">
            Référentiel des articles de construction, prix d'achat et prix de vente
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="tertiary"
            size="sm"
            onClick={loadProducts}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Actualiser
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateProductOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Nouveau Produit
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-3">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Filtrer par nom de produit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
      </div>

      {/* Products Table */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F6F6] text-[#706C70] uppercase font-semibold border-b border-[#E5E2E3]">
              <tr>
                <th className="py-3 px-4">Désignation Produit</th>
                <th className="py-3 px-4">Catégorie</th>
                <th className="py-3 px-4">Marque</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2E3]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#706C70]">
                    {searchTerm ? 'Aucun produit ne correspond à votre recherche' : 'Aucun produit dans le catalogue'}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-[#FDFDFD] transition-colors cursor-pointer"
                    onClick={() => loadVariantsForProduct(p)}
                  >
                    <td className="py-3 px-4 font-semibold text-[#2B282C] flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-[#FCEAEC] text-[#9A050E]">
                        <Package className="w-4 h-4" />
                      </div>
                      <span>{p.name}</span>
                    </td>
                    <td className="py-3 px-4 text-[#706C70]">{p.category || '—'}</td>
                    <td className="py-3 px-4 text-[#706C70]">{p.brand || '—'}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          loadVariantsForProduct(p);
                        }}
                        rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                      >
                        Variantes & Prix
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: View & Manage Product Variants */}
      {selectedProduct && (
        <Modal
          isOpen={Boolean(selectedProduct)}
          onClose={() => setSelectedProduct(null)}
          title={`Variantes de ${selectedProduct.name}`}
          description="Gérez les déclinaisons de conditionnement, prix d'achat fournisseur et prix de vente comptoir."
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button variant="ghost" size="sm" onClick={() => setSelectedProduct(null)}>
                Fermer
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => {
                  setVariantSku(`${selectedProduct.name.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`);
                  setIsAddVariantOpen(true);
                }}
              >
                Ajouter une variante
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {isLoadingVariants ? (
              <div className="py-8 text-center text-xs text-[#706C70]">Chargement des variantes...</div>
            ) : productVariants.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#706C70] border border-dashed rounded-xl">
                Ce produit ne comporte aucune variante. Ajoutez-en une pour pouvoir le vendre.
              </div>
            ) : (
              <div className="overflow-x-auto border border-[#E5E2E3] rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F6F6] text-[#706C70] uppercase font-semibold border-b border-[#E5E2E3]">
                    <tr>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Nom Variante</th>
                      <th className="py-2.5 px-3">Prix Achat</th>
                      <th className="py-2.5 px-3">Prix Vente</th>
                      <th className="py-2.5 px-3">Stock</th>
                      <th className="py-2.5 px-3 text-right">Modifier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E2E3]">
                    {productVariants.map((v) => (
                      <tr key={v.id} className="hover:bg-[#FDFDFD]">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#2B282C]">{v.sku}</td>
                        <td className="py-2.5 px-3 font-medium text-[#2B282C]">{v.name}</td>
                        <td className="py-2.5 px-3 tabular-nums text-[#706C70]">{formatMoney(v.purchasePrice)}</td>
                        <td className="py-2.5 px-3 tabular-nums font-bold text-[#9A050E]">{formatMoney(v.sellingPrice)}</td>
                        <td className="py-2.5 px-3">
                          <StockBadge quantity={v.quantity ?? 0} />
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingVariant(v);
                              setEditSku(v.sku);
                              setEditName(v.name);
                              setEditPurchasePrice(v.purchasePrice);
                              setEditSellingPrice(v.sellingPrice);
                            }}
                            className="p-1 rounded text-[#706C70] hover:text-[#9A050E] hover:bg-[#FCEAEC]"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal: Create Product */}
      <Modal
        isOpen={isCreateProductOpen}
        onClose={() => setIsCreateProductOpen(false)}
        title="Nouveau Produit"
        description="Enregistrez une nouvelle famille de matériaux dans votre catalogue."
        maxWidth="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="ghost" size="sm" onClick={() => setIsCreateProductOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateProduct}>
              Créer le produit
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateProduct} className="space-y-3">
          <Input
            label="Désignation du produit"
            placeholder="ex: Ciment CPJ 42.5"
            value={newProductName}
            onChange={(e) => setNewProductName(e.target.value)}
            required
          />
          <Input
            label="Catégorie"
            placeholder="ex: Gros Œuvre, Quincaillerie, Plomberie..."
            value={newProductCategory}
            onChange={(e) => setNewProductCategory(e.target.value)}
          />
          <Input
            label="Marque / Fabricant"
            placeholder="ex: CIMAF, Dangote, Drocolor..."
            value={newProductBrand}
            onChange={(e) => setNewProductBrand(e.target.value)}
          />
          <Input
            label="Description libre (optionnel)"
            placeholder="Spécifications techniques..."
            value={newProductDesc}
            onChange={(e) => setNewProductDesc(e.target.value)}
          />
        </form>
      </Modal>

      {/* Modal: Add Variant */}
      <Modal
        isOpen={isAddVariantOpen}
        onClose={() => setIsAddVariantOpen(false)}
        title="Ajouter une variante"
        description={`Nouvelle déclinaison pour : ${selectedProduct?.name}`}
        maxWidth="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="ghost" size="sm" onClick={() => setIsAddVariantOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" size="sm" onClick={handleAddVariant}>
              Enregistrer la variante
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddVariant} className="space-y-3">
          <Input
            label="Code SKU (Unique)"
            placeholder="ex: CIM-425-50KG"
            value={variantSku}
            onChange={(e) => setVariantSku(e.target.value)}
            required
          />
          <Input
            label="Nom de la variante"
            placeholder="ex: Sac 50kg ou Barre 12m"
            value={variantName}
            onChange={(e) => setVariantName(e.target.value)}
            required
          />
          <Input
            label="Prix d'achat unitaire (XOF)"
            type="number"
            min="0"
            placeholder="ex: 4200"
            value={variantPurchasePrice}
            onChange={(e) => setVariantPurchasePrice(e.target.value)}
            required
          />
          <Input
            label="Prix de vente unitaire (XOF)"
            type="number"
            min="0"
            placeholder="ex: 4800"
            value={variantSellingPrice}
            onChange={(e) => setVariantSellingPrice(e.target.value)}
            required
          />
        </form>
      </Modal>

      {/* Modal: Edit Variant */}
      {editingVariant && (
        <Modal
          isOpen={Boolean(editingVariant)}
          onClose={() => setEditingVariant(null)}
          title="Modifier la variante"
          description={`Mise à jour du SKU ou des prix pour : ${editingVariant.name}`}
          maxWidth="sm"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="ghost" size="sm" onClick={() => setEditingVariant(null)}>
                Annuler
              </Button>
              <Button variant="primary" size="sm" onClick={handleUpdateVariant}>
                Sauvegarder
              </Button>
            </div>
          }
        >
          <form onSubmit={handleUpdateVariant} className="space-y-3">
            <Input
              label="Code SKU"
              value={editSku}
              onChange={(e) => setEditSku(e.target.value)}
              required
            />
            <Input
              label="Nom de la variante"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
            <Input
              label="Prix d'achat unitaire (XOF)"
              type="number"
              min="0"
              value={editPurchasePrice}
              onChange={(e) => setEditPurchasePrice(e.target.value)}
              required
            />
            <Input
              label="Prix de vente unitaire (XOF)"
              type="number"
              min="0"
              value={editSellingPrice}
              onChange={(e) => setEditSellingPrice(e.target.value)}
              required
            />
          </form>
        </Modal>
      )}
    </div>
  );
};
