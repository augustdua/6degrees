// Frontend fix for target claim approval authentication
// Add this to your useTargetClaims.ts file

const approveClaim = async (claimId: string) => {
  if (!user) throw new Error('User not authenticated');

  try {
    // Ensure we have a valid session before making the request
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      throw new Error(`Authentication error: ${sessionError.message}`);
    }

    if (!session) {
      throw new Error('No active session. Please sign in again.');
    }

    // Additional check: verify the session is still valid
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !currentUser) {
      throw new Error('Session expired. Please sign in again.');
    }

    console.log('Approve claim session check:', {
      hasSession: !!session,
      userId: session.user?.id,
      currentUserId: currentUser.id,
      expectedUserId: user.id,
      sessionExpiresAt: new Date(session.expires_at * 1000),
      isExpired: Date.now() > session.expires_at * 1000
    });

    // Check if session is expired
    if (Date.now() > session.expires_at * 1000) {
      throw new Error('Session expired. Please sign in again.');
    }

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

    // Refresh claims
    await fetchClaimsForMyRequests();
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to approve claim';
    setError(errorMessage);
    throw err;
  }
};

// Alternative: Add a session refresh before the RPC call
const approveClaimWithRefresh = async (claimId: string) => {
  if (!user) throw new Error('User not authenticated');

  try {
    // Refresh the session before making the RPC call
    const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      throw new Error(`Session refresh failed: ${refreshError.message}`);
    }

    if (!session) {
      throw new Error('No active session after refresh. Please sign in again.');
    }

    console.log('Session refreshed for claim approval:', {
      userId: session.user?.id,
      expiresAt: new Date(session.expires_at * 1000)
    });

    const { error } = await supabase.rpc('approve_target_claim', {
      claim_uuid: claimId
    });

    if (error) {
      console.error('Approve claim RPC error:', error);
      throw error;
    }

    // Refresh claims
    await fetchClaimsForMyRequests();
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to approve claim';
    setError(errorMessage);
    throw err;
  }
};

