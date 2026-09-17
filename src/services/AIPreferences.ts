import { isRecord } from './ProductValidation';

export interface AIPreferences {
  photoAnalysis: boolean;
  autoSendPhotos: boolean;
  synonymSuggestions: boolean;
}
export const DEFAULT_AI_PREFERENCES: AIPreferences = { photoAnalysis: true, autoSendPhotos: false, synonymSuggestions: true };
export const parseAIPreferences = (value: unknown): AIPreferences => {
  const settings = isRecord(value) ? value : {};
  const photoAnalysis = typeof settings.photoAnalysis === 'boolean' ? settings.photoAnalysis : true;
  return {
    photoAnalysis,
    autoSendPhotos: photoAnalysis && settings.autoSendPhotos === true,
    synonymSuggestions: typeof settings.synonymSuggestions === 'boolean' ? settings.synonymSuggestions : true,
  };
};
export const photoConsentMode = (preferences: AIPreferences): 'disabled' | 'confirm' | 'send' =>
  !preferences.photoAnalysis ? 'disabled' : preferences.autoSendPhotos ? 'send' : 'confirm';
