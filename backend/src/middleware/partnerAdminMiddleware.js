import { getConfiguredPartnerAdminEmails } from '../services/emailJsService.js';

export function partnerAdminMiddleware(req, res, next) {
  const allowed = getConfiguredPartnerAdminEmails();
  if (!allowed.length) {
    return res.status(503).json({
      error: {
        code: 'PARTNER_ADMIN_NOT_CONFIGURED',
        message: 'Partner approval admins are not configured yet.',
      },
    });
  }

  const email = String(req.user?.email || '').trim().toLowerCase();
  if (!email || !allowed.includes(email)) {
    return res.status(403).json({
      error: {
        code: 'PARTNER_ADMIN_REQUIRED',
        message: 'This account is not allowed to approve manufacturer applications.',
      },
    });
  }
  req.partnerAdminEmail = email;
  next();
}
