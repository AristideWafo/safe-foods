import type ScanbotSDK from 'scanbot-web-sdk';
import type { BarcodeScanner } from './BarcodeScanner';
type ScanbotHandle = Awaited<ReturnType<ScanbotSDK['createBarcodeScanner']>>;
export type ScanbotRuntime = Pick<ScanbotSDK, 'getLicenseInfo' | 'createBarcodeScanner'>;
let sdkPromise: Promise<ScanbotSDK> | undefined;
const initialize = (licenseKey: string) => {
  sdkPromise ??= import('scanbot-web-sdk').then(({ default: SDK }) => SDK.initialize({ licenseKey, enginePath: '/scanbot-engine/', allowThreads: false })).catch(error => { sdkPromise = undefined; throw error; });
  return sdkPromise;
};
export class ScanbotScanner implements BarcodeScanner {
  private handle?: ScanbotHandle;
  constructor(private readonly containerId: string, licenseKey: string, private readonly loadSdk: () => Promise<ScanbotRuntime> = () => initialize(licenseKey)) {}
  get isScanning() { return !!this.handle; }
  async start(onCode: (code: string) => void, onError: (error: unknown) => void) {
    const sdk = await this.loadSdk();
    const license = await sdk.getLicenseInfo();
    if (license.status === 'FAILURE_EXPIRED') throw new Error('La licence d’essai Scanbot a expiré. Vous pouvez saisir le code ou importer une photo.');
    if (license.status.startsWith('FAILURE')) throw new Error('La licence Scanbot ne permet pas le scan sur cette adresse. Vous pouvez saisir le code ou importer une photo.');
    this.handle = await sdk.createBarcodeScanner({
      containerId: this.containerId, previewMode: 'FILL_IN',
      videoConstraints: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
      scannerConfiguration: { barcodeFormatConfigurations: [{ _type: 'BarcodeFormatCommonConfiguration', formats: ['EAN_8', 'EAN_13', 'UPC_A'] }] },
      finder: { _type: 'ViewFinderConfiguration', visible: false }, userGuidance: { visible: false },
      onBarcodesDetected: result => { for (const barcode of result.barcodes) onCode(barcode.text); },
      onError,
    });
  }
  async stop() { const handle = this.handle; this.handle = undefined; handle?.dispose(); }
  supportsTorch() { return this.handle?.getActiveCameraInfo()?.supportsTorchControl === true; }
  async setTorch(enabled: boolean) { await this.handle?.setTorchState(enabled); }
}
