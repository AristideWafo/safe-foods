import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DEFAULT_AI_PREFERENCES, parseAIPreferences, photoConsentMode } from '../src/services/AIPreferences';
import { sanitizeStoredState, useStore } from '../src/store/useStore';
import { AIPreferencesSection } from '../src/components/profile/AIPreferencesSection';

test('existing profiles continue to require explicit photo confirmation', () => {
  assert.deepEqual(sanitizeStoredState({}).aiPreferences, DEFAULT_AI_PREFERENCES);
  assert.equal(photoConsentMode(sanitizeStoredState({}).aiPreferences), 'confirm');
  for (const value of ['true', 1, {}, null]) assert.equal(parseAIPreferences({ autoSendPhotos: value }).autoSendPhotos, false);
});
test('photo consent persists and disabling photo AI revokes it', async () => {
  useStore.setState({ aiPreferences: { ...DEFAULT_AI_PREFERENCES }, allergies: ['milk'], history: [] });
  useStore.getState().setAIPreference('autoSendPhotos', true);
  assert.equal(photoConsentMode(useStore.getState().aiPreferences), 'send');
  const saved = localStorage.getItem('safe-eat-storage'); assert.ok(saved);
  useStore.setState({ aiPreferences: { ...DEFAULT_AI_PREFERENCES } });
  localStorage.setItem('safe-eat-storage', saved); await useStore.persist.rehydrate();
  assert.equal(photoConsentMode(useStore.getState().aiPreferences), 'send');
  useStore.getState().setAIPreference('photoAnalysis', false);
  assert.equal(photoConsentMode(useStore.getState().aiPreferences), 'disabled');
  assert.equal(useStore.getState().aiPreferences.autoSendPhotos, false);
  useStore.getState().setAIPreference('autoSendPhotos', true);
  assert.equal(useStore.getState().aiPreferences.autoSendPhotos, false);
  useStore.getState().setAIPreference('photoAnalysis', true);
  assert.equal(photoConsentMode(useStore.getState().aiPreferences), 'confirm');
  assert.deepEqual(useStore.getState().allergies, ['milk']);
});
test('disabled photo setting wins over inconsistent persisted auto-send', () => {
  assert.deepEqual(parseAIPreferences({ photoAnalysis: false, autoSendPhotos: true, synonymSuggestions: 'false' }), { photoAnalysis: false, autoSendPhotos: false, synonymSuggestions: true });
});
test('AI section explains the provider, deliberate photo choice and revocation', () => {
  const html = renderToStaticMarkup(createElement(AIPreferencesSection));
  assert.equal((html.match(/role="switch"/g) || []).length, 3);
  assert.match(html, /Google Gemini/); assert.match(html, /Aucune photo n’est prise automatiquement/);
  assert.match(html, /révoque aussi cet accord/);
});
test('synonym preference can be disabled without removing existing custom names', () => {
  const before = useStore.getState().customAllergens;
  useStore.getState().setAIPreference('synonymSuggestions', false);
  assert.equal(useStore.getState().aiPreferences.synonymSuggestions, false);
  assert.equal(useStore.getState().customAllergens, before);
});
