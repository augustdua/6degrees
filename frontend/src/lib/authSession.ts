import { supabase } from './supabase';

/**
 * Gets the current session and throws an error if not authenticated
 */
export async function getSessionStrict() {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    throw new Error(`Session error: ${error.message}`);
  }
  
  if (!session) {
    throw new Error('You must be logged in to perform this action');
  }
  
  return session;
}

/**
 * Gets the current user and throws an error if not authenticated
 */
export async function getUserStrict() {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    throw new Error(`User error: ${error.message}`);
  }
  
  if (!user) {
    throw new Error('You must be logged in to perform this action');
  }
  
  return user;
}

/**
 * Checks if the user is authenticated without throwing
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  } catch {
    return false;
  }
}

/**
 * Gets the current session without throwing
 */
export async function getSessionSafe() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    return { session, error };
  } catch (error) {
    return { session: null, error };
  }
}