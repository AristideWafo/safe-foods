import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
import a11y from 'eslint-plugin-jsx-a11y';
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mjs}'],
    languageOptions: { globals: {
      Event: 'readonly', MouseEvent: 'readonly', console: 'readonly', process: 'readonly', Buffer: 'readonly', window: 'readonly', document: 'readonly',
      localStorage: 'readonly', crypto: 'readonly', fetch: 'readonly', Request: 'readonly', Response: 'readonly',
      AbortController: 'readonly', AbortSignal: 'readonly', DOMException: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly',
      HTMLVideoElement: 'readonly', HTMLDialogElement: 'readonly', MediaTrackConstraintSet: 'readonly', File: 'readonly', createImageBitmap: 'readonly',
    } },
    rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }] },
  },
  { files: ['src/**/*.{ts,tsx}'], plugins: { 'react-hooks': hooks, 'jsx-a11y': a11y }, rules: {
    ...hooks.configs.recommended.rules, ...a11y.configs.recommended.rules,
  } },
);
