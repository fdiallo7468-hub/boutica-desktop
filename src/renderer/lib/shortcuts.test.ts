/**
 * Tests unitaires pour le système de raccourcis clavier de Boutica Desktop
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BOUTICA_SHORTCUTS,
  ALL_SHORTCUTS,
  matchesShortcut,
  findMatchingShortcut,
  formatShortcutCombo,
  formatShortcutKey,
  isInputElement,
} from './shortcuts.ts';

test('BOUTICA_SHORTCUTS defines exactly 15 essential keyboard shortcuts', () => {
  assert.equal(BOUTICA_SHORTCUTS.length, 15);
  // Verify IDs are unique
  const ids = new Set(BOUTICA_SHORTCUTS.map((s) => s.id));
  assert.equal(ids.size, 15);
});

test('Matches F1 shortcut for help modal', () => {
  const shortcut = BOUTICA_SHORTCUTS.find((s) => s.id === 'help-shortcuts')!;
  assert.ok(shortcut);
  assert.equal(matchesShortcut({ key: 'F1', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false }, shortcut), true);
});

test('Matches Ctrl+K and Cmd+K for command palette', () => {
  const shortcut = BOUTICA_SHORTCUTS.find((s) => s.id === 'command-palette')!;
  assert.ok(shortcut);
  // Windows/Linux Ctrl+K
  assert.equal(matchesShortcut({ key: 'k', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false }, shortcut), true);
  // Uppercase K with Ctrl
  assert.equal(matchesShortcut({ key: 'K', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false }, shortcut), true);
  // macOS Cmd+K
  assert.equal(matchesShortcut({ key: 'k', ctrlKey: false, metaKey: true, altKey: false, shiftKey: false }, shortcut), true);
  // Just K without modifier should not match
  assert.equal(matchesShortcut({ key: 'k', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false }, shortcut), false);
});

test('Matches F2 for quick POS sale', () => {
  const shortcut = BOUTICA_SHORTCUTS.find((s) => s.id === 'new-sale-pos')!;
  assert.ok(shortcut);
  assert.equal(matchesShortcut({ key: 'F2', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false }, shortcut), true);
  assert.equal(shortcut.targetPage, 'pos');
});

test('Matches Ctrl+1..7 for rapid module navigation', () => {
  const expectedNavPages = ['dashboard', 'products', 'inventory', 'sales', 'purchases', 'customers', 'expenses'];
  for (let i = 1; i <= 7; i++) {
    const key = i.toString();
    const shortcut = BOUTICA_SHORTCUTS.find((s) => s.triggerKey === key)!;
    assert.ok(shortcut, `Shortcut for ${key} should exist`);
    assert.equal(shortcut.targetPage, expectedNavPages[i - 1]);
    assert.equal(matchesShortcut({ key, ctrlKey: true, metaKey: false, altKey: false, shiftKey: false }, shortcut), true);
  }
});

test('Matches Ctrl+R for safe Cloud refresh', () => {
  const shortcut = BOUTICA_SHORTCUTS.find((s) => s.id === 'refresh-data')!;
  assert.ok(shortcut);
  assert.equal(matchesShortcut({ key: 'r', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false }, shortcut), true);
  assert.equal(shortcut.customEvent, 'boutica:refresh');
  assert.equal(shortcut.allowInInputs, true);
});

test('Matches Ctrl+N for contextual creation', () => {
  const shortcut = BOUTICA_SHORTCUTS.find((s) => s.id === 'contextual-create')!;
  assert.ok(shortcut);
  assert.equal(matchesShortcut({ key: 'n', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false }, shortcut), true);
  assert.equal(shortcut.customEvent, 'boutica:create-new');
  assert.equal(shortcut.allowInInputs, false);
});

test('Matches Ctrl+F for rapid search focus', () => {
  const shortcut = BOUTICA_SHORTCUTS.find((s) => s.id === 'focus-search')!;
  assert.ok(shortcut);
  assert.equal(matchesShortcut({ key: 'f', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false }, shortcut), true);
  assert.equal(shortcut.customEvent, 'boutica:focus-search');
});

test('Matches Escape for closing modals', () => {
  const shortcut = BOUTICA_SHORTCUTS.find((s) => s.id === 'close-modal')!;
  assert.ok(shortcut);
  assert.equal(matchesShortcut({ key: 'Escape', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false }, shortcut), true);
  assert.equal(shortcut.allowInInputs, true);
});

test('Platform formatting displays correct modifier glyphs', () => {
  // Mac uses ⌘ symbol
  assert.equal(formatShortcutKey('Ctrl', true), '⌘');
  assert.equal(formatShortcutCombo(['Ctrl', 'K'], true), '⌘K');
  assert.equal(formatShortcutCombo(['Ctrl', '1'], true), '⌘1');

  // Windows/Linux uses text Ctrl+
  assert.equal(formatShortcutKey('Ctrl', false), 'Ctrl');
  assert.equal(formatShortcutCombo(['Ctrl', 'K'], false), 'Ctrl+K');
  assert.equal(formatShortcutCombo(['Ctrl', '1'], false), 'Ctrl+1');
});

test('isInputElement safely identifies non-DOM environments', () => {
  assert.equal(isInputElement(null), false);
  assert.equal(isInputElement(undefined as any), false);
  assert.equal(isInputElement({} as any), false);
});

test('Does not match native text editing keys as shortcuts', () => {
  const cEvent = { key: 'c', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false };
  const vEvent = { key: 'v', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false };
  const zEvent = { key: 'z', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false };
  const aEvent = { key: 'a', ctrlKey: true, metaKey: false, altKey: false, shiftKey: false };

  // None of these should match any Boutica shortcut
  for (const s of ALL_SHORTCUTS) {
    assert.equal(matchesShortcut(cEvent, s), false, `Ctrl+C should not match ${s.id}`);
    assert.equal(matchesShortcut(vEvent, s), false, `Ctrl+V should not match ${s.id}`);
    assert.equal(matchesShortcut(zEvent, s), false, `Ctrl+Z should not match ${s.id}`);
    assert.equal(matchesShortcut(aEvent, s), false, `Ctrl+A should not match ${s.id}`);
  }
});

test('Safely handles events with undefined or missing key', () => {
  const badEvent = { key: undefined as any, ctrlKey: true, metaKey: false, altKey: false, shiftKey: false };
  for (const s of ALL_SHORTCUTS) {
    assert.equal(matchesShortcut(badEvent, s), false, `Undefined key should not match \${s.id}`);
  }
});
