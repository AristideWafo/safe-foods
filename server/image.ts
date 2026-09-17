import { ApiError } from './errors.js';
import { ALLERGENS } from '../src/constants/allergens.js';

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const parseImage = (value: unknown) => {
  if (typeof value !== 'string') throw new ApiError(400, 'INVALID_IMAGE', 'Une image JPEG, PNG ou WebP est requise.');
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) throw new ApiError(400, 'INVALID_IMAGE', 'Le format de l’image est invalide.');
  const bytes = Buffer.from(match[2], 'base64');
  if (bytes.length > MAX_IMAGE_BYTES) throw new ApiError(413, 'IMAGE_TOO_LARGE', 'L’image doit peser moins de 4 Mo.');
  const valid = match[1] === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    : match[1] === 'image/jpeg' ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!valid) throw new ApiError(400, 'INVALID_IMAGE', 'Le contenu ne correspond pas au format de l’image.');
  return { data: match[2], mimeType: match[1] };
};

const allowedTags = new Set(ALLERGENS.flatMap(a => a.offTags).filter(tag => tag.startsWith('en:')));
export const parseAnalysis = (value: unknown) => {
  const unreadable = () => new ApiError(422, 'IMAGE_UNREADABLE', 'La liste complète des ingrédients n’est pas suffisamment lisible. Photographiez l’étiquette entière.', true);
  if (!value || typeof value !== 'object') throw unreadable();
  const data = value as Record<string, unknown>;
  if (typeof data.labelReadable !== 'boolean' || typeof data.ingredientsComplete !== 'boolean' || typeof data.ingredientsText !== 'string' || data.ingredientsText.length > 50000) throw unreadable();
  if (data.warningsText !== undefined && (typeof data.warningsText !== 'string' || data.warningsText.length > 50000)) throw unreadable();
  if (data.warningsComplete !== undefined && typeof data.warningsComplete !== 'boolean') throw unreadable();
  if (data.language !== undefined && (typeof data.language !== 'string' || data.language.length > 20)) throw unreadable();
  if (!data.ingredientsText.trim() && !(typeof data.warningsText === 'string' && data.warningsText.trim())) throw unreadable();
  const parseTags = (tags: unknown) => {
    if (!Array.isArray(tags) || tags.length > 100 || !tags.every(tag => typeof tag === 'string' && allowedTags.has(tag))) throw unreadable();
    return [...new Set(tags as string[])];
  };
  return {
    ingredientsText: data.ingredientsText.trim(), allergensHierarchy: parseTags(data.allergensHierarchy), tracesTags: parseTags(data.tracesTags),
    warningsText: typeof data.warningsText === 'string' ? data.warningsText.trim() : '',
    labelReadable: data.labelReadable, ingredientsComplete: data.ingredientsComplete,
    warningsComplete: data.warningsComplete === true, language: typeof data.language === 'string' ? data.language : undefined,
    labelVerified: false,
  };
};
