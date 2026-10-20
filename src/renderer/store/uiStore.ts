import { create } from 'zustand';
import type { UserSession, Variant } from '../types/api.ts';
import { setDefaultCurrency } from '../lib/money.ts';

export type AppPage =
  | 'dashboard'
  | 'pos'
  | 'products'
  | 'inventory'
  | 'sales'
  | 'purchases'
  | 'returns'
  | 'customers'
  | 'suppliers'
  | 'expenses'
  | 'reports'
  | 'settings';

export type EntryView = 'splash' | 'welcome' | 'onboarding' | 'login' | 'register';

export interface CartItem {
  variant: Variant;
  quantity: number;
}

interface UIState {
  // App navigation
  currentPage: AppPage;
  setCurrentPage: (page: AppPage) => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Initial entry flow navigation (when session is null)
  entryView: EntryView;
  setEntryView: (view: EntryView) => void;

  // Command palette
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // Authentication & session (strictly authentic from Boutica Cloud)
  session: UserSession | null;
  setSession: (session: UserSession | null) => void;

  // Connectivity
  isOnline: boolean;
  setOnline: (status: boolean) => void;
  isBackendHealthy: boolean | null;
  setBackendHealthy: (healthy: boolean | null) => void;

  // POS Cart State
  cart: CartItem[];
  posDiscount: number;
  posCustomerId: string | null;
  addToCart: (variant: Variant, quantity?: number) => void;
  removeFromCart: (variantId: string) => void;
  updateCartQuantity: (variantId: string, quantity: number) => void;
  setPosDiscount: (discount: number) => void;
  setPosCustomerId: (id: string | null) => void;
  clearCart: () => void;

  // Receipt Modal State
  activeReceipt: {
    saleId: string;
    saleDate: string;
    customerName?: string;
    items: Array<{ name: string; quantity: number; unitPrice: number; total: number }>;
    subtotal: number;
    discount: number;
    total: number;
  } | null;
  openReceipt: (receipt: UIState['activeReceipt']) => void;
  closeReceipt: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),
  isSidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

  entryView: 'splash',
  setEntryView: (entryView) => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('boutica_target_view', entryView);
      } catch {
        /* ignore */
      }
    }
    set({ entryView });
  },

  isCommandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),

  session: null,
  setSession: (session) => {
    setDefaultCurrency(session?.user.businessCurrency);
    set({
      session,
      ...(session ? {} : { cart: [], posDiscount: 0, posCustomerId: null, activeReceipt: null }),
    });
  },

  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  setOnline: (isOnline) => set({ isOnline }),
  isBackendHealthy: null,
  setBackendHealthy: (isBackendHealthy) => set({ isBackendHealthy }),

  cart: [],
  posDiscount: 0,
  posCustomerId: null,
  addToCart: (variant, quantity = 1) =>
    set((state) => {
      const existing = state.cart.find((item) => item.variant.id === variant.id);
      if (existing) {
        return {
          cart: state.cart.map((item) =>
            item.variant.id === variant.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          ),
        };
      }
      return { cart: [...state.cart, { variant, quantity }] };
    }),
  removeFromCart: (variantId) =>
    set((state) => ({
      cart: state.cart.filter((item) => item.variant.id !== variantId),
    })),
  updateCartQuantity: (variantId, quantity) =>
    set((state) => ({
      cart:
        quantity <= 0
          ? state.cart.filter((item) => item.variant.id !== variantId)
          : state.cart.map((item) =>
              item.variant.id === variantId ? { ...item, quantity } : item
            ),
    })),
  setPosDiscount: (posDiscount) => set({ posDiscount: Math.max(0, posDiscount) }),
  setPosCustomerId: (posCustomerId) => set({ posCustomerId }),
  clearCart: () => set({ cart: [], posDiscount: 0, posCustomerId: null }),

  activeReceipt: null,
  openReceipt: (receipt) => set({ activeReceipt: receipt }),
  closeReceipt: () => set({ activeReceipt: null }),
}));
