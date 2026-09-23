import { validateVerifyCodeInput } from '../validators/verifyCodeValidator.js';
import { verifySignature } from '../services/signer.js';
import { recordVerificationAndCheckReuse } from '../services/reuseDetector.js';
import { supabase } from '../config/supabaseClient.js';

export async function verifyCode(req, res, next) {
  try {
    const { valid, errors, data } = validateVerifyCodeInput(req.body);

    if (!valid) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid scan data.',
          details: errors,
        },
      });
    }

    const { payload, signature } = data;

    // 1. Cryptographic check first — never trust the DB lookup alone,
    //    since that would mean authenticity depends on someone finding
    //    the unitId, not on possessing a validly-signed code.
    const signatureValid = verifySignature({ payload, signature });

    if (!signatureValid) {
      // Not genuine — still log the attempt for visibility, but don't
      // run reuse detection on a code that was never valid to begin with.
      await supabase.from('verification_events').insert({
        unit_id: payload.unitId,
        was_online: true,
        result: 'invalid_signature',
      });

      return res.status(200).json({
        verdict: 'not_genuine',
        reason: "This code could not be verified against GenuineNG's records.",
        reuseCheck: 'unavailable',
      });
    }

    // 2. Confirm an issuance record actually exists for this unit —
    //    defense in depth beyond the signature check alone.
    const { data: issuedUnit, error: lookupError } = await supabase
      .from('unit_codes')
      .select('unit_id, signature')
      .eq('unit_id', payload.unitId)
      .maybeSingle();

    if (lookupError || !issuedUnit || issuedUnit.signature !== signature) {
      await supabase.from('verification_events').insert({
        unit_id: payload.unitId,
        was_online: true,
        result: 'not_found',
      });

      return res.status(200).json({
        verdict: 'not_genuine',
        reason: "This code could not be verified against GenuineNG's records.",
        reuseCheck: 'unavailable',
      });
    }

    // 3. Genuine — log this verification and get the reuse status.
    const reuseCheck = await recordVerificationAndCheckReuse({
      unitId: payload.unitId,
      result: 'genuine',
    });

    return res.status(200).json({
      verdict: 'genuine',
      reason: 'This code was issued by GenuineNG and has not been altered.',
      reuseCheck,
    });
  } catch (err) {
    next(err);
  }
}
