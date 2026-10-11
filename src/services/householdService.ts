import { supabase } from '../lib/supabase';
import type { Household, Member, UnclaimedParent } from '../types/domain';

/** The parents who have joined, in the order they joined. */
/** The household of the signed-in parent (the only one visible), or null before joining. */
export async function getOwnHousehold(): Promise<Household | null> {
  const { data, error } = await supabase.from('households').select('*').limit(1).maybeSingle();
  if (error !== null) {
    throw new Error(error.message);
  }
  return data;
}

export async function listMembers(): Promise<Member[]> {
  const { data, error } = await supabase.from('members').select('*').order('created_at');
  if (error !== null) {
    throw new Error(error.message);
  }
  return data;
}

export async function createHousehold(householdName: string, parentName: string): Promise<void> {
  const { error } = await supabase.rpc('create_household', {
    p_household_name: householdName,
    p_parent_name: parentName,
  });
  if (error !== null) {
    throw new Error(error.message);
  }
}

/**
 * Joins with the invite code. With `parentEntityId`, the parent takes over a parent
 * entity created for them before they joined; otherwise a new one is opened.
 */
export async function joinHousehold(
  inviteCode: string,
  parentName: string,
  parentEntityId: string | null,
): Promise<void> {
  const { error } = await supabase.rpc(
    'join_household',
    parentEntityId === null
      ? { p_invite_code: inviteCode, p_parent_name: parentName }
      : { p_invite_code: inviteCode, p_parent_name: parentName, p_parent_entity_id: parentEntityId },
  );
  if (error !== null) {
    throw new Error(error.message);
  }
}

/** Parent entities of the household that no parent has joined as yet. */
export async function listUnclaimedParents(inviteCode: string): Promise<UnclaimedParent[]> {
  const { data, error } = await supabase.rpc('unclaimed_parents', { p_invite_code: inviteCode });
  if (error !== null) {
    throw new Error(error.message);
  }
  return data;
}
