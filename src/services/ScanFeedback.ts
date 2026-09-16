import type { AnalysisResult } from '../types';
export const shouldSignalRisk = (result: AnalysisResult, preferences: { traceAlerts: boolean; sensoryAlerts: boolean }) => preferences.sensoryAlerts && (result.status === 'AVOID' || (preferences.traceAlerts && result.detectedTraces.length > 0));
/** Best-effort feedback; unsupported or blocked APIs never interrupt a scan. */
export const signalScanRisk = (result: AnalysisResult, preferences: { traceAlerts: boolean; sensoryAlerts: boolean }) => {
  if (!shouldSignalRisk(result, preferences)) return;
  try { navigator.vibrate?.([120, 60, 120]); } catch { /* Unsupported device. */ }
  if (typeof AudioContext === 'undefined') return;
  void (async () => {
    let context: AudioContext | undefined;
    try {
      context = new AudioContext();
      if (context.state !== 'running') return;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 660;
      gain.gain.setValueAtTime(0.08, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.2);
      oscillator.connect(gain); gain.connect(context.destination);
      await new Promise<void>(resolve => { oscillator.onended = () => resolve(); oscillator.start(); oscillator.stop(context!.currentTime + 0.2); });
    } catch { /* Browser permissions can block sound. */ }
    finally { await context?.close().catch(() => {}); }
  })();
};
