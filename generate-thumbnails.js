/**
 * Generate thumbnails for all existing videos without thumbnails
 * 
 * This script:
 * 1. Fetches all videos without thumbnails from Supabase
 * 2. Downloads each video
 * 3. Extracts a frame at 0.5s using ffmpeg
 * 4. Uploads the thumbnail to Supabase storage
 * 5. Updates the video_thumbnail_url in the database
 * 
 * Requirements:
 * - Node.js 16+
 * - ffmpeg installed on system
 * 
 * Usage: node generate-thumbnails.js
 */

const { createClient } = require('@supabase/supabase-js');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const os = require('os');

require('dotenv').config({ path: './frontend/.env' });

const execAsync = promisify(exec);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  if (!supabaseUrl) console.error('   ✗ VITE_SUPABASE_URL');
  if (!supabaseServiceKey) console.error('   ✗ SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('💡 Make sure frontend/.env contains:');
  console.error('   VITE_SUPABASE_URL=your_supabase_url');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=your_service_key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Check if ffmpeg is installed
async function checkFFmpeg() {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch (error) {
    console.error('❌ ffmpeg is not installed. Please install it:');
    console.error('   Windows: choco install ffmpeg');
    console.error('   Mac: brew install ffmpeg');
    console.error('   Linux: sudo apt-get install ffmpeg');
    return false;
  }
}

// Download video to temp file
async function downloadVideo(url, outputPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(outputPath);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(outputPath);
        });
      } else {
        fs.unlink(outputPath, () => {});
        reject(new Error(`Failed to download: ${response.statusCode}`));
      }
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

// Extract thumbnail from video using ffmpeg
async function extractThumbnail(videoPath, thumbnailPath) {
  const command = `ffmpeg -ss 0.5 -i "${videoPath}" -vframes 1 -q:v 2 "${thumbnailPath}" -y`;
  await execAsync(command);
  return thumbnailPath;
}

// Process a single video
async function processVideo(request) {
  const tempDir = os.tmpdir();
  const videoPath = path.join(tempDir, `${request.id}-video.mp4`);
  const thumbnailPath = path.join(tempDir, `${request.id}-thumb.jpg`);

  try {
    console.log(`\n📹 Processing: ${request.target}`);
    console.log(`   Video: ${request.video_url}`);

    // Download video
    console.log(`   ⬇️  Downloading...`);
    await downloadVideo(request.video_url, videoPath);

    // Extract thumbnail
    console.log(`   🎬 Extracting frame at 0.5s...`);
    await extractThumbnail(videoPath, thumbnailPath);

    // Upload to Supabase storage
    console.log(`   📤 Uploading thumbnail...`);
    const storagePath = `ai-videos/${request.creator_id}/${request.id}-thumbnail.jpg`;
    
    const fileBuffer = fs.readFileSync(thumbnailPath);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('6DegreeRequests')
      .upload(storagePath, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('6DegreeRequests')
      .getPublicUrl(storagePath);

    const thumbnailUrl = urlData.publicUrl;

    // Update database
    console.log(`   💾 Updating database...`);
    const { error: updateError } = await supabase
      .from('connection_requests')
      .update({
        video_thumbnail_url: thumbnailUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', request.id);

    if (updateError) {
      throw updateError;
    }

    console.log(`   ✅ Success! ${thumbnailUrl}`);
    
    // Cleanup temp files
    fs.unlinkSync(videoPath);
    fs.unlinkSync(thumbnailPath);

    return { success: true, requestId: request.id, thumbnailUrl };

  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    
    // Cleanup temp files
    try { fs.unlinkSync(videoPath); } catch {}
    try { fs.unlinkSync(thumbnailPath); } catch {}

    return { success: false, requestId: request.id, error: error.message };
  }
}

// Main function
async function main() {
  console.log('🎬 Video Thumbnail Generator');
  console.log('============================\n');

  // Check ffmpeg
  const hasFFmpeg = await checkFFmpeg();
  if (!hasFFmpeg) {
    process.exit(1);
  }

  // Fetch all videos without thumbnails
  console.log('📊 Fetching videos without thumbnails...\n');
  
  const { data: requests, error: fetchError } = await supabase
    .from('connection_requests')
    .select('id, target, video_url, creator_id')
    .not('video_url', 'is', null)
    .is('video_thumbnail_url', null)
    .order('created_at', { ascending: false });

  if (fetchError) {
    console.error('❌ Error fetching requests:', fetchError);
    process.exit(1);
  }

  if (!requests || requests.length === 0) {
    console.log('✅ All videos already have thumbnails!');
    process.exit(0);
  }

  console.log(`📹 Found ${requests.length} videos to process\n`);

  const results = [];

  // Process videos sequentially to avoid overwhelming the system
  for (let i = 0; i < requests.length; i++) {
    console.log(`[${i + 1}/${requests.length}]`);
    const result = await processVideo(requests[i]);
    results.push(result);
    
    // Wait a bit between requests
    if (i < requests.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Summary
  console.log('\n============================');
  console.log('📊 Summary:');
  console.log(`   ✅ Success: ${results.filter(r => r.success).length}`);
  console.log(`   ❌ Failed: ${results.filter(r => !r.success).length}`);
  
  if (results.some(r => !r.success)) {
    console.log('\n❌ Failed videos:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.requestId}: ${r.error}`);
    });
  }

  console.log('\n✨ Done!\n');
}

// Run the script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

