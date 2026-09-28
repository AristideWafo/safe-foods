import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBarcodeScanner, normalizeBarcodeFormat, supportsNativeBarcodeDetector } from '../src/services/scanner/BarcodeScanner';
import { CameraSession } from '../src/services/scanner/CameraSession';

const installDetector = (value: unknown) => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'BarcodeDetector');
  Object.defineProperty(globalThis, 'BarcodeDetector', { configurable: true, value });
  return () => {
    if (previous) Object.defineProperty(globalThis, 'BarcodeDetector', previous);
    else Reflect.deleteProperty(globalThis, 'BarcodeDetector');
  };
};

test('normalizes only the food barcode formats SafeEat accepts', () => {
  assert.equal(normalizeBarcodeFormat('ean-8'), 'ean_8');
  assert.equal(normalizeBarcodeFormat('EAN_13'), 'ean_13');
  assert.equal(normalizeBarcodeFormat('upc_a'), 'upc_a');
  assert.equal(normalizeBarcodeFormat('code_128'), null);
});

test('chooses the native engine when the browser exposes a compatible detector', async () => {
  const restore = installDetector(class {
    static async getSupportedFormats() { return ['ean_8', 'ean_13', 'upc_a']; }
    async detect() { return []; }
  });
  try {
    assert.equal(await supportsNativeBarcodeDetector(), true);
    const scanner = await createBarcodeScanner();
    assert.equal(scanner.engine, 'native');
  } finally { restore(); }
});

test('requires every SafeEat format before choosing the native engine', async () => {
  const restore = installDetector(class {
    static async getSupportedFormats() { return ['ean_13']; }
    async detect() { return []; }
  });
  try { assert.equal(await supportsNativeBarcodeDetector(), false); }
  finally { restore(); }
});

test('releases a newly opened camera when the preview cannot start', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  let stopped = false;
  const stream = { active: true, getTracks: () => [{ stop: () => { stopped = true; } }] } as unknown as MediaStream;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: async () => stream } } });
  const video = { srcObject: null, play: async () => { throw new Error('play failed'); }, pause() {} } as unknown as HTMLVideoElement;
  try {
    const session = new CameraSession();
    await assert.rejects(session.start(video), /play failed/);
    assert.equal(stopped, true);
    assert.equal(video.srcObject, null);
    assert.equal(session.isActive, false);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'navigator', previous);
    else Reflect.deleteProperty(globalThis, 'navigator');
  }
});
