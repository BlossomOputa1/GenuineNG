const EMAILJS_ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';

function env(...names) {
  for (const name of names) {
    const value = String(process.env[name] || '').trim();
    if (value) return value;
  }
  return '';
}

function getEmailJsConfig() {
  const fallbackTemplate = env('VITE_EMAILJS_TEMPLATE_ID', 'EMAILJS_TEMPLATE_ID') || 'template_16rm1ox';
  return {
    serviceId: env('EMAILJS_SERVICE_ID', 'VITE_EMAILJS_SERVICE_ID'),
    publicKey: env('EMAILJS_PUBLIC_KEY', 'VITE_EMAILJS_PUBLIC_KEY'),
    accessToken: env('EMAILJS_PRIVATE_KEY', 'EMAILJS_ACCESS_TOKEN'),
    applicationTemplateId: env('EMAILJS_PARTNER_APPLICATION_TEMPLATE_ID') || fallbackTemplate,
    approvedTemplateId: env('EMAILJS_PARTNER_APPROVED_TEMPLATE_ID') || fallbackTemplate,
  };
}

function adminRecipients() {
  return String(process.env.PARTNER_ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function getRequestHeaders() {
  const origin = process.env.PUBLIC_APP_URL || process.env.FRONTEND_ORIGIN?.split(',')[0] || 'https://genuine-ng.vercel.app';
  return {
    'Content-Type': 'application/json',
    'Origin': origin,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) GenuineNG/1.0',
  };
}

async function sendEmailJs(templateId, templateParams) {
  const config = getEmailJsConfig();
  if (!config.serviceId || !config.publicKey || !templateId) {
    return { delivered: false, reason: 'not_configured' };
  }

  const payload = {
    service_id: config.serviceId,
    template_id: templateId,
    user_id: config.publicKey,
    template_params: templateParams,
  };

  if (config.accessToken) {
    payload.accessToken = config.accessToken;
  }

  const response = await fetch(EMAILJS_ENDPOINT, {
    method: 'POST',
    headers: getRequestHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    // If the template was not found, attempt fallback to working template if different
    const fallbackTemplate = 'template_16rm1ox';
    if (response.status === 400 && detail.includes('template ID not found') && templateId !== fallbackTemplate) {
      console.warn(`EmailJS template ${templateId} not found, falling back to ${fallbackTemplate}`);
      payload.template_id = fallbackTemplate;
      const retryResponse = await fetch(EMAILJS_ENDPOINT, {
        method: 'POST',
        headers: getRequestHeaders(),
        body: JSON.stringify(payload),
      });
      if (retryResponse.ok) return { delivered: true, reason: 'fallback_template' };
    }
    throw new Error(`EmailJS request failed (${response.status})${detail ? `: ${detail.slice(0, 300)}` : ''}`);
  }
  return { delivered: true, reason: 'ok' };
}

export async function sendPartnerApplicationEmails(application, approvalUrl) {
  const recipients = adminRecipients();
  const config = getEmailJsConfig();
  const templateId = config.applicationTemplateId;

  // Architecture rule: ONLY configured admin emails receive the approval_url.
  // The applicant's business_email MUST NEVER receive the approval token/link.
  if (!recipients.length || !templateId) {
    return { delivered: false, deliveredCount: 0, failedCount: 0, reason: 'not_configured' };
  }

  const results = await Promise.allSettled(recipients.map((toEmail) => sendEmailJs(templateId, {
    to_email: toEmail,
    company_name: application.company_name,
    contact_person_name: application.contact_person_name,
    business_email: application.business_email,
    phone_number: application.phone_number,
    application_id: application.id,
    submitted_at: application.created_at,
    approval_url: approvalUrl,
    status: 'pending',
  })));

  const deliveredCount = results.filter((result) => result.status === 'fulfilled' && result.value?.delivered).length;
  const failed = results.filter((result) => result.status === 'rejected');
  for (const result of failed) {
    console.error('Partner application EmailJS notification failed:', result.reason?.message || result.reason);
  }
  const usedFallback = results.some(
    (result) => result.status === 'fulfilled' && result.value?.reason === 'fallback_template',
  );
  let reason = 'ok';
  if (deliveredCount === 0) reason = 'send_failed';
  else if (failed.length > 0) reason = 'partial';
  else if (usedFallback) reason = 'fallback_template';
  return {
    delivered: deliveredCount > 0,
    deliveredCount,
    failedCount: failed.length,
    reason,
  };
}

export async function sendPartnerApprovedEmail({ businessEmail, contactPersonName, companyName, manufacturerPortalUrl }) {
  const templateId = getEmailJsConfig().approvedTemplateId;
  try {
    return await sendEmailJs(templateId, {
      to_email: businessEmail,
      company_name: companyName,
      contact_person_name: contactPersonName,
      manufacturer_portal_url: manufacturerPortalUrl,
      approved_at: new Date().toISOString(),
      status: 'approved',
      approval_status: 'approved',
    });
  } catch (error) {
    console.error('Partner approval EmailJS notification failed:', error?.message || error);
    return { delivered: false, reason: 'send_failed' };
  }
}

export function getConfiguredPartnerAdminEmails() {
  return adminRecipients();
}

export function getEmailJsStatus() {
  const config = getEmailJsConfig();
  const admins = adminRecipients();
  const applicationTemplateExplicit = Boolean(
    String(process.env.EMAILJS_PARTNER_APPLICATION_TEMPLATE_ID || '').trim(),
  );
  const approvedTemplateExplicit = Boolean(
    String(process.env.EMAILJS_PARTNER_APPROVED_TEMPLATE_ID || '').trim(),
  );
  return {
    configured: Boolean(config.serviceId && config.publicKey && admins.length && config.applicationTemplateId),
    serviceConfigured: Boolean(config.serviceId && config.publicKey),
    accessTokenConfigured: Boolean(config.accessToken),
    adminCount: admins.length,
    applicationTemplateConfigured: Boolean(config.applicationTemplateId),
    approvedTemplateConfigured: Boolean(config.approvedTemplateId),
    usingSharedFallbackTemplate:
      !applicationTemplateExplicit || !approvedTemplateExplicit,
    publicAppUrl: String(process.env.PUBLIC_APP_URL || '').trim(),
  };
}

export function logEmailJsConfigWarnings() {
  const status = getEmailJsStatus();
  if (!status.adminCount) {
    console.warn('EmailJS warning: PARTNER_ADMIN_EMAILS is empty — partner applications will save but no admin email will be sent.');
  }
  if (!status.serviceConfigured) {
    console.warn('EmailJS warning: EMAILJS_SERVICE_ID / EMAILJS_PUBLIC_KEY missing — email delivery disabled (reason: not_configured).');
  }
  if (!status.accessTokenConfigured) {
    console.warn('EmailJS warning: EMAILJS_PRIVATE_KEY (or EMAILJS_ACCESS_TOKEN) missing — server-side sends may be rejected with 401/403.');
  }
  if (status.usingSharedFallbackTemplate) {
    console.warn('EmailJS warning: EMAILJS_PARTNER_APPLICATION_TEMPLATE_ID / EMAILJS_PARTNER_APPROVED_TEMPLATE_ID not both set — application and approval emails share one fallback template and may render wrong params.');
  }
  if (!status.publicAppUrl) {
    console.warn('EmailJS warning: PUBLIC_APP_URL missing — approval links fall back to FRONTEND_ORIGIN or localhost; set one canonical URL.');
  }
}
