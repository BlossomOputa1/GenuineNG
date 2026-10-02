import { validateVerifyCodeInput } from '../validators/verifyCodeValidator.js';
import { verifySignature } from '../services/signer.js';
import { supabase } from '../config/supabaseClient.js';

function response(verdict, reason, extra = {}) {
  return {
    verdict, reason, signatureValid: extra.signatureValid ?? false,
    onlineVerified: true, unitStatus: extra.unitStatus || null,
    product: extra.product || null,
  };
}

export async function verifyCode(req, res, next) {
  try {
    const { valid, errors, data } = validateVerifyCodeInput(req.body);
    if (!valid) {
      return res.status(400).json({
        error: { code: 'INVALID_INPUT', message: 'Invalid scan data.', details: errors },
      });
    }
    const { payload, signature } = data;
    if (!verifySignature({ payload, signature })) {
      return res.json(response('not_genuine', 'The signature is invalid or this code was not issued by GenuineNG.'));
    }
    const { data: issuedUnit, error: lookupError } = await supabase.from('unit_codes')
      .select('unit_id, signature, payload, batches!inner(batch_code, products!inner(name, manufacturers!inner(company_name)))')
      .eq('unit_id', payload.unitId).maybeSingle();
    if (lookupError) throw lookupError;
    if (!issuedUnit || issuedUnit.signature !== signature) {
      return res.json(response('not_genuine', "This signed code was not found in GenuineNG's issuance records.", { signatureValid: true }));
    }
    const storedPayload = issuedUnit.payload || {};
    if (!['productId', 'batchId', 'unitId', 'unitIndex', 'keyVersion']
      .every((key) => String(storedPayload[key]) === String(payload[key]))) {
      return res.json(response('not_genuine', 'The QR data does not match the code originally issued.', { signatureValid: true }));
    }

    const product = {
      name: issuedUnit.batches?.products?.name || null,
      manufacturer: issuedUnit.batches?.products?.manufacturers?.company_name || null,
      batchCode: issuedUnit.batches?.batch_code || null,
    };
    const { data: scan, error: scanError } = await supabase.rpc('process_public_unit_scan', {
      p_unit_id: issuedUnit.unit_id,
    });
    if (scanError) throw scanError;
    if (scan?.verdict === 'genuine') {
      return res.json(response('genuine', 'This GenuineNG code is valid. It has now been marked as used.', {
        product, signatureValid: true, unitStatus: 'used',
      }));
    }
    if (scan?.verdict === 'already_used') {
      return res.json(response('already_used', 'This GenuineNG code has already been scanned. Ask the seller for an unopened product.', {
        product, signatureValid: true, unitStatus: 'used',
      }));
    }
    return res.json(response('not_genuine', 'This code has been deactivated.', {
      product, signatureValid: true, unitStatus: scan?.unitStatus || null,
    }));
  } catch (err) { next(err); }
}
