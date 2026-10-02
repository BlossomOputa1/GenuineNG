export async function getScanActivity({ supabase, manufacturerId }) {
  const { data, error } = await supabase.rpc('get_manufacturer_scan_activity', {
    p_manufacturer_id: manufacturerId,
  });
  if (error) {
    const err = new Error('Failed to load scan activity. Apply the latest GenuineNG migration.');
    err.statusCode = 500;
    err.cause = error;
    throw err;
  }
  const batches = (data || []).map((row) => ({
    batchId: row.batch_id,
    batchCode: row.batch_code,
    productName: row.product_name,
    totalScans: Number(row.total_scans || 0),
  }));
  return {
    totalScans: batches.reduce((sum, item) => sum + item.totalScans, 0),
    batches,
  };
}
