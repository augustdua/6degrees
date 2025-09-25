// Fix for session management issues in target claim approval
// Add this to your useTargetClaims.ts file

const approveClaim = async (claimId: string) => {
  if (!user) throw new Error('User not authenticated');

  try {
    // Step 1: Check current session
    let { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Session check error:', sessionError);
      throw new Error(`Session error: ${sessionError.message}`);
    }

    // Step 2: If no session or expired, try to refresh
    if (!session || Date.now() > session.expires_at * 1000) {
      console.log('Session missing or expired, attempting refresh...');
      
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('Session refresh error:', refreshError);
        throw new Error(`Session refresh failed: ${refreshError.message}. Please sign in again.`);
      }
      
      session = refreshData.session;
      
      if (!session) {
        throw new Error('No session available after refresh. Please sign in again.');
      }
    }

    // Step 3: Verify user is still authenticated
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !currentUser) {
      console.error('User verification error:', userError);
      throw new Error('User verification failed. Please sign in again.');
    }

    // Step 4: Double-check session is valid
    if (!session.access_token) {
      throw new Error('No access token available. Please sign in again.');
    }

    console.log('Session validation successful:', {
      userId: currentUser.id,
      sessionExpiresAt: new Date(session.expires_at * 1000),
      hasAccessToken: !!session.access_token
    });

    // Step 5: Make the RPC call
    const { error } = await supabase.rpc('approve_target_claim', {
      claim_uuid: claimId
    });

    if (error) {
      console.error('Approve claim RPC error:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    // Step 6: Refresh claims
    await fetchClaimsForMyRequests();
    
    console.log('Target claim approved successfully');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to approve claim';
    setError(errorMessage);
    throw err;
  }
};

// Alternative: Force session refresh before any RPC call
const approveClaimWithForceRefresh = async (claimId: string) => {
  if (!user) throw new Error('User not authenticated');

  try {
    // Force refresh session before RPC call
    console.log('Forcing session refresh...');
    const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      throw new Error(`Session refresh failed: ${refreshError.message}`);
    }

    if (!session) {
      throw new Error('No session available after refresh');
    }

    console.log('Session refreshed successfully:', {
      userId: session.user.id,
      expiresAt: new Date(session.expires_at * 1000)
    });

    const { error } = await supabase.rpc('approve_target_claim', {
      claim_uuid: claimId
    });

    if (error) {
      console.error('Approve claim RPC error:', error);
      throw error;
    }

    await fetchClaimsForMyRequests();
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to approve claim';
    setError(errorMessage);
    throw err;
  }
};

// Enhanced session check utility
const ensureAuthenticatedSession = async () => {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    throw new Error(`Session error: ${sessionError.message}`);
  }

  if (!session) {
    throw new Error('No active session. Please sign in.');
  }

  if (Date.now() > session.expires_at * 1000) {
    console.log('Session expired, refreshing...');
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError || !refreshData.session) {
      throw new Error('Session refresh failed. Please sign in again.');
    }
    
    return refreshData.session;
  }

  return session;
};

