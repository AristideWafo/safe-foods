import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scannerProvider } from '../src/services/scanner/BarcodeScanner';
import { ScanbotScanner } from '../src/services/scanner/ScanbotScanner';
import type { ScanbotRuntime } from '../src/services/scanner/ScanbotScanner';

test('Scanbot is default and html5 remains selectable', () => {
  assert.equal(scannerProvider(), 'scanbot');
  assert.equal(scannerProvider('html5'), 'html5');
  assert.throws(() => scannerProvider('unknown'));
});
test('Scanbot forwards codes, supports torch, disposes once and can restart', async () => {
  let disposed = 0;
  let torch = false;
  let config: Parameters<ScanbotRuntime['createBarcodeScanner']>[0];
  const sdk = {
    getLicenseInfo: async () => ({ status: 'OKAY' }),
    createBarcodeScanner: async (configuration: typeof config) => {
      config = configuration;
      return { dispose: () => disposed++, getActiveCameraInfo: () => ({ supportsTorchControl: true }), setTorchState: async (value: boolean) => { torch = value; } };
    },
  } as unknown as ScanbotRuntime;
  const scanner = new ScanbotScanner('reader', 'test', async () => sdk);
  const codes: string[] = [];
  await scanner.start(code => codes.push(code), () => {});
  assert.equal(scanner.isScanning, true);
  assert.equal(scanner.supportsTorch(), true);
  config!.onBarcodesDetected?.({ barcodes: [{ text: '3274080005003' }] } as Parameters<NonNullable<typeof config.onBarcodesDetected>>[0]);
  assert.deepEqual(codes, ['3274080005003']);
  await scanner.setTorch(true);
  assert.equal(torch, true);
  await scanner.stop(); await scanner.stop();
  assert.equal(disposed, 1); assert.equal(scanner.isScanning, false);
  await scanner.start(() => {}, () => {}); await scanner.stop();
  assert.equal(disposed, 2);
});
test('expired or invalid trial fails before opening camera', async () => {
  for (const status of ['FAILURE_EXPIRED', 'FAILURE_APP_ID_MISMATCH']) {
    let opened = false;
    const sdk = { getLicenseInfo: async () => ({ status }), createBarcodeScanner: async () => { opened = true; } } as unknown as ScanbotRuntime;
    const scanner = new ScanbotScanner('reader', 'test', async () => sdk);
    await assert.rejects(scanner.start(() => {}, () => {}), /licence/);
    assert.equal(opened, false); assert.equal(scanner.isScanning, false);
  }
});
