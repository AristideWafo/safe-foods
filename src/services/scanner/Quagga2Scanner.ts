import { normalizeBarcodeFormat } from './BarcodeScanner';
import type { BarcodeScanner, ScanResult } from './BarcodeScanner';
import type Quagga from '@ericblade/quagga2';

type QuaggaRuntime = Pick<typeof Quagga, 'decodeSingle'>;
const loadQuagga = async (): Promise<QuaggaRuntime> => (await import('@ericblade/quagga2')).default;

export class Quagga2Scanner implements BarcodeScanner {
  readonly engine = 'quagga2' as const;
  private active = false;
  private timer?: number;
  private decoding = false;
  private readonly canvas = document.createElement('canvas');

  constructor(private readonly load: () => Promise<QuaggaRuntime> = loadQuagga) {}

  get isScanning() { return this.active; }

  async start(video: HTMLVideoElement, onDetected: (result: ScanResult) => void): Promise<void> {
    await this.stop();
    const quagga = await this.load();
    this.active = true;
    const context = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Préparation du lecteur de code-barres impossible.');
    const schedule = () => { if (this.active) this.timer = window.setTimeout(() => { void decode(); }, 125); };
    const decode = async () => {
      if (!this.active || this.decoding || !video.videoWidth || !video.videoHeight) { schedule(); return; }
      this.decoding = true;
      try {
        this.canvas.width = video.videoWidth; this.canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
        const result = await quagga.decodeSingle({ src: this.canvas.toDataURL('image/jpeg', 0.85), locate: true, decoder: { readers: ['ean_reader', 'ean_8_reader', 'upc_reader'] }, numOfWorkers: 0 });
        const code = result?.codeResult?.code;
        const format = result?.codeResult?.format && normalizeBarcodeFormat(result.codeResult.format);
        if (this.active && code && format) onDetected({ code, format, engine: this.engine });
      } catch {
        // Quagga reports unsuccessful frames as rejections; keep scanning the next frame.
      } finally {
        this.decoding = false;
        schedule();
      }
    };
    schedule();
  }

  async stop(): Promise<void> {
    this.active = false;
    if (this.timer !== undefined) window.clearTimeout(this.timer);
    this.timer = undefined;
  }
}
