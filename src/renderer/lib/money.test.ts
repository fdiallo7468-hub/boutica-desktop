import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMoneyToNumber, formatMoney, calculateSubtotal, calculateNetTotal } from './money.ts';

test('parseMoneyToNumber handles strings, null, undefined and negative numbers', () => {
  assert.equal(parseMoneyToNumber(null), 0);
  assert.equal(parseMoneyToNumber(undefined), 0);
  assert.equal(parseMoneyToNumber('15000.50'), 15000.50);
  assert.equal(parseMoneyToNumber('12 500 XOF'), 12500);
  assert.equal(parseMoneyToNumber(-450), -450);
});

test('formatMoney formats XOF and EUR correctly', () => {
  const formattedXof = formatMoney(12500, 'XOF');
  assert.match(formattedXof, /12.*500.*XOF/);

  const formattedEur = formatMoney(120.5, 'EUR');
  assert.match(formattedEur, /120,50/);
});

test('calculateSubtotal and calculateNetTotal enforce business invariants', () => {
  const items = [
    { quantity: 3, unitPrice: '2500' },
    { quantity: 2, unitPrice: 1500 },
  ];
  const subtotal = calculateSubtotal(items);
  assert.equal(subtotal, 10500);

  // Discount within subtotal
  assert.equal(calculateNetTotal(subtotal, 500), 10000);

  // Discount exceeding subtotal must not yield negative total
  assert.equal(calculateNetTotal(subtotal, 20000), 0);
});
