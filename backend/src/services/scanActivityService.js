export async function getScanActivity({ supabase, manufacturerId }) {
  const { data, error } = await supabase.rpc('get_manufacturer_scan_activity', {
    p_manufacturer_id: manufacturerId,
  });
  if (error) {
    const err = new Error('Failed to load scan activity. Confirm the final GenuineNG schema has been applied.');
    err.statusCode = 500;
    err.cause = error;
    throw err;
  }
  const batches = (data || []).map((row) => ({
    batchId: row.batch_id,
    batchCode: row.batch_code,
    productName: row.product_name,
    unitsGenerated: Number(row.units_generated || 0),
    totalScans: Number(row.total_scans || 0),
    publicScans: Number(row.public_scans || 0),
    manufacturerScans: Number(row.manufacturer_scans || 0),
    genuineScans: Number(row.genuine_scans || 0),
    notGenuineScans: Number(row.not_genuine_scans || 0),
    reuseSignals: Number(row.reuse_signals || 0),
    revokedUnits: Number(row.revoked_units || 0),
  }));
  return {
    totalUnitsGenerated: batches.reduce((sum, item) => sum + item.unitsGenerated, 0),
    totalScans: batches.reduce((sum, item) => sum + item.totalScans, 0),
    totalPublicScans: batches.reduce((sum, item) => sum + item.publicScans, 0),
    revokedUnits: batches.reduce((sum, item) => sum + item.revokedUnits, 0),
    batches,
  };
}
