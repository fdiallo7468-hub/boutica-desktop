import React, { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  RefreshCw,
  Phone,
  Search,
  Receipt,
  User,
} from 'lucide-react';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { LoadError, errorText } from '../components/ui/LoadError.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { formatMoney } from '../lib/money.ts';
import { apiClient } from '../lib/api-client.ts';
import type { Customer, Sale } from '../types/api.ts';
import { toast } from 'sonner';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected Customer for viewing sales history
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSales, setCustomerSales] = useState<Sale[]>([]);
  const [isLoadingSales, setIsLoadingSales] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);

  const loadCustomers = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await apiClient.listCustomers({ pageSize: 100 });
      setCustomers(res.data || []);
    } catch (err) {
      setCustomers([]);
      setLoadError(errorText(err, 'Impossible de charger les clients'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleSelectCustomer = async (cust: Customer) => {
    setSelectedCustomer(cust);
    setIsLoadingSales(true);
    try {
      const res = await apiClient.listSales({ customerId: cust.id });
      setCustomerSales(res.data || []);
    } catch (err) {
      setCustomerSales([]);
      toast.error(errorText(err, 'Impossible de charger l’historique du client'));
    } finally {
      setIsLoadingSales(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Le nom du client est requis');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.createCustomer({
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      toast.success('Client ajouté avec succès');
      setIsCreateOpen(false);
      setName('');
      setPhone('');
      loadCustomers();
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de l’enregistrement du client');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      {loadError && <LoadError message={loadError} onRetry={loadCustomers} />}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E2E3]">
        <div>
          <h1 className="text-xl font-bold text-[#2B282C]">Fichier Clients</h1>
          <p className="text-xs text-[#706C70] mt-0.5">
            Répertoire des clients réguliers et historique des achats
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="tertiary"
            size="sm"
            onClick={loadCustomers}
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
            Nouveau Client
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <div className="w-full sm:w-80">
        <Input
          placeholder="Rechercher par nom ou numéro..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Customers List Table */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F6F6] text-[#706C70] uppercase font-semibold border-b border-[#E5E2E3]">
              <tr>
                <th className="py-3 px-4">Nom du Client</th>
                <th className="py-3 px-4">Téléphone</th>
                <th className="py-3 px-4">Date d'inscription</th>
                <th className="py-3 px-4 text-right">Historique</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2E3]">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-[#706C70]">
                    Aucun client enregistré
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    className="hover:bg-[#FDFDFD] transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 font-semibold text-[#2B282C] flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#FCEAEC] text-[#9A050E] flex items-center justify-center font-bold text-xs">
                        {c.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{c.name}</span>
                    </td>
                    <td className="py-3 px-4 text-[#706C70]">
                      {c.phone ? (
                        <span className="flex items-center gap-1.5 font-mono">
                          <Phone className="w-3 h-3 text-[#16804A]" />
                          {c.phone}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#706C70]">
                      {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectCustomer(c);
                        }}
                        leftIcon={<Receipt className="w-3.5 h-3.5" />}
                      >
                        Achats du client
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Create Customer */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Ajouter un nouveau client"
        description="Enregistrez les coordonnées pour la facturation et les tickets de caisse."
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
              onClick={handleCreateCustomer}
            >
              Enregistrer le client
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateCustomer} className="space-y-3">
          <Input
            label="Nom complet ou Raison Sociale"
            placeholder="ex: Entreprise BTP Ivoire ou Jean Dupont"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            leftIcon={<User className="w-4 h-4" />}
          />
          <Input
            label="Numéro de téléphone"
            placeholder="ex: +225 07 00 00 00"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            leftIcon={<Phone className="w-4 h-4" />}
          />
        </form>
      </Modal>

      {/* Modal: Customer Sales History */}
      {selectedCustomer && (
        <Modal
          isOpen={Boolean(selectedCustomer)}
          onClose={() => setSelectedCustomer(null)}
          title={`Historique des achats — ${selectedCustomer.name}`}
          description={`Coordonnées : ${selectedCustomer.phone || 'Non renseigné'}`}
          maxWidth="md"
        >
          <div className="space-y-3">
            {isLoadingSales ? (
              <div className="py-8 text-center text-xs text-[#706C70]">
                Chargement des achats...
              </div>
            ) : customerSales.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#706C70] border border-dashed rounded-xl">
                Aucun achat enregistré pour ce client.
              </div>
            ) : (
              <div className="border border-[#E5E2E3] rounded-xl overflow-hidden divide-y divide-[#E5E2E3]">
                {customerSales.map((sale) => (
                  <div key={sale.id} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-[#2B282C]">Vente #{sale.id.slice(0, 8)}</div>
                      <div className="text-[10px] text-[#706C70]">
                        {new Date(sale.createdAt).toLocaleString('fr-FR')}
                      </div>
                    </div>
                    <div className="font-bold tabular-nums text-sm text-[#9A050E]">
                      {formatMoney(sale.total)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
