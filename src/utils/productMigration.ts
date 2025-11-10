import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PRODUCTS_DATA = [
  { name: 'ADUKU', variants: ['100G', '20G', '250G', '500G'] },
  { name: 'DAKSHIN', variants: ['250G', '30G'] },
  { name: 'KADAK GOLD', variants: ['1KG', '250G', '40G', '500G'] },
  { name: 'KADAK PYALI ADARAK', variants: ['250', '250G', '40G'] },
  { name: 'KADAK PYALI BLUE', variants: ['100G', '1KG', '20G', '250G', '40G', '500G'] },
  { name: 'KADAK PYALI ELACHI', variants: ['250G', '40G'] },
  { name: 'KADAK PYALI RL JAR', variants: ['1KG', '250G', '500G'] },
  { name: 'KADAK PYALI RL POUCH', variants: ['250G'] },
  { name: 'KADAK PYALI YELLOW', variants: ['100G', '1KG', '20G', '250G', '40G', '500G'] },
  { name: 'VAYU', variants: ['250G', '30G'] },
];

const getUnitFromVariant = (variant: string): string => {
  if (variant.includes('KG')) return 'kg';
  return 'grams';
};

export const migrateProducts = async () => {
  try {
    toast.loading('Starting product migration...');
    
    // Step 1: Delete all existing products (cascades to variants and schemes)
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
    
    if (deleteError) throw deleteError;
    
    // Step 2: Get or create default category
    let { data: categories, error: catError } = await supabase
      .from('product_categories')
      .select('id')
      .limit(1)
      .single();
    
    if (catError && catError.code !== 'PGRST116') throw catError;
    
    let categoryId = categories?.id;
    
    if (!categoryId) {
      const { data: newCat, error: newCatError } = await supabase
        .from('product_categories')
        .insert({ name: 'General', description: 'General category' })
        .select('id')
        .single();
      
      if (newCatError) throw newCatError;
      categoryId = newCat.id;
    }
    
    // Step 3: Insert products and their variants
    for (const product of PRODUCTS_DATA) {
      // Insert product
      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({
          name: product.name,
          sku: '', // Keep SKU blank as requested
          category_id: categoryId,
          rate: 0,
          unit: 'grams',
          closing_stock: 0,
          is_active: true,
        })
        .select('id')
        .single();
      
      if (productError) {
        console.error(`Error inserting product ${product.name}:`, productError);
        continue;
      }
      
      // Insert variants for this product
      const variantsToInsert = product.variants.map(variant => ({
        product_id: newProduct.id,
        variant_name: variant,
        sku: '', // Keep SKU blank as requested
        price: 0,
        stock_quantity: 0,
        is_active: true,
      }));
      
      const { error: variantsError } = await supabase
        .from('product_variants')
        .insert(variantsToInsert);
      
      if (variantsError) {
        console.error(`Error inserting variants for ${product.name}:`, variantsError);
      }
    }
    
    toast.dismiss();
    toast.success('Product migration completed successfully!');
    return true;
  } catch (error) {
    toast.dismiss();
    console.error('Migration error:', error);
    toast.error('Failed to migrate products. Check console for details.');
    return false;
  }
};
