/**
 * Migrate HeyGen thumbnail URLs to Supabase permanent storage
 * Downloads thumbnails from HeyGen and uploads to Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Load environment variables
require('dotenv').config({ path: './backend/.env' });
require('dotenv').config({ path: './frontend/.env' });
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function downloadThumbnail(url, outputPath) {
  console.log(`   ⬇️  Downloading thumbnail...`);
  
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000
  });
  
  fs.writeFileSync(outputPath, Buffer.from(response.data));
  return outputPath;
}

async function migrateThumbnail(request) {
  const tempDir = os.tmpdir();
  const thumbnailPath = path.join(tempDir, `${request.id}-thumb.jpg`);
  
  try {
    console.log(`\n📷 Processing: ${request.target}`);
    console.log(`   Request ID: ${request.id}`);
    console.log(`   Current thumbnail: ${request.video_thumbnail_url.substring(0, 80)}...`);
    
    // Download from HeyGen
    await downloadThumbnail(request.video_thumbnail_url, thumbnailPath);
    const stats = fs.statSync(thumbnailPath);
    console.log(`   ✅ Downloaded: ${(stats.size / 1024).toFixed(2)} KB`);
    
    // Upload to Supabase
    console.log(`   📤 Uploading to Supabase...`);
    const bucketName = '6DegreeRequests';
    const fileName = `ai-videos/${request.creator_id}/${request.id}-thumbnail.jpg`;
    
    const fileBuffer = fs.readFileSync(thumbnailPath);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });
    
    if (uploadError) {
      throw uploadError;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);
    
    const newThumbnailUrl = urlData.publicUrl;
    console.log(`   ✅ Uploaded to Supabase`);
    console.log(`   📎 New URL: ${newThumbnailUrl}`);
    
    // Update database
    console.log(`   💾 Updating database...`);
    const { error: updateError } = await supabase
      .from('connection_requests')
      .update({
        video_thumbnail_url: newThumbnailUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', request.id);
    
    if (updateError) {
      throw updateError;
    }
    
    console.log(`   ✅ Migration complete!`);
    
    // Cleanup
    fs.unlinkSync(thumbnailPath);
    
    return { success: true, requestId: request.id, newUrl: newThumbnailUrl };
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    
    // Cleanup
    try { fs.unlinkSync(thumbnailPath); } catch {}
    
    return { success: false, requestId: request.id, error: error.message };
  }
}

async function main() {
  console.log('📷 HeyGen to Supabase Thumbnail Migration');
  console.log('=========================================\n');
  
  // Fetch all requests with HeyGen thumbnail URLs
  console.log('📊 Finding thumbnails using HeyGen temporary URLs...\n');
  
  const { data: requests, error: fetchError } = await supabase
    .from('connection_requests')
    .select('id, target, video_url, video_thumbnail_url, creator_id')
    .not('video_url', 'is', null)
    .or('video_thumbnail_url.like.%heygen.ai%,video_thumbnail_url.like.%resource.heygen%')
    .order('created_at', { ascending: false });
  
  if (fetchError) {
    console.error('❌ Error fetching requests:', fetchError);
    process.exit(1);
  }
  
  if (!requests || requests.length === 0) {
    console.log('✅ No thumbnails need migration! All are already on Supabase.');
    process.exit(0);
  }
  
  console.log(`📷 Found ${requests.length} thumbnail(s) to migrate\n`);
  
  const results = [];
  
  // Process thumbnails sequentially
  for (let i = 0; i < requests.length; i++) {
    console.log(`[${i + 1}/${requests.length}]`);
    const result = await migrateThumbnail(requests[i]);
    results.push(result);
    
    // Wait between requests
    if (i < requests.length - 1) {
      console.log('   ⏳ Waiting 1 second...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Summary
  console.log('\n=========================================');
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Success: ${results.filter(r => r.success).length}`);
  console.log(`   ❌ Failed: ${results.filter(r => !r.success).length}`);
  
  if (results.some(r => !r.success)) {
    console.log('\n❌ Failed thumbnails:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.requestId}: ${r.error}`);
    });
  }
  
  console.log('\n✨ Thumbnail migration complete!\n');
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

