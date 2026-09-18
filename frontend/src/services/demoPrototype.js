const AUTH_KEY = 'genuineng.demo.auth.v1';
const HISTORY_KEY = 'genuineng.demo.history.v1';

export const demoUser = {
  id: 'demo-evaare-ugbor',
  name: 'Evaare Ugbor',
  email: 'evaare@genuineng.demo'
};

export const demoExtractedFields = {
  productName: 'GenuineNG Demo Paracetamol 500mg',
  manufacturer: 'Demo Health Nigeria Ltd.',
  registrationNumber: 'A1-0000',
  batchNumber: 'GN-2409-A',
  expiryDate: '12/2027',
  ingredients: 'Paracetamol 500mg, maize starch, povidone, magnesium stearate.'
};

const clone = value => JSON.parse(JSON.stringify(value));

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Demo storage is best-effort only.
  }
}

export function restoreDemoSession() {
  const saved = readJson(AUTH_KEY, null);
  return saved?.user?.id === demoUser.id ? saved : null;
}

export function createDemoSession() {
  const session = {
    user: clone(demoUser),
    signedInAt: new Date().toISOString(),
    isDemo: true
  };
  writeJson(AUTH_KEY, session);
  return session;
}

export function clearDemoSession() {
  try {
    localStorage.removeItem(AUTH_KEY);
  } catch {
    // Ignore storage failures in the prototype.
  }
}

export function listDemoThreads() {
  const value = readJson(HISTORY_KEY, []);
  return Array.isArray(value)
    ? value
        .filter(item => item && item.id)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    : [];
}

function saveThreads(threads) {
  writeJson(HISTORY_KEY, threads);
  return threads;
}

export function createDemoThread(firstScan) {
  const now = new Date().toISOString();
  const thread = {
    id: crypto.randomUUID(),
    title: firstScan?.fields?.productName || 'New product check',
    createdAt: now,
    updatedAt: now,
    scans: firstScan ? [clone(firstScan)] : []
  };
  const threads = listDemoThreads();
  saveThreads([thread, ...threads]);
  return clone(thread);
}

export function appendDemoScan(threadId, scan) {
  const threads = listDemoThreads();
  const now = new Date().toISOString();
  const next = threads.map(thread => {
    if (thread.id !== threadId) return thread;
    const scans = [...(thread.scans || []), clone(scan)];
    return {
      ...thread,
      title: thread.title === 'New product check' && scan?.fields?.productName
        ? scan.fields.productName
        : thread.title,
      updatedAt: now,
      scans
    };
  });
  saveThreads(next);
  return clone(next.find(thread => thread.id === threadId) || null);
}


export function updateDemoScan(threadId, scanId, scan) {
  const threads = listDemoThreads();
  const now = new Date().toISOString();
  const next = threads.map(thread => {
    if (thread.id !== threadId) return thread;
    const scans = (thread.scans || []).map(item => item.id === scanId ? clone(scan) : item);
    return { ...thread, updatedAt: now, scans };
  });
  saveThreads(next);
  return clone(next.find(thread => thread.id === threadId) || null);
}

export function getDemoThread(threadId) {
  return clone(listDemoThreads().find(thread => thread.id === threadId) || null);
}

export function deleteDemoThread(threadId) {
  const next = listDemoThreads().filter(thread => thread.id !== threadId);
  saveThreads(next);
  return next;
}

export function clearDemoHistory() {
  saveThreads([]);
}

export function makeDemoResult(fields) {
  const checkedAt = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    checkedAt,
    score: 86,
    scoreLabel: 'Demo genuineness signal',
    fields: clone(fields),
    checks: [
      {
        key: 'registration',
        title: 'Registration record',
        status: 'match',
        value: 'Demo match',
        detail: 'The registration number matches the prototype reference record.'
      },
      {
        key: 'expiry',
        title: 'Expiry date',
        status: 'match',
        value: 'Within date',
        detail: 'The printed expiry date is later than the demo check date.'
      },
      {
        key: 'recall',
        title: 'Batch recall',
        status: 'match',
        value: 'No demo recall',
        detail: 'This prototype batch is not present in the demo recall fixture.'
      },
      {
        key: 'ingredients',
        title: 'Ingredient flags',
        status: 'match',
        value: 'No demo flag',
        detail: 'No ingredient in this prototype fixture is marked as flagged.'
      }
    ],
    recommendations: [
      'Compare the manufacturer and batch details with the physical pack before relying on this result.',
      'Do not use a product with a broken seal, altered print, or packaging that looks tampered with.',
      'When the live backend is connected, run the check again for current registration and recall records.'
    ],
    coverage: 'Frontend demo result only. It does not verify the contents of a sealed product and it is not a real authenticity verdict.',
    isDemo: true
  };
}

export function formatDemoResultForClipboard(result) {
  if (!result) return '';
  const f = result.fields || {};
  const checks = (result.checks || [])
    .map(check => `${check.title}: ${check.value || check.status}`)
    .join('\n');
  const recommendations = (result.recommendations || [])
    .map((item, index) => `${index + 1}. ${item}`)
    .join('\n');

  return [
    'GenuineNG demo product check',
    `Product: ${f.productName || 'Not provided'}`,
    `Manufacturer: ${f.manufacturer || 'Not provided'}`,
    `NAFDAC number: ${f.registrationNumber || 'Not provided'}`,
    `Batch: ${f.batchNumber || 'Not provided'}`,
    `Expiry: ${f.expiryDate || 'Not provided'}`,
    '',
    `Demo genuineness signal: ${result.score}%`,
    checks,
    '',
    'Recommendations:',
    recommendations,
    '',
    'Frontend demo only — not a real authenticity verdict.'
  ].join('\n');
}
