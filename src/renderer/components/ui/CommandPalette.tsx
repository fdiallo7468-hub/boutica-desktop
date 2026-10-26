import React, { useState, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  LayoutDashboard,
  Package,
  Boxes,
  Receipt,
  Truck,
  RotateCcw,
  Users,
  Building2,
  Wallet,
  FileSpreadsheet,
  Settings,
  ArrowRight,
} from 'lucide-react';
import { useUIStore, AppPage } from '../../store/uiStore.ts';

interface CommandItem {
  id: string;
  title: string;
  description: string;
  page: AppPage;
  icon: React.ReactNode;
  shortcut?: string;
  category: 'Actions rapides' | 'Modules';
}

export const CommandPalette: React.FC = () => {
  const { isCommandPaletteOpen, setCommandPaletteOpen, setCurrentPage, setShortcutsModalOpen } = useUIStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: Array<
    CommandItem | {
      id: string;
      title: string;
      description: string;
      action: () => void;
      icon: React.ReactNode;
      shortcut?: string;
      category: 'Actions rapides' | 'Modules';
    }
  > = [
    {
      id: 'cmd-shortcuts-help',
      title: 'Guide des raccourcis clavier (F1)',
      description: 'Afficher la liste des 15 raccourcis clavier de Boutica',
      action: () => setShortcutsModalOpen(true),
      icon: <Settings className="w-4 h-4 text-[#9A050E]" />,
      shortcut: 'F1',
      category: 'Actions rapides',
    },
    {
      id: 'cmd-pos',
      title: 'Nouvelle vente (Caisse POS)',
      description: 'Enregistrer une vente comptoir et imprimer le ticket',
      page: 'pos',
      icon: <ShoppingCart className="w-4 h-4 text-[#9A050E]" />,
      shortcut: 'F2',
      category: 'Actions rapides',
    },
    {
      id: 'cmd-refresh',
      title: 'Actualiser les données Cloud',
      description: 'Recharger les données de l’écran sans fermer la session',
      action: () => window.dispatchEvent(new CustomEvent('boutica:refresh')),
      icon: <ArrowRight className="w-4 h-4 text-[#16804A]" />,
      shortcut: 'Ctrl+R',
      category: 'Actions rapides',
    },
    {
      id: 'cmd-dashboard',
      title: 'Tableau de bord',
      description: 'Indicateurs clés, chiffre d’affaires et marges',
      page: 'dashboard',
      icon: <LayoutDashboard className="w-4 h-4 text-[#3478C8]" />,
      shortcut: 'Ctrl+1',
      category: 'Modules',
    },
    {
      id: 'cmd-products',
      title: 'Catalogue Produits & Variantes',
      description: 'Consulter et créer des produits et variantes de prix',
      page: 'products',
      icon: <Package className="w-4 h-4 text-[#706C70]" />,
      shortcut: 'Ctrl+2',
      category: 'Modules',
    },
    {
      id: 'cmd-inventory-adj',
      title: 'Gestion des Stocks',
      description: 'Définir une nouvelle quantité absolue ou vérifier les alertes',
      page: 'inventory',
      icon: <Boxes className="w-4 h-4 text-[#D99016]" />,
      shortcut: 'Ctrl+3',
      category: 'Modules',
    },
    {
      id: 'cmd-sales',
      title: 'Historique des Ventes',
      description: 'Consulter les ventes passées et réimprimer des reçus',
      page: 'sales',
      icon: <Receipt className="w-4 h-4 text-[#706C70]" />,
      shortcut: 'Ctrl+4',
      category: 'Modules',
    },
    {
      id: 'cmd-purchase',
      title: 'Réceptionner des marchandises (Achats)',
      description: 'Enregistrer un bon de commande fournisseur',
      page: 'purchases',
      icon: <Truck className="w-4 h-4 text-[#16804A]" />,
      shortcut: 'Ctrl+5',
      category: 'Modules',
    },
    {
      id: 'cmd-customers',
      title: 'Fichier Clients',
      description: 'Liste et création de clients particuliers et entreprises',
      page: 'customers',
      icon: <Users className="w-4 h-4 text-[#706C70]" />,
      shortcut: 'Ctrl+6',
      category: 'Modules',
    },
    {
      id: 'cmd-expenses',
      title: 'Dépenses d’exploitation',
      description: 'Suivi des frais généraux et charges',
      page: 'expenses',
      icon: <Wallet className="w-4 h-4 text-[#706C70]" />,
      shortcut: 'Ctrl+7',
      category: 'Modules',
    },
    {
      id: 'cmd-suppliers',
      title: 'Fournisseurs',
      description: 'Annuaire des fournisseurs de matériaux',
      page: 'suppliers',
      icon: <Building2 className="w-4 h-4 text-[#706C70]" />,
      shortcut: 'Ctrl+8',
      category: 'Modules',
    },
    {
      id: 'cmd-returns',
      title: 'Retours de marchandises',
      description: 'Gérer les retours clients et réintégrations de stock',
      page: 'returns',
      icon: <RotateCcw className="w-4 h-4 text-[#706C70]" />,
      shortcut: 'Ctrl+9',
      category: 'Modules',
    },
    {
      id: 'cmd-reports',
      title: 'Rapports & Exports (Excel / PDF)',
      description: 'Télécharger les bilans comptables officiels',
      page: 'reports',
      icon: <FileSpreadsheet className="w-4 h-4 text-[#16804A]" />,
      shortcut: 'Ctrl+0',
      category: 'Modules',
    },
    {
      id: 'cmd-settings',
      title: 'Paramètres du logiciel',
      description: 'Configuration du serveur, imprimante et raccourcis',
      page: 'settings',
      icon: <Settings className="w-4 h-4 text-[#706C70]" />,
      shortcut: 'Ctrl+,',
      category: 'Modules',
    },
  ];

  const filteredCommands = commands.filter((cmd) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if (e.key === 'F2') {
        e.preventDefault();
        setCurrentPage('pos');
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [isCommandPaletteOpen, setCommandPaletteOpen, setCurrentPage]);

  const handleExecute = (cmd: (typeof commands)[number]) => {
    if ('action' in cmd && cmd.action) {
      cmd.action();
    } else if ('page' in cmd && cmd.page) {
      setCurrentPage(cmd.page);
    }
    setCommandPaletteOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        handleExecute(filteredCommands[selectedIndex]);
      }
    }
  };

  if (!isCommandPaletteOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/40 backdrop-blur-xs"
    >
      <div
        className="fixed inset-0"
        onClick={() => setCommandPaletteOpen(false)}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-xl bg-white rounded-[18px] border border-[#E5E2E3] shadow-[0_8px_28px_rgba(43,40,44,0.12)] overflow-hidden z-10 flex flex-col">
        {/* Search header */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#E5E2E3] gap-3">
          <Search className="w-5 h-5 text-[#9A050E] shrink-0" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher une action, un module (ex: vente, stock, rapport)..."
            className="w-full text-sm font-medium text-[#2B282C] placeholder:text-[#9E9B9D] focus:outline-none"
          />
          <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-[#F7F6F6] text-[#706C70] border border-[#E5E2E3]">
            ESC
          </span>
        </div>

        {/* Command list */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-gray-50">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#706C70]">
              Aucune commande trouvée pour « {query} »
            </div>
          ) : (
            filteredCommands.map((cmd, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => handleExecute(cmd)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-[12px] cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#FCEAEC] text-[#9A050E]' : 'hover:bg-[#F7F6F6] text-[#2B282C]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-[10px] ${
                        isSelected ? 'bg-white shadow-xs' : 'bg-[#F7F6F6]'
                      }`}
                    >
                      {cmd.icon}
                    </div>
                    <div>
                      <div className="text-sm font-semibold flex items-center gap-2">
                        <span>{cmd.title}</span>
                        {cmd.shortcut && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white text-[#9A050E] border border-[#AA3035]/20 font-bold">
                            {cmd.shortcut}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#706C70]">{cmd.description}</div>
                    </div>
                  </div>
                  <ArrowRight
                    className={`w-4 h-4 transition-transform ${
                      isSelected ? 'translate-x-1 text-[#9A050E]' : 'opacity-0'
                    }`}
                  />
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2 border-t border-[#E5E2E3] bg-[#FDFDFD] text-[11px] text-[#706C70] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 rounded bg-[#F7F6F6] border border-[#E5E2E3]">↑</kbd> <kbd className="px-1 py-0.5 rounded bg-[#F7F6F6] border border-[#E5E2E3]">↓</kbd> Naviguer
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-[#F7F6F6] border border-[#E5E2E3]">Entrée</kbd> Ouvrir
            </span>
          </div>
          <span className="text-[#9A050E] font-medium">Boutica Command Center</span>
        </div>
      </div>
    </div>
  );
};
