const EMAILJS_ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';

function env(...names) {
  for (const name of names) {
    const value = String(process.env[name] || '').trim();
    if (value) return value;
  }
  return '';
}

function getEmailJsConfig() {
  return {
    serviceId: env('EMAILJS_SERVICE_ID', 'VITE_EMAILJS_SERVICE_ID'),
    publicKey: env('EMAILJS_PUBLIC_KEY', 'VITE_EMAILJS_PUBLIC_KEY'),
    applicationTemplateId: env('EMAILJS_PARTNER_APPLICATION_TEMPLATE_ID'),
    approvedTemplateId: env('EMAILJS_PARTNER_APPROVED_TEMPLATE_ID'),
  };
}

function adminRecipients() {
  return String(process.env.PARTNER_ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

async function sendEmailJs(templateId, templateParams) {
  const config = getEmailJsConfig();
  if (!config.serviceId || !config.publicKey || !templateId) {
    return { delivered: false, reason: 'not_configured' };
  }

  const response = await fetch(EMAILJS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: config.serviceId,
      template_id: templateId,
      user_id: config.publicKey,
      template_params: templateParams,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`EmailJS request failed (${response.status})${detail ? `: ${detail.slice(0, 300)}` : ''}`);
  }
  return { delivered: true };
}

export async function sendPartnerApplicationEmails(application, approvalUrl) {
  const recipients = adminRecipients();
  const templateId = getEmailJsConfig().applicationTemplateId;
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
  return {
    delivered: deliveredCount > 0,
    deliveredCount,
    failedCount: failed.length,
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
