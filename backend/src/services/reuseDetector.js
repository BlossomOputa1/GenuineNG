// Deliberately simple, per the plan — not advanced fraud detection.
// Flags "possible reuse" if this unitId has ever been verified before.
// Service-role client: this is called from the public, unauthenticated
// verify-code route, so there's no auth.uid() for RLS to key off.

import { supabase } from '../config/supabaseClient.js';

export async function recordVerificationAndCheckReuse({ unitId, result }) {
  const { count, error: countError } = await supabase
    .from('verification_events')
    .select('id', { count: 'exact', head: true })
    .eq('unit_id', unitId);

  // Reuse data being unavailable must never block the headline verdict —
  // the two outcomes are independent, per the plan's core rule.
  if (countError) {
    // Still attempt to log this event even if the count check failed.
    await supabase.from('verification_events').insert({
      unit_id: unitId,
      was_online: true,
      result,
      reuse_status: 'unavailable',
    });
    return 'unavailable';
  }

  const reuseStatus = count > 0 ? 'possible_reuse' : 'no_unusual_activity';

  const { error: insertError } = await supabase
    .from('verification_events')
    .insert({
      unit_id: unitId,
      was_online: true,
      result,
      reuse_status: reuseStatus,
    });

  if (insertError) {
    return 'unavailable';
  }

  return reuseStatus;
}
