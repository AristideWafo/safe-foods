import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import type { BarcodeScanner } from './BarcodeScanner';
export class Html5Scanner implements BarcodeScanner {
  private readonly scanner: Html5Qrcode;
  constructor(containerId: string) {
    this.scanner = new Html5Qrcode(containerId, { formatsToSupport: [Html5QrcodeSupportedFormats.EAN_8, Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.UPC_A], verbose: false });
  }
  get isScanning() { return this.scanner.isScanning; }
  async start(onCode: (code: string) => void) {
    await this.scanner.start({ facingMode: 'environment' }, { fps: 10, aspectRatio: 1.25 }, onCode, () => {});
  }
  async stop() { if (this.isScanning) await this.scanner.stop(); }
  supportsTorch() {
    try { return this.isScanning && this.scanner.getRunningTrackCameraCapabilities().torchFeature().isSupported(); }
    catch { return false; }
  }
  async setTorch(enabled: boolean) { await this.scanner.applyVideoConstraints({ advanced: [{ torch: enabled } as MediaTrackConstraintSet] }); }
}
