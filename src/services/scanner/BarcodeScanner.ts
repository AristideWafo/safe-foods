export const barcodeFormats = ['ean_8', 'ean_13', 'upc_a'] as const;
export type BarcodeFormat = typeof barcodeFormats[number];
export type ScannerEngine = 'native' | 'quagga2';

export type ScanResult = {
  code: string;
  format: BarcodeFormat;
  engine: ScannerEngine;
};

export interface BarcodeScanner {
  readonly engine: ScannerEngine;
  readonly isScanning: boolean;
  start(video: HTMLVideoElement, onDetected: (result: ScanResult) => void): Promise<void>;
  stop(): Promise<void>;
}

type DetectorResult = { rawValue: string; format: string };
export type BarcodeDetectorConstructor = {
  new (options?: { formats?: readonly string[] }): { detect(source: HTMLVideoElement): Promise<DetectorResult[]> };
  getSupportedFormats?: () => Promise<string[]>;
};

export const nativeDetector = (): BarcodeDetectorConstructor | undefined =>
  (globalThis as typeof globalThis & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;

export const normalizeBarcodeFormat = (format: string): BarcodeFormat | null => {
  const value = format.toLowerCase().replace(/-/g, '_');
  if (value === 'ean_8' || value === 'ean_13' || value === 'upc_a') return value;
  return null;
};

export const supportsNativeBarcodeDetector = async (): Promise<boolean> => {
  const Detector = nativeDetector();
  if (!Detector) return false;
  if (!Detector.getSupportedFormats) return true;
  try {
    const formats = await Detector.getSupportedFormats();
    const available = new Set(formats.map(format => normalizeBarcodeFormat(format)));
    return barcodeFormats.every(format => available.has(format));
  } catch {
    return true;
  }
};

export const createBarcodeScanner = async (): Promise<BarcodeScanner> => {
  if (await supportsNativeBarcodeDetector()) {
    try {
      const { NativeBarcodeScanner } = await import('./NativeBarcodeScanner');
      return new NativeBarcodeScanner();
    } catch {
      // An incomplete native implementation is equivalent to no native detector.
    }
  }
  const { Quagga2Scanner } = await import('./Quagga2Scanner');
  return new Quagga2Scanner();
};
