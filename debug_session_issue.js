// Debug script to identify session management issues
// Add this to your browser console when the error occurs

console.log('=== SESSION DEBUG ===');

// 1. Check current session
const checkSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  console.log('Current Session:', {
    exists: !!session,
    user: session?.user?.id,
    expiresAt: session ? new Date(session.expires_at * 1000) : null,
    isExpired: session ? Date.now() > session.expires_at * 1000 : true,
    accessToken: session?.access_token ? 'Present' : 'Missing',
    refreshToken: session?.refresh_token ? 'Present' : 'Missing'
  });
  return session;
};

// 2. Check current user
const checkUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  console.log('Current User:', {
    exists: !!user,
    id: user?.id,
    email: user?.email,
    error: error?.message
  });
  return user;
};

// 3. Test a simple authenticated request
const testAuthRequest = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    console.log('Auth Request Test:', {
      success: !error,
      error: error?.message,
      data: data?.length || 0
    });
  } catch (err) {
    console.log('Auth Request Test Failed:', err.message);
  }
};

// 4. Check if the issue is with RPC calls specifically
const testRPCRequest = async () => {
  try {
    // Test with a simple RPC call that doesn't require auth
    const { data, error } = await supabase.rpc('auth.uid');
    console.log('RPC Test:', {
      success: !error,
      error: error?.message,
      data: data
    });
  } catch (err) {
    console.log('RPC Test Failed:', err.message);
  }
};

// 5. Check localStorage for session data
const checkLocalStorage = () => {
  const sessionData = localStorage.getItem('sb-tfbwfcnjdmbqmoyljeys-auth-token');
  console.log('LocalStorage Session:', {
    exists: !!sessionData,
    data: sessionData ? JSON.parse(sessionData) : null
  });
};

// 6. Manual session refresh test
const testSessionRefresh = async () => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    console.log('Session Refresh:', {
      success: !error,
      error: error?.message,
      newSession: !!data.session,
      newUser: !!data.user
    });
    return data.session;
  } catch (err) {
    console.log('Session Refresh Failed:', err.message);
  }
};

// Run all checks
const runDiagnostics = async () => {
  console.log('Running session diagnostics...');
  
  await checkSession();
  await checkUser();
  await testAuthRequest();
  await testRPCRequest();
  checkLocalStorage();
  
  console.log('=== END DIAGNOSTICS ===');
};

// Run diagnostics
runDiagnostics();

// Export functions for manual testing
window.debugSession = {
  checkSession,
  checkUser,
  testAuthRequest,
  testRPCRequest,
  checkLocalStorage,
  testSessionRefresh,
  runDiagnostics
};

