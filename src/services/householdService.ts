import { supabase } from '../lib/supabase';
import type { Household, Member, MemberRole } from '../types/domain';

const roleOrder = {
  household: 0,
  parent: 1,
  child: 2,
} as const satisfies Record<MemberRole, number>;

export async function getMemberByUserId(userId: string): Promise<Member | null> {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error !== null) {
    throw new Error(error.message);
  }
  return data;
}

export async function getHousehold(householdId: string): Promise<Household> {
  const { data, error } = await supabase
    .from('households')
    .select('*')
    .eq('id', householdId)
    .single();
  if (error !== null) {
    throw new Error(error.message);
  }
  return data;
}

/** The house first, then parents, then children. */
export async function listMembers(): Promise<Member[]> {
  const { data, error } = await supabase.from('members').select('*').order('created_at');
  if (error !== null) {
    throw new Error(error.message);
  }
  return [...data].sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);
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

export async function joinHousehold(inviteCode: string, parentName: string): Promise<void> {
  const { error } = await supabase.rpc('join_household', {
    p_invite_code: inviteCode,
    p_parent_name: parentName,
  });
  if (error !== null) {
    throw new Error(error.message);
  }
}

export async function addChild(householdId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('members')
    .insert({ household_id: householdId, name, role: 'child' });
  if (error !== null) {
    throw new Error(error.message);
  }
}
