import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export async function getSessionStrict(timeoutMs = 5000): Promise<Session> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session;

  // Wait for session restoration (page reloads, etc.)
  return new Promise((resolve, reject) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, sess) => {
      if (sess) {
        subscription.unsubscribe();
        resolve(sess);
      }
    });
    setTimeout(() => {
      subscription.unsubscribe();
      reject(new Error('No Supabase session — user not signed in'));
    }, timeoutMs);
  });
}