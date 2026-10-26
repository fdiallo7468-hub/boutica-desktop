import React, { useEffect, useState } from 'react';
import {
  Wallet,
  Plus,
  RefreshCw,
  Tag,
  DollarSign,
} from 'lucide-react';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { LoadError, errorText } from '../components/ui/LoadError.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { formatMoney } from '../lib/money.ts';
import { apiClient } from '../lib/api-client.ts';
import type { Expense } from '../types/api.ts';
import { toast } from 'sonner';

export const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [category, setCategory] = useState('Transport & Manutention');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);

  const loadExpenses = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await apiClient.listExpenses({ pageSize: 100 });
      setExpenses(res.data || []);
    } catch (err) {
      setExpenses([]);
      setLoadError(errorText(err, 'Impossible de charger les dépenses'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  // Écoute des raccourcis globaux (Actualiser Ctrl+R et Créer Ctrl+N)
  useEffect(() => {
    const handleRefresh = () => {
      loadExpenses();
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

  const totalExpenses = expenses.reduce(
    (sum, exp) => sum + parseFloat(exp.amount || '0'),
    0
  );

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Le montant doit être supérieur à zéro');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.createExpense({
        category: category.trim(),
        description: description.trim() || undefined,
        amount: parsedAmount,
      });
      toast.success('Dépense enregistrée');
      setIsCreateOpen(false);
      setDescription('');
      setAmount('');
      loadExpenses();
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de l’enregistrement de la dépense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {loadError && <LoadError message={loadError} onRetry={loadExpenses} />}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E5E2E3]">
        <div>
          <h1 className="text-xl font-bold text-[#2B282C]">Dépenses d'Exploitation</h1>
          <p className="text-xs text-[#706C70] mt-0.5">
            Suivi des charges opérationnelles déduites du bénéfice commercial
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="tertiary"
            size="sm"
            onClick={loadExpenses}
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
            title="Enregistrer une dépense (Ctrl+N)"
          >
            <span>Nouvelle Dépense</span>
            <kbd className="hidden md:inline font-mono text-[9px] px-1 py-0.2 rounded bg-white/20 text-white font-bold">Ctrl+N</kbd>
          </Button>
        </div>
      </div>

      {/* Total Card */}
      <Card padding="md" className="flex items-center justify-between bg-[#FDFDFD]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#FCEAEC] text-[#C62828]">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-[#706C70]">Total des charges enregistrées</div>
            <div className="text-2xl font-bold text-[#2B282C] tabular-nums mt-0.5">
              {formatMoney(totalExpenses)}
            </div>
          </div>
        </div>
        <div className="text-xs text-[#706C70] hidden sm:block">
          {expenses.length} dépense(s) comptabilisée(s)
        </div>
      </Card>

      {/* Expenses Table */}
      <Card padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F6F6] text-[#706C70] uppercase font-semibold border-b border-[#E5E2E3]">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Catégorie</th>
                <th className="py-3 px-4">Description / Motif</th>
                <th className="py-3 px-4 font-bold text-[#C62828] text-right">Montant Décaissé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2E3]">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-[#706C70]">
                    Aucune dépense enregistrée
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-[#FDFDFD] transition-colors">
                    <td className="py-3 px-4 text-[#706C70]">
                      {new Date(exp.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F7F6F6] text-[#2B282C] border border-[#E5E2E3]">
                        <Tag className="w-3 h-3 text-[#9A050E]" />
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#2B282C] font-medium">
                      {exp.description || '—'}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums font-bold text-sm text-[#C62828]">
                      {formatMoney(exp.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Create Expense */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Enregistrer une dépense"
        description="Saisissez les frais d'exploitation de votre boutique."
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
              onClick={handleCreateExpense}
            >
              Comptabiliser
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateExpense} className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-[#2B282C] block mb-1">
              Catégorie de la dépense
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-10 text-xs bg-white border border-[#E5E2E3] rounded-[10px] px-3 text-[#2B282C] focus:outline-none focus:border-[#9A050E]"
            >
              <option value="Transport & Manutention">Transport & Manutention</option>
              <option value="Carburant">Carburant</option>
              <option value="Salaires & Journaliers">Salaires & Journaliers</option>
              <option value="Loyer Dépôt / Magasin">Loyer Dépôt / Magasin</option>
              <option value="Électricité & Eau">Électricité & Eau</option>
              <option value="Fournitures & Entretien">Fournitures & Entretien</option>
              <option value="Autre charge d'exploitation">Autre charge d'exploitation</option>
            </select>
          </div>

          <Input
            label="Montant décaissé (XOF)"
            type="number"
            min="1"
            placeholder="ex: 15000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            leftIcon={<DollarSign className="w-4 h-4" />}
          />

          <Input
            label="Description / Motif (Optionnel)"
            placeholder="ex: Réparation pneu chariot élévateur..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </form>
      </Modal>
    </div>
  );
};
