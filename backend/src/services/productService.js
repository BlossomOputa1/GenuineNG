// Business logic only — no req/res, independently testable.
// Uses the caller's RLS-scoped Supabase client (req.supabase from
// authMiddleware.js), not a service-role client, so the insert RLS
// policy is the real authorization boundary here, not app code.

export async function createProduct({
  supabase,
  manufacturerId,
  name,
  category,
  nafdacNumber,
}) {
  const { data, error } = await supabase
    .from('products')
    .insert({
      manufacturer_id: manufacturerId,
      name,
      category,
      nafdac_number: nafdacNumber,
    })
    .select('id, manufacturer_id, name, category, nafdac_number, created_at')
    .single();

  if (error) {
    const err = new Error('Failed to register product.');
    err.statusCode = 500;
    err.cause = error;
    throw err;
  }

  return data;
}
