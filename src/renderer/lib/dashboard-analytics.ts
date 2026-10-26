import { parseMoneyToNumber } from './money.ts';
import type { Sale } from '../types/api.ts';

export type DashboardPeriod = 'today' | '7d' | '30d' | 'month';

export interface PeriodRange {
  from: Date;
  to: Date;
  label: string;
}

/**
 * Calcule l'intervalle temporel exact (début et fin) selon la période choisie.
 */
export function getPeriodRange(period: DashboardPeriod, referenceDate = new Date()): PeriodRange {
  const now = new Date(referenceDate);
  const to = new Date(now);

  switch (period) {
    case 'today': {
      const from = new Date(now);
      from.setHours(0, 0, 0, 0);
      return { from, to, label: "Aujourd'hui" };
    }
    case '7d': {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      return { from, to, label: '7 derniers jours' };
    }
    case '30d': {
      const from = new Date(now);
      from.setDate(from.getDate() - 29);
      from.setHours(0, 0, 0, 0);
      return { from, to, label: '30 derniers jours' };
    }
    case 'month':
    default: {
      const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return { from, to, label: 'Ce mois' };
    }
  }
}

/**
 * Message d'accueil selon l'heure locale et le compte utilisateur authentifié.
 * 05:00 à 17:59 -> "Bonjour, [Prénom] !"
 * 18:00 à 04:59 -> "Bonsoir, [Prénom] !"
 */
export function getGreeting(userName?: string | null, referenceDate = new Date()): {
  greeting: string;
  firstName: string;
  fullMessage: string;
} {
  const hours = referenceDate.getHours();
  const isEvening = hours >= 18 || hours < 5;
  const greetingWord = isEvening ? 'Bonsoir' : 'Bonjour';

  let firstName = 'Gérant';
  if (userName && userName.trim()) {
    const parts = userName.trim().split(/\s+/);
    firstName = parts[0];
  }

  return {
    greeting: greetingWord,
    firstName,
    fullMessage: `${greetingWord}, ${firstName} !`,
  };
}

export interface ChartPoint {
  key: string;       // Clé chronologique (YYYY-MM-DD ou HH:00)
  label: string;     // Étiquette courte pour l'axe X
  fullDate: string;  // Libellé complet pour l'infobulle
  revenue: number;   // Montant cumulé en devise principale
  salesCount: number;
}

/**
 * Agrège les ventes effectives d'une période par jour (ou par heure pour aujourd'hui).
 * Ignore les ventes au statut CANCELLED.
 */
export function aggregateSalesByDay(
  sales: Sale[],
  period: DashboardPeriod,
  referenceDate = new Date()
): ChartPoint[] {
  const range = getPeriodRange(period, referenceDate);
  const pointsMap = new Map<string, { label: string; fullDate: string; revenue: number; salesCount: number }>();

  if (period === 'today') {
    // 24 créneaux horaires
    for (let h = 0; h < 24; h++) {
      const key = `${String(h).padStart(2, '0')}:00`;
      pointsMap.set(key, {
        label: key,
        fullDate: `Aujourd'hui à ${key}`,
        revenue: 0,
        salesCount: 0,
      });
    }

    for (const sale of sales) {
      if (sale.status === 'CANCELLED') continue;
      const d = new Date(sale.createdAt);
      const h = d.getHours();
      const key = `${String(h).padStart(2, '0')}:00`;
      const item = pointsMap.get(key);
      if (item) {
        item.revenue += parseMoneyToNumber(sale.total);
        item.salesCount += 1;
      }
    }
  } else {
    // Créneaux journaliers continus entre from et to
    const curr = new Date(range.from);
    while (curr <= range.to) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const day = String(curr.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${day}`;
      const shortLabel = curr.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: period === '30d' ? 'numeric' : 'short',
      });
      const fullDate = curr.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'long',
      });

      pointsMap.set(key, {
        label: shortLabel,
        fullDate,
        revenue: 0,
        salesCount: 0,
      });

      curr.setDate(curr.getDate() + 1);
    }

    for (const sale of sales) {
      if (sale.status === 'CANCELLED') continue;
      const d = new Date(sale.createdAt);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${day}`;
      const item = pointsMap.get(key);
      if (item) {
        item.revenue += parseMoneyToNumber(sale.total);
        item.salesCount += 1;
      }
    }
  }

  return Array.from(pointsMap.entries()).map(([key, val]) => ({
    key,
    label: val.label,
    fullDate: val.fullDate,
    revenue: Math.round(val.revenue * 100) / 100,
    salesCount: val.salesCount,
  }));
}

/**
 * Calcule le panier moyen (Chiffre d'affaires divisé par nombre de ventes).
 */
export function computeAverageCart(revenue: number, salesCount: number): number {
  if (salesCount <= 0 || revenue <= 0) return 0;
  return Math.round((revenue / salesCount) * 100) / 100;
}
