import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPeriodRange,
  getGreeting,
  aggregateSalesByDay,
  computeAverageCart,
} from './dashboard-analytics.ts';
import type { Sale } from '../types/api.ts';

test('getGreeting handles morning, afternoon, and evening correctly', () => {
  // Morning at 09:30
  const morningDate = new Date('2026-10-25T09:30:00');
  const g1 = getGreeting('Mamadou Diallo', morningDate);
  assert.equal(g1.greeting, 'Bonjour');
  assert.equal(g1.firstName, 'Mamadou');
  assert.equal(g1.fullMessage, 'Bonjour, Mamadou !');

  // Evening at 19:45
  const eveningDate = new Date('2026-10-25T19:45:00');
  const g2 = getGreeting('Awa Koné', eveningDate);
  assert.equal(g2.greeting, 'Bonsoir');
  assert.equal(g2.firstName, 'Awa');
  assert.equal(g2.fullMessage, 'Bonsoir, Awa !');

  // Night at 02:15
  const nightDate = new Date('2026-10-25T02:15:00');
  const g3 = getGreeting(null, nightDate);
  assert.equal(g3.greeting, 'Bonsoir');
  assert.equal(g3.firstName, 'Gérant');
  assert.equal(g3.fullMessage, 'Bonsoir, Gérant !');
});

test('getPeriodRange computes valid from and to timestamps', () => {
  const ref = new Date('2026-10-25T14:00:00.000Z');

  const today = getPeriodRange('today', ref);
  assert.equal(today.label, "Aujourd'hui");
  assert.equal(today.from.getHours(), 0);
  assert.equal(today.from.getDate(), ref.getDate());

  const sevenDays = getPeriodRange('7d', ref);
  assert.equal(sevenDays.label, '7 derniers jours');
  const diffDays = Math.round((today.to.getTime() - sevenDays.from.getTime()) / (1000 * 3600 * 24));
  assert.ok(diffDays >= 6);

  const month = getPeriodRange('month', ref);
  assert.equal(month.label, 'Ce mois');
  assert.equal(month.from.getDate(), 1);
});

test('aggregateSalesByDay groups sales by day and skips cancelled sales', () => {
  const ref = new Date('2026-10-25T15:00:00');
  const mockSales: Sale[] = [
    {
      id: 's1',
      businessId: 'b1',
      status: 'COMPLETED',
      subtotal: '25000',
      discount: '0',
      total: '25000',
      createdAt: '2026-10-25T10:00:00',
    },
    {
      id: 's2',
      businessId: 'b1',
      status: 'COMPLETED',
      subtotal: '15000',
      discount: '0',
      total: '15000',
      createdAt: '2026-10-25T12:00:00',
    },
    {
      id: 's3',
      businessId: 'b1',
      status: 'CANCELLED',
      subtotal: '50000',
      discount: '0',
      total: '50000',
      createdAt: '2026-10-25T13:00:00',
    },
    {
      id: 's4',
      businessId: 'b1',
      status: 'COMPLETED',
      subtotal: '30000',
      discount: '0',
      total: '30000',
      createdAt: '2026-10-24T16:00:00',
    },
  ];

  const points = aggregateSalesByDay(mockSales, '7d', ref);
  assert.equal(points.length, 7);

  // Find 2026-10-25 point
  const ptToday = points.find((p) => p.key === '2026-10-25');
  assert.ok(ptToday);
  // Total must be 25000 + 15000 = 40000 (cancelled sale skipped)
  assert.equal(ptToday.revenue, 40000);
  assert.equal(ptToday.salesCount, 2);

  // Find 2026-10-24 point
  const ptYesterday = points.find((p) => p.key === '2026-10-24');
  assert.ok(ptYesterday);
  assert.equal(ptYesterday.revenue, 30000);
  assert.equal(ptYesterday.salesCount, 1);
});

test('computeAverageCart calculates correctly and handles zero', () => {
  assert.equal(computeAverageCart(0, 0), 0);
  assert.equal(computeAverageCart(100000, 4), 25000);
  assert.equal(computeAverageCart(1000, 3), 333.33);
});
