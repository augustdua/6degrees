import { supabase } from './supabase';
import { getSessionStrict } from './authSession';

type Participant = {
  userid: string;       // MUST be a UUID string; RLS casts to uuid
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: 'creator' | 'invitee' | string;
  joinedAt?: string;
  rewardAmount?: number;
};

type ChainRow = {
  id: string;
  request_id: string;
  participants: Participant[];
  total_reward: number;
  status: 'active' | 'completed' | string;
};

export async function createOrJoinChain(requestId: string, defaults?: {
  totalReward?: number;
  role?: Participant['role'];
}) {
  const session = await getSessionStrict();
  const uid = session.user.id;

  // 1) Read safely (no 406)
  const { data: chain, error: loadErr } = await supabase
    .from('chains')
    .select('id, request_id, participants, total_reward, status')
    .eq('request_id', requestId)
    .maybeSingle();
  if (loadErr) throw loadErr;

  // 2) If no chain, create it (INSERT policy: participants must include you)
  if (!chain) {
    const payload = {
      request_id: requestId,
      participants: [{
        userid: uid,
        email: session.user.email ?? undefined,
        role: defaults?.role ?? 'creator',
        joinedAt: new Date().toISOString(),
        rewardAmount: 0,
      }],
      total_reward: defaults?.totalReward ?? 1000,
      status: 'active' as const,
    };

    const { data: created, error: insErr } = await supabase
      .from('chains')
      .insert(payload)
      .select()
      .single(); // now valid because we expect 1 row back
    if (insErr) {
      console.error('Create chain failed', insErr);
      throw insErr;
    }
    return created as ChainRow;
  }

  // 3) If exists, join if not already a participant
  const participants = Array.isArray(chain.participants) ? chain.participants : [];
  if (participants.some(p => p?.userid === uid)) return chain as ChainRow;

  const updatedParticipants: Participant[] = [
    ...participants,
    {
      userid: uid,
      email: session.user.email ?? undefined,
      role: defaults?.role ?? 'invitee',
      joinedAt: new Date().toISOString(),
      rewardAmount: 0,
    }
  ];

  const { data: joined, error: updErr } = await supabase
    .from('chains')
    .update({ participants: updatedParticipants })
    .eq('id', chain.id)
    .select()
    .single(); // expect updated row
  if (updErr) {
    console.error('Join chain failed', updErr);
    throw updErr;
  }
  return joined as ChainRow;
}

export function explainSupabaseError(err: any) {
  // 406 (PGRST116): "single object requested, but no rows"
  if (err?.code === 'PGRST116') return 'Chain not found yet.';
  // 42501: insufficient_privilege (RLS)
  if (err?.code === '42501') return 'Not authorized to modify this chain.';
  return err?.message ?? 'Unexpected error';
}