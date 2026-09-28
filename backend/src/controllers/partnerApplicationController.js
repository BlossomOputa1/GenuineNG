import { supabase } from '../config/supabaseClient.js';
import { validatePartnerApplication } from '../validators/partnerApplicationValidator.js';
import {
  buildPartnerApprovalUrl,
  generatePartnerApprovalToken,
  getPartnerApprovalExpiry,
  getPublicAppUrl,
  hashPartnerApprovalToken,
} from '../services/partnerApprovalService.js';
import {
  sendPartnerApplicationEmails,
  sendPartnerApprovedEmail,
} from '../services/emailJsService.js';

function apiError(res, status, code, message, details) {
  return res.status(status).json({ error: { code, message, ...(details ? { details } : {}) } });
}

function normalizeToken(value) {
  const token = typeof value === 'string' ? value.trim() : '';
  return token.length >= 32 && token.length <= 256 ? token : '';
}

async function findApplicationByToken(token) {
  const tokenHash = hashPartnerApprovalToken(token);
  if (!tokenHash) return { application: null, tokenHash: '' };
  const { data, error } = await supabase
    .from('manufacturer_applications')
    .select('id, company_name, contact_person_name, business_email, phone_number, status, reviewed_at, manufacturer_id, approval_token_expires_at, approval_token_used_at, created_at')
    .eq('approval_token_hash', tokenHash)
    .maybeSingle();
  if (error) throw error;
  return { application: data, tokenHash };
}

export async function submitPartnerApplication(req, res, next) {
  try {
    const { valid, errors, data } = validatePartnerApplication(req.body);
    if (!valid) {
      return apiError(res, 400, 'INVALID_INPUT', 'Check the application details.', errors);
    }

    const approvalToken = generatePartnerApprovalToken();
    const approvalTokenHash = hashPartnerApprovalToken(approvalToken);
    const approvalTokenExpiresAt = getPartnerApprovalExpiry();

    const { data: application, error } = await supabase
      .from('manufacturer_applications')
      .insert({
        company_name: data.companyName,
        contact_person_name: data.contactPersonName,
        business_email: data.businessEmail,
        phone_number: data.phoneNumber,
        approval_token_hash: approvalTokenHash,
        approval_token_expires_at: approvalTokenExpiresAt,
      })
      .select('id, company_name, contact_person_name, business_email, phone_number, status, created_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return apiError(res, 409, 'APPLICATION_ALREADY_PENDING', 'An application for this business email is already pending review.');
      }
      throw error;
    }

    const approvalUrl = buildPartnerApprovalUrl(approvalToken);
    let emailDelivery = { delivered: false, deliveredCount: 0, failedCount: 0, reason: 'send_failed' };
    try {
      emailDelivery = await sendPartnerApplicationEmails(application, approvalUrl);
    } catch (emailError) {
      console.error('Partner application EmailJS delivery failed:', emailError?.message || emailError);
    }

    return res.status(201).json({
      application: { id: application.id, status: application.status, submittedAt: application.created_at },
      notificationQueued: true,
      adminEmailDelivered: Boolean(emailDelivery.delivered),
    });
  } catch (err) {
    next(err);
  }
}

export async function reviewPartnerApplication(req, res, next) {
  try {
    const token = normalizeToken(req.query.token);
    if (!token) return apiError(res, 400, 'INVALID_APPROVAL_LINK', 'This approval link is invalid.');

    const { application } = await findApplicationByToken(token);
    if (!application) return apiError(res, 404, 'APPLICATION_NOT_FOUND', 'This partner application could not be found.');

    const expired = application.approval_token_expires_at
      ? new Date(application.approval_token_expires_at).getTime() < Date.now()
      : true;

    return res.json({
      application: {
        id: application.id,
        companyName: application.company_name,
        contactPersonName: application.contact_person_name,
        businessEmail: application.business_email,
        phoneNumber: application.phone_number,
        status: application.status,
        submittedAt: application.created_at,
        reviewedAt: application.reviewed_at,
      },
      approval: {
        expired,
        used: Boolean(application.approval_token_used_at),
        canApprove: application.status === 'pending' && !expired && !application.approval_token_used_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function approvePartnerApplication(req, res, next) {
  try {
    const token = normalizeToken(req.body?.token);
    if (!token) return apiError(res, 400, 'INVALID_APPROVAL_LINK', 'This approval link is invalid.');

    const { application, tokenHash } = await findApplicationByToken(token);
    if (!application) return apiError(res, 404, 'APPLICATION_NOT_FOUND', 'This partner application could not be found.');

    if (application.status === 'approved') {
      return res.json({
        approved: true,
        alreadyApproved: true,
        application: {
          id: application.id,
          companyName: application.company_name,
          contactPersonName: application.contact_person_name,
          businessEmail: application.business_email,
        },
        manufacturerId: application.manufacturer_id,
        applicantEmailDelivered: null,
      });
    }

    if (application.status !== 'pending') {
      return apiError(res, 409, 'APPLICATION_NOT_PENDING', `This application is already ${application.status}.`);
    }

    if (!application.approval_token_expires_at || new Date(application.approval_token_expires_at).getTime() < Date.now()) {
      return apiError(res, 410, 'APPROVAL_LINK_EXPIRED', 'This approval link has expired.');
    }

    if (application.approval_token_used_at) {
      return apiError(res, 409, 'APPROVAL_LINK_USED', 'This approval link has already been used.');
    }

    const { data: approvedRows, error } = await supabase.rpc('approve_manufacturer_application_by_token', {
      p_token_hash: tokenHash,
    });

    if (error) {
      const message = String(error.message || '');
      if (message.includes('NO_AUTH_USER')) {
        return apiError(
          res,
          409,
          'ACCOUNT_REQUIRED',
          `No GenuineNG account exists for ${application.business_email}. Ask the applicant to create an account with that exact email, then use this approval link again.`,
        );
      }
      if (message.includes('APPROVAL_TOKEN_EXPIRED')) {
        return apiError(res, 410, 'APPROVAL_LINK_EXPIRED', 'This approval link has expired.');
      }
      if (message.includes('APPLICATION_NOT_PENDING')) {
        return apiError(res, 409, 'APPLICATION_NOT_PENDING', 'This application is no longer pending.');
      }
      throw error;
    }

    const approved = Array.isArray(approvedRows) ? approvedRows[0] : approvedRows;
    if (!approved?.manufacturer_id) {
      throw new Error('Manufacturer approval completed without returning a manufacturer record.');
    }

    const manufacturerPortalUrl = `${getPublicAppUrl()}/manufacturer`;
    const emailDelivery = await sendPartnerApprovedEmail({
      businessEmail: approved.business_email,
      contactPersonName: approved.contact_person_name,
      companyName: approved.company_name,
      manufacturerPortalUrl,
    });

    return res.json({
      approved: true,
      alreadyApproved: false,
      application: {
        id: approved.application_id,
        companyName: approved.company_name,
        contactPersonName: approved.contact_person_name,
        businessEmail: approved.business_email,
      },
      manufacturerId: approved.manufacturer_id,
      applicantEmailDelivered: Boolean(emailDelivery?.delivered),
      notificationCreated: true,
      approvedBy: req.partnerAdminEmail,
    });
  } catch (err) {
    next(err);
  }
}
