export interface BarcodeScanner {
  readonly isScanning: boolean;
  start(onCode: (code: string) => void, onError: (error: unknown) => void): Promise<void>;
  stop(): Promise<void>;
  supportsTorch(): boolean;
  setTorch(enabled: boolean): Promise<void>;
}
export type ScannerProvider = 'scanbot' | 'html5';
export const scannerProvider = (value?: string): ScannerProvider => {
  if (!value || value === 'scanbot') return 'scanbot';
  if (value === 'html5') return 'html5';
  throw new Error('Moteur de scan inconnu. Utilisez scanbot ou html5.');
};
export const createBarcodeScanner = async (containerId: string, provider: ScannerProvider, licenseKey: string): Promise<BarcodeScanner> => {
  if (provider === 'html5') {
    const { Html5Scanner } = await import('./Html5Scanner');
    return new Html5Scanner(containerId);
  }
  const { ScanbotScanner } = await import('./ScanbotScanner');
  return new ScanbotScanner(containerId, licenseKey);
};
