export function validatePartnerApplication(body) {
  const companyName = typeof body?.companyName === 'string' ? body.companyName.trim() : '';
  const contactPersonName = typeof body?.contactPersonName === 'string' ? body.contactPersonName.trim() : '';
  const businessEmail = typeof body?.businessEmail === 'string' ? body.businessEmail.trim().toLowerCase() : '';
  const phoneNumber = typeof body?.phoneNumber === 'string' ? body.phoneNumber.trim() : '';
  const errors = [];

  if (companyName.length < 2 || companyName.length > 160) errors.push('Company name must be between 2 and 160 characters.');
  if (contactPersonName.length < 2 || contactPersonName.length > 120) errors.push('Contact person name must be between 2 and 120 characters.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail) || businessEmail.length > 254) errors.push('Enter a valid business email.');
  if (phoneNumber.length < 7 || phoneNumber.length > 40) errors.push('Enter a valid phone number.');

  return {
    valid: errors.length === 0,
    errors,
    data: { companyName, contactPersonName, businessEmail, phoneNumber },
  };
}
