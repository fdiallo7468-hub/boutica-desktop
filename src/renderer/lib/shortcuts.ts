/**
 * Boutica Desktop — Système de raccourcis clavier
 * Définit les 15 raccourcis métier essentiels pour les quincailleries et commerces de matériaux.
 */

import type { AppPage } from '../store/uiStore.ts';

export type ShortcutCategory = 'general' | 'navigation' | 'pos' | 'action';

export interface ShortcutDefinition {
  id: string;
  category: ShortcutCategory;
  categoryLabel: string;
  label: string;
  description: string;
  /** Représentation canonique des touches (ex: ['Ctrl', 'K'], ['F1'], ['Escape']) */
  keys: string[];
  /** Clé principale pour l'écoute (ex: 'F1', 'k', '1', 'Escape') */
  triggerKey: string;
  /** Exige la touche Ctrl (ou Cmd sur macOS) */
  requiresCtrlOrCmd?: boolean;
  /** Exige la touche Alt */
  requiresAlt?: boolean;
  /** Exige la touche Shift */
  requiresShift?: boolean;
  /** Peut s'exécuter même lorsqu'un champ de saisie a le focus */
  allowInInputs?: boolean;
  /** Navigation automatique vers une page spécifique */
  targetPage?: AppPage;
  /** Nom de l'événement personnalisé dispatched (ex: 'boutica:refresh') */
  customEvent?: string;
}

/**
 * Détecte si le client s'exécute sur un environnement Apple / macOS
 */
export function isMacPlatform(): boolean {
  if (typeof window !== 'undefined' && window.bouticaDesktop?.platform === 'darwin') {
    return true;
  }
  if (typeof navigator !== 'undefined') {
    const navAny = navigator as unknown as { userAgentData?: { platform?: string } };
    if (navAny.userAgentData?.platform) {
      return navAny.userAgentData.platform.toLowerCase().includes('mac');
    }
    return /macintosh|mac os x/i.test(navigator.userAgent);
  }
  return false;
}

/**
 * Formate le nom d'une touche pour l'affichage selon le système hôte
 */
export function formatShortcutKey(key: string, isMac = isMacPlatform()): string {
  if (key === 'Ctrl') return isMac ? '⌘' : 'Ctrl';
  if (key === 'Alt') return isMac ? '⌥' : 'Alt';
  if (key === 'Shift') return isMac ? '⇧' : 'Shift';
  if (key === 'Enter') return '↵ Entrée';
  if (key === 'Escape') return 'Échap';
  return key;
}

/**
 * Retourne le libellé complet d'un raccourci (ex: "Ctrl+K" ou "⌘K")
 */
export function formatShortcutCombo(keys: string[], isMac = isMacPlatform()): string {
  return keys.map((k) => formatShortcutKey(k, isMac)).join(isMac ? '' : '+');
}

/**
 * Détermine si l'événement clavier provient d'un champ éditable (input, textarea, etc.)
 */
export function isInputElement(target: EventTarget | null): boolean {
  if (!target) return false;
  if (typeof HTMLElement !== 'undefined' && target instanceof HTMLElement) {
    const tag = target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      return true;
    }
    return target.isContentEditable;
  }
  // Fallback for non-browser or mock environments
  const anyTarget = target as { tagName?: string; isContentEditable?: boolean };
  if (typeof anyTarget.tagName === 'string') {
    const tag = anyTarget.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      return true;
    }
  }
  return Boolean(anyTarget.isContentEditable);
}

/**
 * Les 15 raccourcis fondamentaux de Boutica Desktop
 */
