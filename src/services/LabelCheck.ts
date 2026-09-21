import type { AnalysisStatus, LabelCheck, LabelTruth } from '../types';

// Pure validation for the trial log. Kept free of browser globals so the store can import it.
export const LABEL_NOTE_MAX = 300;
export const LABEL_TRUTH_TEXT: Record<LabelTruth, string> = {
  no_allergen: 'Aucun de mes allergènes', has_allergen: 'Contient un de mes allergènes', unsure: 'Je ne sais pas',
};
export const LABEL_TRUTHS = Object.keys(LABEL_TRUTH_TEXT) as LabelTruth[];
// A Record makes the compiler reject a status added to the union but missed here.
const KNOWN_STATUSES: Record<AnalysisStatus, true> = { SAFE: true, AVOID: true, UNCERTAIN: true };

export const parseStatus = (value: unknown): AnalysisStatus | undefined =>
  typeof value === 'string' && Object.hasOwn(KNOWN_STATUSES, value) ? value as AnalysisStatus : undefined;

export const parseLabelCheck = (value: unknown): LabelCheck | undefined => {
  if (typeof value !== 'object' || value === null) return undefined;
  const { truth, note, at } = value as Record<string, unknown>;
  const parsed = LABEL_TRUTHS.find(item => item === truth);
  if (!parsed || typeof at !== 'number' || !Number.isFinite(at)) return undefined;
  const text = typeof note === 'string' ? note.trim().slice(0, LABEL_NOTE_MAX) : '';
  return { truth: parsed, ...(text ? { note: text } : {}), at };
};
