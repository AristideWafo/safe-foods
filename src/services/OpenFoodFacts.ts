import type { Product } from '../types';
import { isValidBarcode } from './Barcode';
import { isRecord, parseProduct } from './ProductValidation';
export class ProductFetchError extends Error {
  constructor(public code: 'INVALID_BARCODE' | 'NETWORK' | 'TIMEOUT' | 'RATE_LIMITED' | 'INVALID_DATA' | 'UNAVAILABLE', message: string) { super(message); }
}
export const fetchProductByBarcode = async (barcode: string, signal?: AbortSignal): Promise<Product | null> => {
  if (!isValidBarcode(barcode)) throw new ProductFetchError('INVALID_BARCODE', 'Code-barres invalide. Vérifiez les chiffres et la clé de contrôle.');
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 15000);
  try {
    const fields = 'code,product_name_fr,product_name,brands,quantity,ingredients_text_fr,ingredients_text,allergens_hierarchy,traces_tags,image_front_url,last_modified_t,lang,traces';
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${fields}`, { signal: controller.signal });
    if (response.status === 404) return null;
    if (response.status === 429) throw new ProductFetchError('RATE_LIMITED', 'Open Food Facts reçoit trop de demandes. Réessayez dans quelques minutes.');
    if (!response.ok) throw new ProductFetchError('UNAVAILABLE', 'Open Food Facts est indisponible. Réessayez ou photographiez les ingrédients.');
    const data: unknown = await response.json();
    if (!isRecord(data)) throw new ProductFetchError('INVALID_DATA', 'Les données reçues sont invalides. Vérifiez l’étiquette.');
    if (data.status === 0) return null;
    if (data.status !== 1 || !isRecord(data.product)) throw new ProductFetchError('INVALID_DATA', 'La fiche produit reçue est invalide.');
    const p = data.product;
    const result = parseProduct({
      barcode, name: p.product_name_fr || p.product_name || 'Produit inconnu',
      brand: p.brands, quantity: p.quantity,
      imageUrl: p.image_front_url, ingredientsText: p.ingredients_text_fr || p.ingredients_text || '',
      allergensHierarchy: p.allergens_hierarchy, tracesTags: p.traces_tags,
      language: p.ingredients_text_fr ? 'fr' : p.lang,
      source: 'openfoodfacts', fetchedAt: Date.now(), updatedAt: typeof p.last_modified_t === 'number' ? p.last_modified_t * 1000 : undefined,
    });
    if (!result) throw new ProductFetchError('INVALID_DATA', 'Les ingrédients ou les allergènes reçus sont invalides. Vérifiez l’étiquette.');
    return result;
  } catch (error) {
    if (signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
    if (timedOut) throw new ProductFetchError('TIMEOUT', 'La recherche prend trop de temps. Vérifiez votre connexion et réessayez.');
    if (error instanceof ProductFetchError) throw error;
    if (error instanceof SyntaxError) throw new ProductFetchError('INVALID_DATA', 'La réponse reçue est illisible. Réessayez.');
    throw new ProductFetchError('NETWORK', 'Impossible de contacter Open Food Facts. Vérifiez votre connexion.');
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
};
