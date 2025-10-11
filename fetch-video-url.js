const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const HEYGEN_API_URL = 'https://api.heygen.com';
const VIDEO_ID = 'b386d51363954e5faaae174c8b213f60';
const REQUEST_ID = 'dfd2bde1-e9dd-4f45-949b-e235ffd816f4';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

async function fetchAndUpdateVideo() {
  try {
    console.log('Fetching video status from HeyGen...');

    const response = await axios.get(
      `${HEYGEN_API_URL}/v1/video_status.get?video_id=${VIDEO_ID}`,
      {
        headers: {
          'X-Api-Key': HEYGEN_API_KEY
        }
      }
    );

    console.log('HeyGen Response:', JSON.stringify(response.data, null, 2));

    const data = response.data.data;

    if (data.status === 'completed' && data.video_url) {
      console.log('\nVideo URL:', data.video_url);
      console.log('\nUpdating database...');

      const { error } = await supabase
        .from('connection_requests')
        .update({
          video_url: data.video_url,
          video_thumbnail_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', REQUEST_ID);

      if (error) {
        console.error('Database update error:', error);
      } else {
        console.log('✅ Database updated successfully!');
      }
    } else {
      console.log('Video status:', data.status);
      console.log('Full data:', data);
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

fetchAndUpdateVideo();
