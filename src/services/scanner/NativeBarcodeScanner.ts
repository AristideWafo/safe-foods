import { barcodeFormats, nativeDetector, normalizeBarcodeFormat } from './BarcodeScanner';
import type { BarcodeScanner, ScanResult } from './BarcodeScanner';

export class NativeBarcodeScanner implements BarcodeScanner {
  readonly engine = 'native' as const;
  private readonly detector: { detect(source: HTMLVideoElement): Promise<{ rawValue: string; format: string }[]> };
  private frame?: number;
  private active = false;

  constructor() {
    const Detector = nativeDetector();
    if (!Detector) throw new Error('BarcodeDetector indisponible.');
    this.detector = new Detector({ formats: barcodeFormats });
  }

  get isScanning() { return this.active; }

  async start(video: HTMLVideoElement, onDetected: (result: ScanResult) => void): Promise<void> {
    await this.stop();
    this.active = true;
    const detect = async () => {
      if (!this.active) return;
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        try {
          const codes = await this.detector.detect(video);
          for (const code of codes) {
            const format = normalizeBarcodeFormat(code.format);
            if (format && code.rawValue) onDetected({ code: code.rawValue, format, engine: this.engine });
          }
        } catch {
          // A transient frame error must not terminate an otherwise usable camera session.
        }
      }
      if (this.active) this.frame = requestAnimationFrame(() => { void detect(); });
    };
    await detect();
  }

  async stop(): Promise<void> {
    this.active = false;
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
  }
}