export const BOUTICA_SHORTCUTS: ShortcutDefinition[] = [
  // 1. Aide générale
  {
    id: 'help-shortcuts',
    category: 'general',
    categoryLabel: 'Aide & Contrôle',
    label: 'Guide des raccourcis',
    description: 'Afficher ou masquer la liste complète des raccourcis',
    keys: ['F1'],
    triggerKey: 'F1',
    allowInInputs: true,
  },
  // 2. Palette de commandes
  {
    id: 'command-palette',
    category: 'general',
    categoryLabel: 'Aide & Contrôle',
    label: 'Palette de commandes',
    description: 'Recherche rapide d’écrans, d’actions et de commandes',
    keys: ['Ctrl', 'K'],
    triggerKey: 'k',
    requiresCtrlOrCmd: true,
    allowInInputs: true,
  },
  // 3. Fermer / Échapper
  {
    id: 'close-modal',
    category: 'general',
    categoryLabel: 'Aide & Contrôle',
    label: 'Fermer la modale / Annuler',
    description: 'Fermer la fenêtre active, la modale ou annuler l’action',
    keys: ['Escape'],
    triggerKey: 'Escape',
    allowInInputs: true,
  },
  // 4. Focus recherche
  {
    id: 'focus-search',
    category: 'general',
    categoryLabel: 'Aide & Contrôle',
    label: 'Recherche rapide',
    description: 'Placer le curseur sur le champ de recherche de la page active',
    keys: ['Ctrl', 'F'],
    triggerKey: 'f',
    requiresCtrlOrCmd: true,
    allowInInputs: false,
    customEvent: 'boutica:focus-search',
  },
  // 5. Actualiser les données
  {
    id: 'refresh-data',
    category: 'general',
    categoryLabel: 'Aide & Contrôle',
    label: 'Actualiser les données',
    description: 'Recharger les données de la page active depuis le Cloud',
    keys: ['Ctrl', 'R'],
    triggerKey: 'r',
    requiresCtrlOrCmd: true,
    allowInInputs: true,
    customEvent: 'boutica:refresh',
  },
  // 6. Caisse POS (Nouvelle vente)
  {
    id: 'new-sale-pos',
    category: 'pos',
    categoryLabel: 'Caisse & Ventes',
    label: 'Nouvelle vente (POS)',
    description: 'Ouvrir directement le terminal de vente comptoir',
    keys: ['F2'],
    triggerKey: 'F2',
    allowInInputs: true,
    targetPage: 'pos',
  },
  // 7. Création contextuelle rapide
  {
    id: 'contextual-create',
    category: 'action',
    categoryLabel: 'Actions Métier',
    label: 'Création rapide',
    description: 'Ouvrir le formulaire d’ajout (produit, client, dépense...)',
    keys: ['Ctrl', 'N'],
    triggerKey: 'n',
    requiresCtrlOrCmd: true,
    allowInInputs: false,
    customEvent: 'boutica:create-new',
  },
  // 8. Basculer le menu latéral
  {
    id: 'toggle-sidebar',
    category: 'general',
    categoryLabel: 'Aide & Contrôle',
    label: 'Afficher / Masquer le menu',
    description: 'Agrandir ou rétracter la barre de navigation latérale',
    keys: ['Ctrl', 'B'],
    triggerKey: 'b',
    requiresCtrlOrCmd: true,
    allowInInputs: true,
  },
  // 9. Dashboard
  {
    id: 'nav-dashboard',
    category: 'navigation',
    categoryLabel: 'Navigation Directe',
    label: 'Tableau de bord',
    description: 'Accéder aux indicateurs clés, marges et recettes',
    keys: ['Ctrl', '1'],
    triggerKey: '1',
    requiresCtrlOrCmd: true,
    allowInInputs: false,
    targetPage: 'dashboard',
  },
  // 10. Produits & Variantes
  {
    id: 'nav-products',
    category: 'navigation',
    categoryLabel: 'Navigation Directe',
    label: 'Catalogue Produits',
    description: 'Consulter et gérer les fiches articles et variantes',
    keys: ['Ctrl', '2'],
    triggerKey: '2',
    requiresCtrlOrCmd: true,
    allowInInputs: false,
    targetPage: 'products',
  },
  // 11. Gestion des Stocks
  {
    id: 'nav-inventory',
    category: 'navigation',
    categoryLabel: 'Navigation Directe',
    label: 'Gestion des Stocks',
    description: 'Vérifier les disponibilités et ajuster les quantités',
    keys: ['Ctrl', '3'],
    triggerKey: '3',
    requiresCtrlOrCmd: true,
    allowInInputs: false,
    targetPage: 'inventory',
  },
  // 12. Historique des Ventes
  {
    id: 'nav-sales',
    category: 'navigation',
    categoryLabel: 'Navigation Directe',
    label: 'Historique des Ventes',
    description: 'Rechercher une facture passée ou réimprimer un reçu',
    keys: ['Ctrl', '4'],
    triggerKey: '4',
    requiresCtrlOrCmd: true,
    allowInInputs: false,
    targetPage: 'sales',
  },
  // 13. Réception Achats
  {
    id: 'nav-purchases',
    category: 'navigation',
    categoryLabel: 'Navigation Directe',
    label: 'Réception Achats',
    description: 'Consulter les bons de livraison et réceptions fournisseurs',
    keys: ['Ctrl', '5'],
    triggerKey: '5',
    requiresCtrlOrCmd: true,
    allowInInputs: false,
    targetPage: 'purchases',
  },
  // 14. Clients
  {
    id: 'nav-customers',
    category: 'navigation',
    categoryLabel: 'Navigation Directe',
    label: 'Fichier Clients',
    description: 'Accéder à la liste des clients et comptes entreprises',
    keys: ['Ctrl', '6'],
    triggerKey: '6',
    requiresCtrlOrCmd: true,
    allowInInputs: false,
    targetPage: 'customers',
  },
  // 15. Dépenses
  {
    id: 'nav-expenses',
    category: 'navigation',
    categoryLabel: 'Navigation Directe',
    label: 'Dépenses & Frais',
    description: 'Suivre les dépenses courantes et charges d’exploitation',
    keys: ['Ctrl', '7'],
    triggerKey: '7',
    requiresCtrlOrCmd: true,
    allowInInputs: false,
    targetPage: 'expenses',
  },
];

