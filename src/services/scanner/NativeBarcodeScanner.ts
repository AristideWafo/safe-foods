import { barcodeFormats, nativeDetector, normalizeBarcodeFormat } from './BarcodeScanner';
import type { BarcodeScanner, ScanResult } from './BarcodeScanner';

const orientations = [0, 180, 90, 270] as const;
const haveCurrentData = 2;
type DetectionSource = HTMLVideoElement | HTMLCanvasElement;
type Detector = { detect(source: DetectionSource): Promise<{ rawValue: string; format: string }[]> };

export class NativeBarcodeScanner implements BarcodeScanner {
  readonly engine = 'native' as const;
  private readonly detector: Detector;
  private frame?: number;
  private active = false;
  private orientation = 0;
  private canvas?: HTMLCanvasElement;

  constructor() {
    const Detector = nativeDetector();
    if (!Detector) throw new Error('BarcodeDetector indisponible.');
    this.detector = new Detector({ formats: barcodeFormats });
  }

  get isScanning() { return this.active; }

  private sourceFor(video: HTMLVideoElement): DetectionSource {
    const degrees = orientations[this.orientation++ % orientations.length];
    if (degrees === 0) return video;
    const canvas = this.canvas ??= document.createElement('canvas');
    const width = video.videoWidth; const height = video.videoHeight;
    canvas.width = degrees % 180 === 0 ? width : height;
    canvas.height = degrees % 180 === 0 ? height : width;
    const context = canvas.getContext('2d');
    if (!context) return video;
    context.save();
    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(degrees * Math.PI / 180);
    context.drawImage(video, -width / 2, -height / 2);
    context.restore();
    return canvas;
  }

  async start(video: HTMLVideoElement, onDetected: (result: ScanResult) => void): Promise<void> {
    await this.stop();
    this.active = true;
    const detect = async () => {
      if (!this.active) return;
      if (video.readyState >= haveCurrentData) {
        try {
          const codes = await this.detector.detect(this.sourceFor(video));
          if (!this.active) return;
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
