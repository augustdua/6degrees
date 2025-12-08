/**
 * Setup Landing Images Storage Bucket
 * Run with: npx ts-node scripts/setup-landing-images-bucket.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

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

async function setupLandingImagesBucket() {
  console.log('🚀 Setting up landing-images storage bucket...\n');

  try {
    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      return;
    }

    const bucketExists = buckets?.some(b => b.id === 'landing-images');

    if (bucketExists) {
      console.log('✅ Bucket "landing-images" already exists');
    } else {
      // Create the bucket
      const { data, error } = await supabase.storage.createBucket('landing-images', {
        public: true,
        fileSizeLimit: 5242880, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
      });

      if (error) {
        console.error('❌ Error creating bucket:', error.message);
        return;
      }

      console.log('✅ Created bucket "landing-images"');
    }

    console.log('\n📋 Next Steps:');
    console.log('─────────────────────────────────────────────────────────');
    console.log('Upload your images to Supabase Storage:');
    console.log('');
    console.log('1. Go to: https://supabase.com/dashboard/project/tfbwfcnjdmbqmoyljeys/storage/buckets/landing-images');
    console.log('');
    console.log('2. Upload these files with these EXACT names:');
    console.log('   • 11_Soho House Mumbai Carousel.jpg  →  soho-house-mumbai.jpg');
    console.log('   • 08_Mumbai_HomePage_43.jpg          →  mumbai-mixer.jpg');
    console.log('   • 12_Mumbai_HomePage_43.jpg          →  private-dinner.jpg');
    console.log('');
    console.log('3. The images will be available at:');
    console.log('   https://tfbwfcnjdmbqmoyljeys.supabase.co/storage/v1/object/public/landing-images/soho-house-mumbai.jpg');
    console.log('   https://tfbwfcnjdmbqmoyljeys.supabase.co/storage/v1/object/public/landing-images/mumbai-mixer.jpg');
    console.log('   https://tfbwfcnjdmbqmoyljeys.supabase.co/storage/v1/object/public/landing-images/private-dinner.jpg');
    console.log('─────────────────────────────────────────────────────────');
    console.log('\n✅ Done!');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

setupLandingImagesBucket();

