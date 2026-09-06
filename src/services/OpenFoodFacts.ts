import { Product } from '../types';

export const fetchProductByBarcode = async (barcode: string): Promise<Product | null> => {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    
    if (data.status !== 1 || !data.product) {
      return null;
    }

    const p = data.product;
    
    return {
      barcode: p.code || barcode,
      name: p.product_name || p.product_name_fr || 'Produit inconnu',
      imageUrl: p.image_front_url || p.image_url,
      ingredientsText: p.ingredients_text || p.ingredients_text_fr || '',
      allergensHierarchy: p.allergens_hierarchy || [],
      tracesTags: p.traces_tags || [],
    };
  } catch (error) {
    console.error('Error fetching OpenFoodFacts:', error);
    return null;
  }
};
