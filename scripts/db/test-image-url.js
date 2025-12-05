/**
 * Test Image URL Accessibility
 * Usage: node scripts/db/test-image-url.js [url]
 */

const url = process.argv[2] || 'https://tfbwfcnjdmbqmoyljeys.supabase.co/storage/v1/object/public/profile-pictures/dddffff1-bfed-40a6-a99c-28dccb4c5014/dddffff1-bfed-40a6-a99c-28dccb4c5014-1762273441317.jpg';

async function testUrl() {
  console.log('🔍 Testing URL:', url, '\n');
  
  try {
    const response = await fetch(url, { method: 'HEAD' });
    
    console.log('Status:', response.status, response.statusText);
    console.log('Content-Type:', response.headers.get('content-type'));
    console.log('Content-Length:', response.headers.get('content-length'));
    
    if (response.ok) {
      console.log('\n✅ Image is accessible!');
    } else {
      console.log('\n❌ Image NOT accessible');
      console.log('Response:', await response.text());
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

testUrl();

