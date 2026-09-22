// backend/src/middleware/manufacturerAuthMiddleware.js
//
// Extends authMiddleware.js: runs AFTER it in the route chain, so
// req.user.id and req.supabase (the request-scoped, RLS-respecting
// client) are already set. This middleware adds one check on top —
// that the authenticated user is an approved manufacturer — and
// attaches the manufacturer record for downstream controllers.
//
// Route usage: router.post('/products', authMiddleware, manufacturerAuthMiddleware, controller)

export async function manufacturerAuthMiddleware(req, res, next) {
  if (!req.user?.id || !req.supabase) {
    // Defensive only — indicates authMiddleware wasn't run first,
    // which is a wiring bug, not a client-facing auth failure.
    console.error(
      'manufacturerAuthMiddleware called without req.user/req.supabase.'
    );
    return res.status(500).json({
      error: {
        code: 'AUTH_CONFIG_ERROR',
        message: 'Authentication is not configured correctly.',
      },
    });
  }

  const { data, error } = await req.supabase
    .from('manufacturers')
    .select('id, company_name, approved, approved_at')
    .eq('user_id', req.user.id)
    .maybeSingle();

  if (error) {
    console.error('manufacturerAuthMiddleware lookup failed:', error.message);
    return res.status(500).json({
      error: {
        code: 'MANUFACTURER_LOOKUP_FAILED',
        message: 'Could not verify manufacturer status.',
      },
    });
  }

  if (!data) {
    return res.status(403).json({
      error: {
        code: 'NOT_A_MANUFACTURER',
        message: 'This account does not have a manufacturer profile.',
      },
    });
  }

  if (!data.approved) {
    return res.status(403).json({
      error: {
        code: 'MANUFACTURER_NOT_APPROVED',
        message: 'This manufacturer account is pending approval.',
      },
    });
  }

  // Attach only what downstream controllers need — never req.user again,
  // that's already set by authMiddleware.
  req.manufacturer = {
    id: data.id,
    companyName: data.company_name,
    approvedAt: data.approved_at,
  };

  next();
}
