import { validateVerifyCodeInput } from '../validators/verifyCodeValidator.js';
import { verifySignature } from '../services/signer.js';
import { supabase } from '../config/supabaseClient.js';

function notGenuine(reason, extra = {}) {
  return {
    verdict: 'not_genuine',
    reason,
    reuseStatus: extra.reuseStatus || 'unavailable',
    reuseCheck: extra.reuseStatus || 'unavailable',
    publicScanNumber: extra.publicScanNumber ?? null,
    unitStatus: extra.unitStatus || null,
    signatureValid: extra.signatureValid ?? false,
    onlineVerified: true,
    actorType: extra.actorType || 'public',
    product: extra.product || null,
  };
}

function genuine(reason, extra = {}) {
  return {
    verdict: 'genuine',
    reason,
    reuseStatus: extra.reuseStatus || 'unavailable',
    reuseCheck: extra.reuseStatus || 'unavailable',
    publicScanNumber: extra.publicScanNumber ?? null,
    unitStatus: extra.unitStatus || 'active',
    signatureValid: true,
    onlineVerified: true,
    actorType: extra.actorType || 'public',
    product: extra.product || null,
  };
}

async function approvedManufacturerForUser(userId) {
  if (!userId) return null;
  const { data } = await supabase
    .from('manufacturers')
    .select('id, approved')
    .eq('user_id', userId)
    .eq('approved', true)
    .maybeSingle();
  return data || null;
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
      return res.status(200).json(
        notGenuine('The cryptographic signature is invalid or the code was not issued by GenuineNG.')
      );
    }

    const { data: issuedUnit, error: lookupError } = await supabase
      .from('unit_codes')
      .select(
        'unit_id, signature, status, public_scan_count, revoked_reason, payload, batch_id, batches!inner(batch_code, expiry_date, products!inner(id, name, manufacturer_id, manufacturers!inner(id, company_name)))'
      )
      .eq('unit_id', payload.unitId)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (!issuedUnit || issuedUnit.signature !== signature) {
      return res.status(200).json(
        notGenuine("This signed code could not be confirmed in GenuineNG's issuance records.", {
          signatureValid: true,
        })
      );
    }

    const storedPayload = issuedUnit.payload || {};
    const payloadMatches = ['productId', 'batchId', 'unitId', 'unitIndex', 'keyVersion']
      .every((key) => String(storedPayload[key]) === String(payload[key]));
    if (!payloadMatches) {
      return res.status(200).json(
        notGenuine('The QR data does not match the unit originally issued by GenuineNG.', {
          signatureValid: true,
        })
      );
    }

    const productRecord = issuedUnit.batches?.products;
    const manufacturerRecord = productRecord?.manufacturers;
    const product = {
      name: productRecord?.name || null,
      manufacturer: manufacturerRecord?.company_name || null,
      batchCode: issuedUnit.batches?.batch_code || null,
      batchExpiryDate: issuedUnit.batches?.expiry_date || null,
      unitId: issuedUnit.unit_id,
    };

    const callerManufacturer = await approvedManufacturerForUser(req.user?.id);
    const isOwningManufacturer = Boolean(
      callerManufacturer?.id && callerManufacturer.id === productRecord?.manufacturer_id
    );

    let eventResult;
    if (isOwningManufacturer) {
      const { data: rpcData, error: rpcError } = await supabase.rpc('record_manufacturer_unit_scan', {
        p_unit_id: issuedUnit.unit_id,
        p_manufacturer_id: callerManufacturer.id,
      });
      if (rpcError) throw rpcError;
      eventResult = rpcData;
    } else {
      const { data: rpcData, error: rpcError } = await supabase.rpc('process_public_unit_scan', {
        p_unit_id: issuedUnit.unit_id,
      });
      if (rpcError) throw rpcError;
      eventResult = rpcData;
    }

    const actorType = isOwningManufacturer ? 'manufacturer' : 'public';
    const reuseStatus = eventResult?.reuseStatus || 'unavailable';
    const publicScanNumber = eventResult?.publicScanNumber ?? null;
    const unitStatus = eventResult?.unitStatus || issuedUnit.status;

    if (eventResult?.verdict === 'not_genuine') {
      return res.status(200).json(
        notGenuine('This unit code has been deactivated and is no longer valid for public verification.', {
          reuseStatus,
          publicScanNumber,
          unitStatus,
          signatureValid: true,
          actorType,
          product,
        })
      );
    }

    let reason = 'This is a valid, active GenuineNG unit code.';
    if (reuseStatus === 'previously_scanned') {
      reason = 'This is a valid GenuineNG code, but this unit has been scanned before.';
    } else if (reuseStatus === 'reuse_limit_reached') {
      reason = 'This code is genuine. The public reuse limit has now been reached, so this specific unit code has been deactivated for future scans.';
    } else if (reuseStatus === 'manufacturer_check') {
      reason = 'This GenuineNG code was verified by its approved manufacturer. Manufacturer checks do not count toward the public reuse limit.';
    }

    return res.status(200).json(
      genuine(reason, {
        reuseStatus,
        publicScanNumber,
        unitStatus,
        actorType,
        product,
      })
    );
  } catch (err) {
    next(err);
  }
}
