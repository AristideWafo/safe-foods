import { isRecord, parseProduct } from './ProductValidation';
import type { Product } from '../types';
export const preparePhoto = async (file: File): Promise<string> => {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choisissez une image JPEG, PNG ou WebP.');
  if (file.size > 20 * 1024 * 1024) throw new Error('La photo originale doit peser moins de 20 Mo.');
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error('Cette photo est illisible. Choisissez un autre fichier.'); });
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 60000000) throw new Error('Les dimensions de cette image sont trop grandes.');
    const ratio = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.round(bitmap.width * ratio); canvas.height = Math.round(bitmap.height * ratio);
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Impossible de préparer la photo.');
    ctx.fillStyle = 'white'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  } finally { bitmap.close(); }
};
export const analyzePhoto = async (imageBase64: string, signal: AbortSignal): Promise<Product> => {
  const response = await fetch('/api/analyze-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64, consent: true }), signal });
  const data: unknown = await response.json().catch(() => { throw new Error('Le service photo a renvoyé une réponse illisible.'); });
  if (!response.ok) throw new Error(isRecord(data) && isRecord(data.error) && typeof data.error.message === 'string' ? data.error.message : 'Analyse photo indisponible.');
  if (!isRecord(data)) throw new Error('Les données de la photo sont invalides.');
  const product = parseProduct({ ...data, barcode: 'SCAN_OCR', name: 'Produit (analyse photo)' });
  if (!product || !product.ingredientsText.trim()) throw new Error('Les ingrédients sont illisibles. Reprenez une photo nette de toute la liste.');
  return product;
};
