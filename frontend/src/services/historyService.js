import { supabase, supabaseConfigured } from './supabase';
import { deriveCompletionState, verdictForChecks } from './resultModel';

const configuredBase = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL)?.trim();
const API_BASE_URL = configuredBase || (import.meta.env.DEV ? 'http://localhost:4000' : 'https://genuineng.onrender.com');

function requireSupabase() {
  if (!supabaseConfigured || !supabase) throw new Error('Supabase is not configured.');
  return supabase;
}

async function authHeaders() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();
  if (error || !data?.session?.access_token) throw new Error('You need to be signed in to access scan history.');
  return { Authorization: `Bearer ${data.session.access_token}` };
}

async function request(path, options = {}) {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.error?.message || `Request failed (${response.status}).`);
    error.code = body?.error?.code || `HTTP_${response.status}`;
    error.status = response.status;
    throw error;
  }
  return body;
}

function checksFromBackend(checks = []) {
  return checks
    .filter((check) => ['registration', 'expiry'].includes(check.check_key || check.check_type))
    .map((check) => ({
      key: check.check_key || check.check_type,
      title: (check.check_key || check.check_type) === 'registration' ? 'Registration record' : 'Expiry date',
      status: check.status || check.outcome,
      reason: check.reason,
      source: check.source || check.source_name,
      checkedAt: check.checked_at || check.source_last_checked_at,
    }))
    .sort((a, b) => ['registration', 'expiry'].indexOf(a.key) - ['registration', 'expiry'].indexOf(b.key));
}

function scanToResult(scan) {
  const checks = checksFromBackend(scan.checks);
  const completion = deriveCompletionState(checks);
  return {
    id: scan.id,
    type: 'registry_label',
    checkedAt: scan.checked_at || scan.created_at,
    fields: {
      productName: scan.product_name || '',
      manufacturer: scan.manufacturer_text || '',
      registrationNumber: scan.registration_number || '',
      expiryDate: scan.expiry_printed || scan.expiry_normalized || '',
    },
    submitted: {
      productName: scan.product_name || null,
      manufacturer: scan.manufacturer_text || null,
      registrationNumber: scan.registration_number || null,
      expiryDate: scan.expiry_normalized || null,
    },
    checks,
    completion,
    completedChecks: completion.completed,
    totalChecks: completion.total,
    hasWarning: completion.hasWarning,
    warnings: checks.filter((item) => item.status === 'warning'),
    verdict: scan.result_summary?.verdict || verdictForChecks(checks),
    stored: true,
  };
}

function codeScanToResult(scan) {
  return {
    id: scan.id,
    type: 'genuine_code',
    checkedAt: scan.checked_at || scan.created_at,
    payload: scan.payload,
    signature: scan.signature,
    signatureValid: scan.signature_valid,
    onlineVerified: scan.online_verified,
    verdict: scan.verdict,
    reason: scan.reason,
    reuseStatus: scan.reuse_status,
    reuseCheck: scan.reuse_status,
    publicScanNumber: scan.public_scan_number,
    unitStatus: scan.unit_status,
    product: {
      name: scan.product_name,
      manufacturer: scan.manufacturer_name,
      batchCode: scan.batch_code,
      unitId: scan.unit_id,
    },
    stored: true,
  };
}

async function listLabelRows(sessionId) {
  const query = new URLSearchParams({ limit: '50', session_id: sessionId, include: 'checks' });
  const body = await request(`/api/scans?${query.toString()}`);
  return body?.data || [];
}

export async function listSessions(userId) {
  const client = requireSupabase();
  const { data: sessions, error } = await client
    .from('scan_sessions')
    .select('id,title,pinned,mode,created_at,updated_at,scans(id),code_scans(id)')
    .eq('user_id', userId)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (sessions || []).map((session) => ({
    id: session.id,
    title: session.title,
    pinned: session.pinned,
    mode: session.mode,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    scanCount: (session.scans?.length || 0) + (session.code_scans?.length || 0),
  }));
}

export async function getSessionWithScans(userId, sessionId) {
  const client = requireSupabase();
  const { data: session, error } = await client
    .from('scan_sessions')
    .select('id,title,pinned,mode,created_at,updated_at')
    .eq('user_id', userId)
    .eq('id', sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!session) return null;

  let scans = [];
  if (session.mode === 'genuine_code') {
    const { data, error: scanError } = await client
      .from('code_scans')
      .select('id,unit_id,payload,signature,signature_valid,online_verified,verdict,reuse_status,public_scan_number,unit_status,reason,product_name,manufacturer_name,batch_code,checked_at,created_at')
      .eq('user_id', userId)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (scanError) throw scanError;
    scans = (data || []).map(codeScanToResult);
  } else {
    scans = (await listLabelRows(sessionId)).map(scanToResult).sort((a, b) => new Date(a.checkedAt) - new Date(b.checkedAt));
  }

  return {
    id: session.id,
    title: session.title,
    pinned: session.pinned,
    mode: session.mode,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    scans,
  };
}

function toBackendScan(sessionId, result, existingScanId = null) {
  return {
    session_id: sessionId || null,
    title: result.fields?.productName || 'New product check',
    existing_scan_id: existingScanId,
    product_name: result.fields?.productName || null,
    manufacturer_text: result.fields?.manufacturer || null,
    registration_number: result.fields?.registrationNumber || null,
    expiry_printed: result.fields?.expiryDate || null,
    expiry_normalized: result.submitted?.expiryDate || null,
    checked_at: result.checkedAt || null,
    result_summary: result.verdict ? { verdict: result.verdict } : null,
    checks: (result.checks || []).map((check) => ({
      check_key: check.key,
      status: check.status,
      reason: check.reason || '',
      source: check.source || null,
      checked_at: check.checkedAt || null,
    })),
  };
}

export async function saveScan(_userId, sessionId, result, existingScanId = null) {
  const created = await request('/api/scans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toBackendScan(sessionId, result, existingScanId)),
  });
  return { scanId: created?.id, sessionId: created?.session_id };
}

export async function saveCodeScan(_userId, sessionId, result) {
  const client = requireSupabase();
  const title = `${result.product?.name || 'Product'} - GenuineNG code`;
  const { data, error } = await client.rpc('save_code_scan', {
    p_session_id: sessionId || null,
    p_title: title,
    p_code: {
      unit_id: result.product?.unitId || result.payload?.unitId || null,
      payload: result.payload || {},
      signature: result.signature || '',
      signature_valid: Boolean(result.signatureValid),
      online_verified: result.onlineVerified !== false,
      verdict: result.verdict,
      reuse_status: result.reuseStatus || result.reuseCheck || 'unavailable',
      public_scan_number: result.publicScanNumber ?? null,
      unit_status: result.unitStatus || null,
      reason: result.reason || null,
      product_name: result.product?.name || null,
      manufacturer_name: result.product?.manufacturer || null,
      batch_code: result.product?.batchCode || null,
      checked_at: result.checkedAt || new Date().toISOString(),
    },
  });
  if (error) throw error;
  return { scanId: data?.scanId, sessionId: data?.sessionId };
}

export async function renameSession(userId, sessionId, title) {
  const client = requireSupabase();
  const { error } = await client.from('scan_sessions').update({ title: title.trim().slice(0, 80) || 'Saved checks' }).eq('id', sessionId).eq('user_id', userId);
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
