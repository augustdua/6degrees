/**
 * Migrate existing HeyGen videos to Supabase permanent storage
 * Uses HeyGen API key to ensure access to temporary URLs
 */

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Load environment variables from .env files
require('dotenv').config({ path: './backend/.env' });
require('dotenv').config({ path: './frontend/.env' });
require('dotenv').config(); // Also try root .env

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const heygenApiKey = process.env.HEYGEN_API_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Need: SUPABASE_URL (or VITE_SUPABASE_URL)');
  console.error('   Need: SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY)');
  console.error('   Check: backend/.env or frontend/.env');
  process.exit(1);
}

if (!heygenApiKey) {
  console.log('⚠️  No HeyGen API key found (optional - will try direct download)');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function downloadVideo(url, outputPath) {
  console.log(`   ⬇️  Downloading from HeyGen...`);
  
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: heygenApiKey ? {
      'X-Api-Key': heygenApiKey
    } : {},
    timeout: 120000 // 2 minute timeout for large videos
  });
  
  fs.writeFileSync(outputPath, Buffer.from(response.data));
  return outputPath;
}

async function migrateVideo(request) {
  const tempDir = os.tmpdir();
  const videoPath = path.join(tempDir, `${request.id}-video.mp4`);
  
  try {
    console.log(`\n📹 Processing: ${request.target}`);
    console.log(`   Video ID: ${request.id}`);
    console.log(`   Current URL: ${request.video_url.substring(0, 80)}...`);
    
    // Download from HeyGen
    await downloadVideo(request.video_url, videoPath);
    const stats = fs.statSync(videoPath);
    console.log(`   ✅ Downloaded: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    
    // Upload to Supabase
    console.log(`   📤 Uploading to Supabase...`);
    const bucketName = '6DegreeRequests';
    const fileName = `ai-videos/${request.creator_id}/${request.id}-${Date.now()}.mp4`;
    
    const fileBuffer = fs.readFileSync(videoPath);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType: 'video/mp4',
        upsert: true
      });
    
    if (uploadError) {
      throw uploadError;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);
    
    const newVideoUrl = urlData.publicUrl;
    console.log(`   ✅ Uploaded to Supabase`);
    console.log(`   📎 New URL: ${newVideoUrl}`);
    
    // Update database
    console.log(`   💾 Updating database...`);
    const { error: updateError } = await supabase
      .from('connection_requests')
      .update({
        video_url: newVideoUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', request.id);
    
    if (updateError) {
      throw updateError;
    }
    
    console.log(`   ✅ Migration complete!`);
    
    // Cleanup
    fs.unlinkSync(videoPath);
    
    return { success: true, requestId: request.id, newUrl: newVideoUrl };
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    
    // Cleanup
    try { fs.unlinkSync(videoPath); } catch {}
    
    return { success: false, requestId: request.id, error: error.message };
  }
}

async function main() {
  console.log('🔄 HeyGen to Supabase Video Migration');
  console.log('=====================================\n');
  
  // Fetch all videos using HeyGen URLs
  console.log('📊 Finding videos using HeyGen temporary URLs...\n');
  
  const { data: requests, error: fetchError } = await supabase
    .from('connection_requests')
    .select('id, target, video_url, creator_id')
    .or('video_url.like.%heygen.ai%,video_url.like.%resource.heygen%')
    .order('created_at', { ascending: false });
  
  if (fetchError) {
    console.error('❌ Error fetching requests:', fetchError);
    process.exit(1);
  }
  
  if (!requests || requests.length === 0) {
    console.log('✅ No videos need migration! All are already on Supabase.');
    process.exit(0);
  }
  
  console.log(`📹 Found ${requests.length} video(s) to migrate\n`);
  
  const results = [];
  
  // Process videos sequentially
  for (let i = 0; i < requests.length; i++) {
    console.log(`[${i + 1}/${requests.length}]`);
    const result = await migrateVideo(requests[i]);
    results.push(result);
    
    // Wait between requests
    if (i < requests.length - 1) {
      console.log('   ⏳ Waiting 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Summary
  console.log('\n=====================================');
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Success: ${results.filter(r => r.success).length}`);
  console.log(`   ❌ Failed: ${results.filter(r => !r.success).length}`);
  
  if (results.some(r => !r.success)) {
    console.log('\n❌ Failed videos:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.requestId}: ${r.error}`);
    });
  }
  
  console.log('\n✨ Migration complete!\n');
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

