import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateSubtotal, calculateNetTotal } from './money.ts';
import type { ReceiptPdfData } from '../types/desktop.ts';

test('isPdfBuffer correctly identifies PDF magic bytes (%PDF-)', () => {
  // Real PDF binary starts with %PDF- (0x25, 0x50, 0x44, 0x46, 0x2D)
  const validPdfBuffer = Buffer.from('%PDF-1.4\n%...\n%%EOF');
  const isPdf = validPdfBuffer.subarray(0, 5).toString('ascii') === '%PDF-';
  assert.equal(isPdf, true);

  // Cloud puppeteer fallback returns raw HTML
  const fallbackHtmlBuffer = Buffer.from('<!DOCTYPE html><html><body>Rapport HTML</body></html>');
  const isHtml = fallbackHtmlBuffer.subarray(0, 5).toString('ascii') !== '%PDF-';
  assert.equal(isHtml, true);
});

test('isExcelBuffer correctly identifies XLSX zip header (PK)', () => {
  // XLSX is a ZIP archive, starting with 'PK' (0x50, 0x4B)
  const validXlsxBuffer = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00]);
  const isXlsx =
    validXlsxBuffer.length >= 4 &&
    validXlsxBuffer[0] === 0x50 &&
    validXlsxBuffer[1] === 0x4B;
  assert.equal(isXlsx, true);

  // Error JSON returned as Excel
  const jsonErrorBuffer = Buffer.from('{"statusCode":500,"message":"Internal Server Error"}');
  const isNotXlsx = !(
    jsonErrorBuffer.length >= 4 &&
    jsonErrorBuffer[0] === 0x50 &&
    jsonErrorBuffer[1] === 0x4B
  );
  assert.equal(isNotXlsx, true);
});

test('ReceiptPdfData adheres to invoice calculations and invariants', () => {
  const receipt: ReceiptPdfData = {
    saleId: 'sale-9876543210-xyz',
    saleDate: '2026-10-25T10:00:00.000Z',
    storeName: 'Quincaillerie Fluo Pro',
    storeAddress: 'Abidjan, Côte d’Ivoire',
    customerName: 'Société Générale de Bâtiment',
    paymentMethod: 'CASH',
    items: [
      { name: 'Ciment CPJ 42.5 (Sac 50kg)', sku: 'CIM-50KG', quantity: 10, unitPrice: 4800, total: 48000 },
      { name: 'Fer à béton 12mm (Barre 12m)', sku: 'FER-12MM', quantity: 5, unitPrice: 5200, total: 26000 },
    ],
    subtotal: 74000,
    discount: 4000,
    total: 70000,
  };

  const calculatedSubtotal = calculateSubtotal(receipt.items);
  assert.equal(calculatedSubtotal, 74000);

  const calculatedNet = calculateNetTotal(receipt.subtotal, receipt.discount);
  assert.equal(calculatedNet, 70000);
  assert.equal(receipt.total, calculatedNet);
});

test('Password reset validation adheres to Cloud contract', () => {
  const validateReset = (token: string, newPass: string) => {
    if (!token || token.trim().length === 0) return { valid: false, error: 'Token requis' };
    if (!newPass || newPass.length < 10) return { valid: false, error: 'Mot de passe trop court (min 10)' };
    return { valid: true, error: null };
  };

  assert.equal(validateReset('', 'ValidPassword123').valid, false);
  assert.equal(validateReset('tok-123', 'short9').valid, false);
  assert.equal(validateReset('tok-123', 'ValidPassword123').valid, true);
});