/**
 * Raccourcis complémentaires supportés pour la navigation étendue
 */
export const EXTENDED_SHORTCUTS: ShortcutDefinition[] = [
  {
    id: 'nav-suppliers',
    category: 'navigation',
    categoryLabel: 'Navigation Directe',
    label: 'Fournisseurs',
    description: 'Consulter l’annuaire des fournisseurs partenaires',
    keys: ['Ctrl', '8'],
    triggerKey: '8',
    requiresCtrlOrCmd: true,
    allowInInputs: false,
    targetPage: 'suppliers',
  },
  {
    id: 'nav-returns',
    category: 'navigation',
    categoryLabel: 'Navigation Directe',
    label: 'Retours Marchandises',
    description: 'Gérer les retours clients et réintégrations de stock',
    keys: ['Ctrl', '9'],
    triggerKey: '9',
    requiresCtrlOrCmd: true,
    allowInInputs: false,
    targetPage: 'returns',
  },
  {
    id: 'nav-reports',
    category: 'navigation',
    categoryLabel: 'Navigation Directe',
    label: 'Rapports & Exports',
    description: 'Exporter les bilans comptables officiels en Excel ou PDF',
    keys: ['Ctrl', '0'],
    triggerKey: '0',
    requiresCtrlOrCmd: true,
    allowInInputs: false,
    targetPage: 'reports',
  },
  {
    id: 'nav-settings',
    category: 'navigation',
    categoryLabel: 'Navigation Directe',
    label: 'Paramètres du logiciel',
    description: 'Configuration du serveur, imprimantes et sécurité',
    keys: ['Ctrl', ','],
    triggerKey: ',',
    requiresCtrlOrCmd: true,
    allowInInputs: false,
    targetPage: 'settings',
  },
];

export const ALL_SHORTCUTS = [...BOUTICA_SHORTCUTS, ...EXTENDED_SHORTCUTS];

/**
 * Vérifie si un KeyboardEvent correspond à une définition de raccourci
 */
export function matchesShortcut(
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>,
  shortcut: ShortcutDefinition
): boolean {
  // 1. Vérifier la clé principale (insensible à la casse pour les lettres)
  const eventKey = event.key;
  if (!eventKey) return false;

  const isMatchKey =
    eventKey.toLowerCase() === shortcut.triggerKey.toLowerCase() ||
    (shortcut.triggerKey === 'Escape' && (eventKey === 'Escape' || eventKey === 'Esc'));

  if (!isMatchKey) return false;

  // 2. Vérifier Ctrl / Cmd
  const hasCtrlOrCmd = event.ctrlKey || event.metaKey;
  if (shortcut.requiresCtrlOrCmd && !hasCtrlOrCmd) return false;
  if (!shortcut.requiresCtrlOrCmd && hasCtrlOrCmd) {
    // Si la touche est F1 ou F2 ou Escape, ne pas requérir de Ctrl, mais autoriser
    if (shortcut.triggerKey !== 'F1' && shortcut.triggerKey !== 'F2' && shortcut.triggerKey !== 'Escape') {
      return false;
    }
  }

  // 3. Vérifier Alt
  if (shortcut.requiresAlt && !event.altKey) return false;
  if (!shortcut.requiresAlt && event.altKey) return false;

  // 4. Vérifier Shift
  if (shortcut.requiresShift && !event.shiftKey) return false;

  return true;
}

/**
 * Trouve le raccourci correspondant à l'événement clavier
 */
export function findMatchingShortcut(
  event: KeyboardEvent,
  shortcuts: ShortcutDefinition[] = ALL_SHORTCUTS
): ShortcutDefinition | undefined {
  const inInput = isInputElement(event.target);

  for (const shortcut of shortcuts) {
    if (matchesShortcut(event, shortcut)) {
      if (inInput && !shortcut.allowInInputs) {
        continue;
      }
      return shortcut;
    }
  }
  return undefined;
}
