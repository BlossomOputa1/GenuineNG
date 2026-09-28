export async function createProduct({ supabase, manufacturerId, name, category, nafdacNumber }) {
  const { data, error } = await supabase
    .from('products')
    .insert({ manufacturer_id: manufacturerId, name, category, nafdac_number: nafdacNumber })
    .select('id, manufacturer_id, name, category, nafdac_number, created_at, updated_at')
    .single();
  if (error) {
    const err = new Error('Failed to register product.');
    err.statusCode = 500;
    err.cause = error;
    throw err;
  }
  return data;
}

export async function updateProduct({ supabase, manufacturerId, productId, name, category, nafdacNumber }) {
  const { data, error } = await supabase
    .from('products')
    .update({ name, category, nafdac_number: nafdacNumber })
    .eq('id', productId)
    .eq('manufacturer_id', manufacturerId)
    .select('id, manufacturer_id, name, category, nafdac_number, created_at, updated_at')
    .maybeSingle();
  if (error) {
    const err = new Error('Failed to update product.');
    err.statusCode = 500;
    err.cause = error;
    throw err;
  }
  if (!data) {
    const err = new Error('Product not found.');
    err.statusCode = 404;
    err.code = 'PRODUCT_NOT_FOUND';
    throw err;
  }
  return data;
}

export async function getProductsForManufacturer({ supabase, manufacturerId }) {
  const { data, error } = await supabase.rpc('get_manufacturer_product_stats', {
    p_manufacturer_id: manufacturerId,
  });
  if (error) {
    const err = new Error('Failed to load products. Confirm the final GenuineNG schema has been applied.');
    err.statusCode = 500;
    err.cause = error;
    throw err;
  }
  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    category: row.category,
    nafdacNumber: row.nafdac_number,
    createdAt: row.created_at,
    batchCount: Number(row.batch_count || 0),
    codesIssued: Number(row.codes_issued || 0),
    scans: Number(row.scans || 0),
  }));
}
