import { supabase, supabaseConfigured } from './supabase';

function requireSupabase() {
  if (!supabaseConfigured || !supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

function scanRowToResult(scan) {
  const checks = (scan.scan_checks || [])
    .map(check => ({
      key: check.check_key,
      title: check.check_key === 'registration' ? 'Registration record' : check.check_key === 'expiry' ? 'Expiry date' : check.check_key === 'recall' ? 'Batch recall' : check.check_key === 'ingredients' ? 'Ingredient flags' : check.check_key,
      status: check.status,
      reason: check.reason,
      source: check.source,
      coverageNote: check.coverage_note,
      checkedAt: check.checked_at,
    }))
    .sort((a, b) => ['registration', 'expiry', 'recall', 'ingredients'].indexOf(a.key) - ['registration', 'expiry', 'recall', 'ingredients'].indexOf(b.key));

  return {
    id: scan.id,
    checkedAt: scan.checked_at,
    fields: {
      productName: scan.product_name || '',
      manufacturer: scan.manufacturer || '',
      registrationNumber: scan.registration_number || '',
      batchNumber: scan.batch_number || '',
      expiryDate: scan.expiry_printed || '',
      ingredients: (scan.ingredients || []).join(', '),
    },
    checks,
    verificationScore: scan.verification_score,
    scoreBand: scan.score_band,
    matchedChecks: checks.filter(item => item.status === 'match').length,
    totalChecks: checks.length,
    hasWarning: checks.some(item => item.status === 'warning'),
    warnings: checks.filter(item => item.status === 'warning'),
    recommendation: scan.recommendation,
    limitation: scan.limitation,
    dataset: scan.dataset_meta,
    stored: true,
  };
}

export async function listSessions(userId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('scan_sessions')
    .select('id,title,pinned,created_at,updated_at,scans(id)')
    .eq('user_id', userId)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(item => ({
    id: item.id,
    title: item.title,
    pinned: item.pinned,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    scanCount: item.scans?.length || 0,
  }));
}

export async function getSessionWithScans(userId, sessionId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('scan_sessions')
    .select(`
      id,title,pinned,created_at,updated_at,
      scans(
        id,user_id,product_name,manufacturer,registration_number,batch_number,
        expiry_printed,expiry_normalized,ingredients,verification_score,score_band,
        recommendation,limitation,dataset_meta,checked_at,created_at,updated_at,
        scan_checks(id,check_key,status,reason,source,coverage_note,checked_at)
      )
    `)
    .eq('user_id', userId)
    .eq('id', sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    title: data.title,
    pinned: data.pinned,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    scans: (data.scans || [])
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .map(scanRowToResult),
  };
}

export async function createSession(userId, title = 'New product check') {
  const client = requireSupabase();
  const { data, error } = await client
    .from('scan_sessions')
    .insert({ user_id: userId, title })
    .select('id,title,pinned,created_at,updated_at')
    .single();
  if (error) throw error;
  return data;
}

async function writeChecks(client, userId, scanId, checks) {
  if (!checks?.length) return;
  const rows = checks.map(check => ({
    scan_id: scanId,
    user_id: userId,
    check_key: check.key,
    status: check.status,
    reason: check.reason,
    source: check.source || null,
    coverage_note: check.coverageNote || null,
    checked_at: check.checkedAt || new Date().toISOString(),
  }));
  const { error } = await client.from('scan_checks').upsert(rows, { onConflict: 'scan_id,check_key' });
  if (error) throw error;
}

export async function saveScan(userId, sessionId, result, existingScanId = null) {
  const client = requireSupabase();
  const row = {
    session_id: sessionId,
    user_id: userId,
    product_name: result.fields?.productName || null,
    manufacturer: result.fields?.manufacturer || null,
    registration_number: result.fields?.registrationNumber || null,
    batch_number: result.fields?.batchNumber || null,
    expiry_printed: result.fields?.expiryDate || null,
    expiry_normalized: result.submitted?.expiryDate || null,
    ingredients: result.submitted?.ingredients || [],
    verification_score: result.verificationScore,
    score_band: result.scoreBand,
    recommendation: result.recommendation,
    limitation: result.limitation,
    dataset_meta: result.dataset || null,
    checked_at: result.checkedAt || new Date().toISOString(),
  };

  let scan;
  if (existingScanId) {
    const { data, error } = await client
      .from('scans')
      .update(row)
      .eq('id', existingScanId)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) throw error;
    scan = data;
  } else {
    const { data, error } = await client.from('scans').insert(row).select('*').single();
    if (error) throw error;
    scan = data;
  }

  await writeChecks(client, userId, scan.id, result.checks);
  await client.from('scan_sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessionId).eq('user_id', userId);
  return scan.id;
}

export async function renameSession(userId, sessionId, title) {
  const client = requireSupabase();
  const clean = title.trim().slice(0, 80) || 'Product check';
  const { error } = await client.from('scan_sessions').update({ title: clean }).eq('id', sessionId).eq('user_id', userId);
  if (error) throw error;
}

export async function setSessionPinned(userId, sessionId, pinned) {
  const client = requireSupabase();
  const { error } = await client.from('scan_sessions').update({ pinned }).eq('id', sessionId).eq('user_id', userId);
  if (error) throw error;
}

export async function deleteSession(userId, sessionId) {
  const client = requireSupabase();
  const { error } = await client.from('scan_sessions').delete().eq('id', sessionId).eq('user_id', userId);
  if (error) throw error;
}

export async function clearAllSessions(userId) {
  const client = requireSupabase();
  const { error } = await client.from('scan_sessions').delete().eq('user_id', userId);
  if (error) throw error;
}
