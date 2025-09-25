// Frontend debugging script for target_claims authentication issue
// Add this to your browser console while on the page where the error occurs

console.log('=== TARGET CLAIMS AUTH DEBUG ===');

// Check Supabase client configuration
console.log('Supabase URL:', window.supabase?.supabaseUrl);
console.log('Supabase Anon Key:', window.supabase?.supabaseKey?.substring(0, 20) + '...');

// Check current session
window.supabase?.auth.getSession().then(({ data: { session }, error }) => {
  console.log('Current Session:', session);
  console.log('Session Error:', error);
  
  if (session) {
    console.log('User ID:', session.user.id);
    console.log('Access Token:', session.access_token?.substring(0, 20) + '...');
    console.log('Token Expires:', new Date(session.expires_at * 1000));
    console.log('Is Token Expired:', Date.now() > session.expires_at * 1000);
  }
});

// Check auth state
window.supabase?.auth.getUser().then(({ data: { user }, error }) => {
  console.log('Current User:', user);
  console.log('User Error:', error);
});

// Test a simple query to see what headers are being sent
console.log('Testing simple query...');
window.supabase?.from('target_claims').select('count').then(({ data, error }) => {
  console.log('Simple Query Result:', { data, error });
});

// Check if the issue is with the specific insert
console.log('Testing insert permissions...');
window.supabase?.from('target_claims').select('id').limit(1).then(({ data, error }) => {
  console.log('SELECT Test:', { data, error });
});

console.log('=== END DEBUG ===');

