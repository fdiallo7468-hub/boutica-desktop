import React, { useState, useMemo } from 'react';
import {
  Keyboard,
  X,
  Search,
  ShoppingCart,
  LayoutDashboard,
  RefreshCw,
  PlusCircle,
  HelpCircle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useUIStore, AppPage } from '../../store/uiStore.ts';
import {
  BOUTICA_SHORTCUTS,
  EXTENDED_SHORTCUTS,
  formatShortcutCombo,
  isMacPlatform,
  type ShortcutDefinition,
} from '../../lib/shortcuts.ts';

export const ShortcutsHelpModal: React.FC = () => {
  const { isShortcutsModalOpen, setShortcutsModalOpen, setCurrentPage, setCommandPaletteOpen } = useUIStore();
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'general' | 'pos' | 'navigation' | 'action'>('all');

  const isMac = useMemo(() => isMacPlatform(), []);

  const allList = useMemo(() => [...BOUTICA_SHORTCUTS, ...EXTENDED_SHORTCUTS], []);

  const filteredShortcuts = useMemo(() => {
    return allList.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      // Text query filter
      if (!filterQuery.trim()) return true;
      const q = filterQuery.toLowerCase();
      const combo = formatShortcutCombo(item.keys, isMac).toLowerCase();
      return (
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.categoryLabel.toLowerCase().includes(q) ||
        combo.includes(q)
      );
    });
  }, [allList, selectedCategory, filterQuery, isMac]);

  if (!isShortcutsModalOpen) return null;

  const handleExecuteShortcut = (shortcut: ShortcutDefinition) => {
    setShortcutsModalOpen(false);
    if (shortcut.targetPage) {
      setCurrentPage(shortcut.targetPage);
    } else if (shortcut.id === 'command-palette') {
      setCommandPaletteOpen(true);
    } else if (shortcut.id === 'refresh-data') {
      window.dispatchEvent(new CustomEvent('boutica:refresh'));
    } else if (shortcut.id === 'contextual-create') {
      window.dispatchEvent(new CustomEvent('boutica:create-new'));
    } else if (shortcut.id === 'focus-search') {
      const searchInput = document.querySelector<HTMLInputElement>(
        'input[data-search="true"], input[type="search"], input[placeholder*="Recherch"], input[placeholder*="Filtrer"]'
      );
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="fixed inset-0"
        onClick={() => setShortcutsModalOpen(false)}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl bg-white rounded-[20px] border border-[#E5E2E3] shadow-[0_12px_36px_rgba(43,40,44,0.18)] overflow-hidden z-10 flex flex-col max-h-[90vh] sm:max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4.5 border-b border-[#E5E2E3] bg-[#FCFBFB]">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[12px] bg-[#FCEAEC] text-[#9A050E] flex items-center justify-center shadow-xs shrink-0">
              <Keyboard className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 id="shortcuts-dialog-title" className="text-sm sm:text-base font-bold text-[#2B282C]">
                Raccourcis Clavier Boutica
              </h2>
              <p className="text-[11px] sm:text-xs text-[#706C70] line-clamp-1">
                {BOUTICA_SHORTCUTS.length} raccourcis optimisés pour les caisses et le pilotage quotidien
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShortcutsModalOpen(false)}
            aria-label="Fermer le guide des raccourcis"
            className="p-1.5 rounded-lg text-[#706C70] hover:text-[#2B282C] hover:bg-[#F2EFF0] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Categories Bar */}
        <div className="p-3 sm:p-4 border-b border-[#E5E2E3] bg-[#FFFFFF] flex flex-col sm:flex-row gap-2.5 sm:gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#706C70] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Rechercher un raccourci (ex: vente, stock, Ctrl+K)..."
              className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-xs rounded-xl border border-[#E5E2E3] bg-[#FDFDFD] focus:bg-white focus:outline-none focus:border-[#9A050E] text-[#2B282C]"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto text-xs shrink-0 pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'Tous' },
              { id: 'pos', label: 'Caisse & POS' },
              { id: 'navigation', label: 'Navigation' },
              { id: 'general', label: 'Général' },
              { id: 'action', label: 'Actions' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id as any)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  selectedCategory === cat.id
                    ? 'bg-[#9A050E] text-white shadow-xs'
                    : 'text-[#706C70] hover:text-[#2B282C] hover:bg-[#F7F6F6]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredShortcuts.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#706C70]">
              Aucun raccourci ne correspond à votre recherche.
            </div>
          ) : (
            filteredShortcuts.map((shortcut) => {
              const comboLabel = formatShortcutCombo(shortcut.keys, isMac);
              const isPos = shortcut.id === 'new-sale-pos';
              const isHighlight = shortcut.id === 'help-shortcuts' || shortcut.id === 'command-palette';

              return (
                <div
                  key={shortcut.id}
                  onClick={() => handleExecuteShortcut(shortcut)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleExecuteShortcut(shortcut);
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer group ${
                    isPos
                      ? 'bg-[#FCEAEC]/50 border-[#9A050E]/20 hover:bg-[#FCEAEC] hover:border-[#9A050E]/40'
                      : 'bg-white border-[#E5E2E3] hover:bg-[#F9F8F8] hover:border-[#D5D2D3]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#2B282C] group-hover:text-[#9A050E] transition-colors">
                          {shortcut.label}
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F2EFF0] text-[#706C70]">
                          {shortcut.categoryLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#706C70]">{shortcut.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <kbd className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-[#F7F6F6] text-[#2B282C] border border-[#D5D2D3] shadow-xs group-hover:bg-white group-hover:border-[#9A050E]/40 group-hover:text-[#9A050E] transition-colors">
                      {comboLabel}
                    </kbd>
                    <ArrowRight className="w-3.5 h-3.5 text-[#9A050E] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-t border-[#E5E2E3] bg-[#FCFBFB] flex items-center justify-between flex-wrap gap-2 text-xs text-[#706C70]">
          <div className="flex items-center gap-2">
            <span>Appuyez sur</span>
            <kbd className="font-mono font-bold px-1.5 py-0.5 rounded bg-[#F2EFF0] text-[#2B282C] border border-[#E5E2E3]">
              Échap
            </kbd>
            <span>pour fermer</span>
          </div>
          <span className="text-[11px] font-medium text-[#9A050E]">
            Système : {isMac ? 'macOS (⌘)' : 'Windows / Linux (Ctrl)'}
          </span>
        </div>
      </div>
    </div>
  );
};
