/**
 * Upload Landing Images to Supabase Storage
 * Run with: npx tsx scripts/upload-landing-images.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL || 'https://tfbwfcnjdmbqmoyljeys.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const BUCKET_NAME = 'landing-images';
const PUBLIC_DIR = path.join(__dirname, '../frontend/public');

// Map of source files to destination names
const IMAGE_MAPPINGS = [
  { source: '11_Soho House Mumbai Carousel.jpg', dest: 'soho-house-mumbai.jpg' },
  { source: '08_Mumbai_HomePage_43.jpg', dest: 'mumbai-mixer.jpg' },
  { source: '12_Mumbai_HomePage_43.jpg', dest: 'private-dinner.jpg' },
  { source: '01_Mumbai_ArtPage_43.jpg', dest: 'mumbai-art.jpg' },
  { source: '03_Private_Hire_dotcom.png', dest: 'private-hire.png' },
  { source: '13_Soho House Mumbai_34.jpg', dest: 'soho-house-2.jpg' },
];

async function uploadImages() {
  console.log('🚀 Uploading landing images to Supabase Storage...\n');

  for (const mapping of IMAGE_MAPPINGS) {
    const sourcePath = path.join(PUBLIC_DIR, mapping.source);
    
    // Check if file exists
    if (!fs.existsSync(sourcePath)) {
      console.log(`⚠️  File not found: ${mapping.source}`);
      continue;
    }

    console.log(`📤 Uploading: ${mapping.source} → ${mapping.dest}`);

    try {
      const fileBuffer = fs.readFileSync(sourcePath);
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(mapping.dest, fileBuffer, {
          contentType: 'image/jpeg',
          upsert: true // Overwrite if exists
        });

      if (error) {
        console.error(`   ❌ Error: ${error.message}`);
      } else {
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${mapping.dest}`;
        console.log(`   ✅ Uploaded! URL: ${publicUrl}`);
      }
    } catch (err: any) {
      console.error(`   ❌ Error uploading ${mapping.source}:`, err.message);
    }
  }

  console.log('\n✅ Done!');
}

uploadImages();

