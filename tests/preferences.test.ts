import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Switch } from '../src/components/primitives/Switch';
import { shouldSignalRisk } from '../src/services/ScanFeedback';
import { sanitizeStoredState, useStore } from '../src/store/useStore';
import type { AnalysisResult } from '../src/types';

test('old storage receives enabled preferences and malformed values are rejected', () => {
  assert.deepEqual(sanitizeStoredState({}).preferences, { traceAlerts: true, sensoryAlerts: true });
  assert.deepEqual(sanitizeStoredState({ preferences: { traceAlerts: 'false', sensoryAlerts: false } }).preferences, { traceAlerts: true, sensoryAlerts: false });
});
test('preferences persist separately from allergens and history', async () => {
  useStore.setState({ allergies: ['milk'], history: [], preferences: { traceAlerts: true, sensoryAlerts: true } });
  useStore.getState().setPreference('traceAlerts', false);
  assert.deepEqual(useStore.getState().allergies, ['milk']);
  const saved = localStorage.getItem('safe-eat-storage');
  assert.ok(saved);
  useStore.setState({ preferences: { traceAlerts: true, sensoryAlerts: false } });
  localStorage.setItem('safe-eat-storage', saved);
  await useStore.persist.rehydrate();
  assert.deepEqual(useStore.getState().preferences, { traceAlerts: false, sensoryAlerts: true });
});
test('feedback respects sensory and trace preferences without changing the verdict', () => {
  const result: AnalysisResult = { status: 'UNCERTAIN', explanation: 'Traces', detectedAllergens: [], detectedTraces: ['milk'] };
  assert.equal(shouldSignalRisk(result, { traceAlerts: true, sensoryAlerts: true }), true);
  assert.equal(shouldSignalRisk(result, { traceAlerts: false, sensoryAlerts: true }), false);
  assert.equal(shouldSignalRisk({ ...result, status: 'AVOID' }, { traceAlerts: false, sensoryAlerts: true }), true);
  assert.equal(shouldSignalRisk({ ...result, status: 'AVOID' }, { traceAlerts: true, sensoryAlerts: false }), false);
  assert.equal(result.status, 'UNCERTAIN');
});
test('switch exposes its checked state and label association', () => {
  const html = renderToStaticMarkup(createElement(Switch, { checked: true, onChange: () => {}, labelledBy: 'label', describedBy: 'description' }));
  assert.match(html, /role="switch"/);
  assert.match(html, /aria-checked="true"/);
  assert.match(html, /aria-labelledby="label"/);
});
