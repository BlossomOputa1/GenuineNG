import { supabase, supabaseConfigured } from './supabase';
import { deriveCompletionState, verdictForChecks } from './resultModel';

const configuredBase = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL)?.trim();
const API_BASE_URL = configuredBase || (import.meta.env.DEV ? 'http://localhost:4000' : 'https://genuineng.onrender.com');

const METADATA_KEY = 'genuineng.scan-history.metadata';

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

function getMetadata() {
  try { return JSON.parse(localStorage.getItem(METADATA_KEY) || '{}'); } catch { return {}; }
}

function saveMetadata(metadata) {
  localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
}

async function request(path, options = {}) {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.error?.message || `Request failed (${response.status}).`);
    error.code = body?.error?.code || `HTTP_${response.status}`;
    error.status = response.status;
    throw error;
  }
  return body;
}

async function sessionQuery(userId, sessionId = null) {
  const client = requireSupabase();
  let query = client
    .from('scan_sessions')
    .select('id,title,pinned,created_at,updated_at')
    .eq('user_id', userId)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false });
  if (sessionId) query = query.eq('id', sessionId).maybeSingle();
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

function checksFromBackend(checks = []) {
  return checks
    .filter(check => (check.check_key || check.check_type) === 'registration' || (check.check_key || check.check_type) === 'expiry')
    .map(check => ({
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
    warnings: checks.filter(item => item.status === 'warning'),
    verdict: scan.result_summary?.verdict || scan.result_summary || verdictForChecks(checks),
    stored: true,
  };
}

async function listScanRows() {
  const body = await request('/api/scans?limit=50');
  return body?.data || [];
}

async function getScan(id) {
  return request(`/api/scans/${encodeURIComponent(id)}`);
}

export async function listSessions(userId) {
  const client = requireSupabase();
  const { data: sessions, error } = await client
    .from('scan_sessions')
    .select('id,title,pinned,created_at,updated_at,scans(id)')
    .eq('user_id', userId)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (sessions || []).map((session) => ({
    id: session.id,
    title: session.title,
    pinned: session.pinned,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    scanCount: session.scans?.length || 0,
  }));
}

export async function getSessionWithScans(userId, sessionId) {
  const session = await sessionQuery(userId, sessionId);
  if (!session) return null;
  const rows = (await listScanRows()).filter((row) => row.session_id === sessionId);
  const scans = await Promise.all(rows.map(row => getScan(row.id)));
  return {
    id: session.id,
    title: session.title,
    pinned: session.pinned,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    scans: scans.map(scanToResult).sort((a, b) => new Date(a.checkedAt) - new Date(b.checkedAt)),
  };
}

export async function createSession(userId, title = 'Saved product checks') {
  const client = requireSupabase();
  const { data, error } = await client
    .from('scan_sessions')
    .insert({ user_id: userId, title })
    .select('id,title,pinned,created_at,updated_at')
    .single();
  if (error) throw error;
  return data;
}

function toBackendScan(sessionId, result) {
  return {
    session_id: sessionId,
    product_name: result.fields?.productName || null,
    manufacturer: result.fields?.manufacturer || null,
    manufacturer_text: result.fields?.manufacturer || null,
    registration_number: result.fields?.registrationNumber || null,
    batch_number: null,
    expiry_printed: result.fields?.expiryDate || null,
    expiry_normalized: result.submitted?.expiryDate || null,
    result_summary: result.verdict ? { verdict: result.verdict } : null,
    checks: (result.checks || []).map(check => ({
      check_type: check.key,
      outcome: check.status,
      reason: check.reason || null,
      source_name: check.source || null,
    })),
  };
}

export async function saveScan(_userId, sessionId, result, existingScanId = null) {
  const created = await request('/api/scans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toBackendScan(sessionId, result)),
  });
  if (existingScanId && existingScanId !== created?.id) {
    await request(`/api/scans/${encodeURIComponent(existingScanId)}`, { method: 'DELETE' });
  }
  return created?.id;
}

export async function renameSession(userId, sessionId, title) {
  const client = requireSupabase();
  const { error } = await client.from('scan_sessions').update({ title: title.trim().slice(0, 80) || 'Saved product checks' }).eq('id', sessionId).eq('user_id', userId);
  if (error) throw error;
}

export async function setSessionPinned(userId, sessionId, pinned) {
  const client = requireSupabase();
  const { error } = await client.from('scan_sessions').update({ pinned }).eq('id', sessionId).eq('user_id', userId);
  if (error) throw error;
}

export async function deleteSession(userId, sessionId) {
  const rows = (await listScanRows()).filter((row) => row.session_id === sessionId);
  await Promise.all(rows.map(row => request(`/api/scans/${encodeURIComponent(row.id)}`, { method: 'DELETE' })));
  const client = requireSupabase();
  const { error } = await client.from('scan_sessions').delete().eq('id', sessionId).eq('user_id', userId);
  if (error) throw error;
}

export async function clearAllSessions(userId) {
  await deleteSession(userId, SESSION_ID);
}

export async function deleteScan(scanId) {
  await request(`/api/scans/${encodeURIComponent(scanId)}`, { method: 'DELETE' });
}
