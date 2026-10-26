/**
 * Hook global de gestion des raccourcis clavier pour Boutica Desktop
 * Centralise les 15 raccourcis et évite les conflits avec les champs de saisie ou les raccourcis système.
 */

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useUIStore } from '../store/uiStore.ts';
import {
  ALL_SHORTCUTS,
  matchesShortcut,
  isInputElement,
  type ShortcutDefinition,
} from '../lib/shortcuts.ts';

export function useKeyboardShortcuts() {
  const {
    setCurrentPage,
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    isShortcutsModalOpen,
    setShortcutsModalOpen,
    toggleShortcutsModal,
    toggleSidebar,
    activeReceipt,
    closeReceipt,
  } = useUIStore();

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. Ne jamais intercepter les combinaisons système ou d'édition texte standard
      if (!e.key) return;

      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x', 'z', 'y', 'a'].includes(e.key.toLowerCase())) {
        return;
      }

      const inInput = isInputElement(e.target);

      // 2. Recherche du raccourci correspondant
      let matched: ShortcutDefinition | null = null;
      for (const def of ALL_SHORTCUTS) {
        if (matchesShortcut(e, def)) {
          // Si on est dans un champ texte et que le raccourci n'est pas autorisé en saisie, on ignore
          if (inInput && !def.allowInInputs) {
            continue;
          }
          matched = def;
          break;
        }
      }

      if (!matched) return;

      // 3. Exécution de l'action associée
      e.preventDefault();
      e.stopPropagation();

      switch (matched.id) {
        case 'help-shortcuts':
          toggleShortcutsModal();
          break;

        case 'command-palette':
          setCommandPaletteOpen(!isCommandPaletteOpen);
          break;

        case 'close-modal':
          if (isShortcutsModalOpen) {
            setShortcutsModalOpen(false);
          } else if (isCommandPaletteOpen) {
            setCommandPaletteOpen(false);
          } else if (activeReceipt) {
            closeReceipt();
          } else if (inInput && e.target instanceof HTMLElement) {
            e.target.blur();
          }
          break;

        case 'focus-search': {
          // Chercher le champ de recherche de la page active
          const searchInput = document.querySelector<HTMLInputElement>(
            'input[data-search="true"], input[type="search"], input[placeholder*="Recherch"], input[placeholder*="Filtrer"]'
          );
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          } else {
            // Si la page n'a pas de champ de recherche dédié, ouvrir la palette
            setCommandPaletteOpen(true);
          }
          break;
        }

        case 'refresh-data':
          window.dispatchEvent(new CustomEvent('boutica:refresh'));
          toast.info('Actualisation des données en cours...', {
            id: 'boutica-refresh-toast',
            duration: 1500,
          });
          break;

        case 'new-sale-pos':
          setCurrentPage('pos');
          // Focus automatique sur le champ de recherche produit après le rendu
          setTimeout(() => {
            const posSearch = document.querySelector<HTMLInputElement>('input[data-pos-search="true"], input[placeholder*="Rechercher par nom"]');
            posSearch?.focus();
          }, 60);
          break;

        case 'contextual-create':
          window.dispatchEvent(new CustomEvent('boutica:create-new'));
          break;

        case 'toggle-sidebar':
          toggleSidebar();
          break;

        default:
          if (matched.targetPage) {
            setCurrentPage(matched.targetPage);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [
    setCurrentPage,
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    isShortcutsModalOpen,
    setShortcutsModalOpen,
    toggleShortcutsModal,
    toggleSidebar,
    activeReceipt,
    closeReceipt,
  ]);
}
