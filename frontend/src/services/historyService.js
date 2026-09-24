import { supabase, supabaseConfigured } from './supabase';
import { deriveCompletionState, verdictForChecks } from './resultModel';

const configuredBase = (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL)?.trim();
const API_BASE_URL = configuredBase || (import.meta.env.DEV ? 'http://localhost:4000' : 'https://genuineng.onrender.com');

const SESSION_ID = 'saved-checks';
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
  if (!response.ok) throw new Error(body?.error?.message || `Request failed (${response.status}).`);
  return body;
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
      expiryDate: scan.expiry_date || '',
    },
    submitted: {
      productName: scan.product_name || null,
      manufacturer: scan.manufacturer_text || null,
      registrationNumber: scan.registration_number || null,
      expiryDate: scan.expiry_date || null,
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

export async function listSessions() {
  const rows = await listScanRows();
  const metadata = getMetadata()[SESSION_ID] || {};
  return [{
    id: SESSION_ID,
    title: metadata.title || 'Saved product checks',
    pinned: Boolean(metadata.pinned),
    createdAt: rows.at(-1)?.created_at || null,
    updatedAt: rows[0]?.created_at || null,
    scanCount: rows.length,
  }];
}

export async function getSessionWithScans(_userId, sessionId) {
  if (sessionId !== SESSION_ID) return null;
  const rows = await listScanRows();
  const scans = await Promise.all(rows.map(row => getScan(row.id)));
  const metadata = getMetadata()[SESSION_ID] || {};
  return {
    id: SESSION_ID,
    title: metadata.title || 'Saved product checks',
    pinned: Boolean(metadata.pinned),
    createdAt: rows.at(-1)?.created_at || null,
    updatedAt: rows[0]?.created_at || null,
    scans: scans.map(scanToResult).sort((a, b) => new Date(a.checkedAt) - new Date(b.checkedAt)),
  };
}

export async function createSession(_userId, title = 'Saved product checks') {
  const metadata = getMetadata();
  metadata[SESSION_ID] = { ...(metadata[SESSION_ID] || {}), title };
  saveMetadata(metadata);
  return { id: SESSION_ID, title, pinned: false };
}

function toBackendScan(result) {
  return {
    matched_product_id: null,
    manufacturer_text: result.fields?.manufacturer || null,
    registration_number: result.fields?.registrationNumber || null,
    batch_number: null,
    expiry_date: result.submitted?.expiryDate || null,
    ingredients_text: null,
    result_summary: result.verdict ? { verdict: result.verdict } : null,
    checks: (result.checks || []).map(check => ({
      check_type: check.key,
      outcome: check.status,
      reason: check.reason || null,
      source_name: check.source || null,
    })),
  };
}

export async function saveScan(_userId, _sessionId, result, existingScanId = null) {
  const created = await request('/api/scans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toBackendScan(result)),
  });
  if (existingScanId && existingScanId !== created?.id) {
    await request(`/api/scans/${encodeURIComponent(existingScanId)}`, { method: 'DELETE' });
  }
  return created?.id;
}

export async function renameSession(_userId, sessionId, title) {
  if (sessionId !== SESSION_ID) return;
  const metadata = getMetadata();
  metadata[SESSION_ID] = { ...(metadata[SESSION_ID] || {}), title: title.trim().slice(0, 80) || 'Saved product checks' };
  saveMetadata(metadata);
}

export async function setSessionPinned(_userId, sessionId, pinned) {
  if (sessionId !== SESSION_ID) return;
  const metadata = getMetadata();
  metadata[SESSION_ID] = { ...(metadata[SESSION_ID] || {}), pinned };
  saveMetadata(metadata);
}

export async function deleteSession(_userId, sessionId) {
  if (sessionId !== SESSION_ID) return;
  const rows = await listScanRows();
  await Promise.all(rows.map(row => request(`/api/scans/${encodeURIComponent(row.id)}`, { method: 'DELETE' })));
}

export async function clearAllSessions(userId) {
  await deleteSession(userId, SESSION_ID);
}

export async function deleteScan(scanId) {
  await request(`/api/scans/${encodeURIComponent(scanId)}`, { method: 'DELETE' });
}
