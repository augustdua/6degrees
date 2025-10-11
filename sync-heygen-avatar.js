const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const HEYGEN_API_URL = 'https://api.heygen.com';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

async function listAvatarGroups() {
  const response = await axios.get(
    `${HEYGEN_API_URL}/v2/avatar_group.list`,
    {
      headers: {
        'X-Api-Key': HEYGEN_API_KEY,
        'accept': 'application/json'
      }
    }
  );

  return response.data?.data?.avatar_group_list || [];
}

async function getGroupAvatars(groupId) {
  const response = await axios.get(
    `${HEYGEN_API_URL}/v2/avatar_group/${groupId}/avatars`,
    {
      headers: {
        'X-Api-Key': HEYGEN_API_KEY,
        'accept': 'application/json'
      }
    }
  );

  return response.data?.data?.avatar_list || [];
}

async function syncAvatarToUser(userEmail, groupId) {
  // Get avatars from the group
  const avatars = await getGroupAvatars(groupId);
  const firstAvatar = avatars[0];

  if (!firstAvatar) {
    console.error('❌ No avatars found in this group');
    return;
  }

  console.log('\n📸 Avatar data:', JSON.stringify(firstAvatar, null, 2));

  const previewUrl = firstAvatar.image_url || firstAvatar.motion_preview_url || null;

  // Update user in database
  const { error } = await supabase
    .from('users')
    .update({
      heygen_avatar_group_id: groupId,
      heygen_avatar_photo_id: firstAvatar.id,
      heygen_avatar_preview_url: previewUrl,
      heygen_avatar_trained: true,
      heygen_avatar_training_started_at: new Date().toISOString()
    })
    .eq('email', userEmail);

  if (error) {
    console.error('❌ Database update error:', error);
    return;
  }

  console.log('\n✅ Successfully synced avatar to your user account!');
  console.log('Group ID:', groupId);
  console.log('Photo ID:', firstAvatar.id);
  console.log('Preview URL:', previewUrl);
}

async function main() {
  console.log('🔍 Fetching your HeyGen avatar groups...\n');

  const groups = await listAvatarGroups();

  if (groups.length === 0) {
    console.log('❌ No avatar groups found in your HeyGen account');
    return;
  }

  console.log(`Found ${groups.length} avatar groups:\n`);

  groups.forEach((group, index) => {
    console.log(`${index + 1}. ${group.name || 'Unnamed'}`);
    console.log(`   ID: ${group.id}`);
    console.log(`   Status: ${group.train_status}`);
    console.log(`   Created: ${group.created_at || 'Unknown'}`);
    console.log('');
  });

  // For now, let's use the first trained group
  const trainedGroup = groups.find(g => g.train_status === 'ready');

  if (!trainedGroup) {
    console.log('❌ No trained avatar groups found. Please wait for training to complete.');
    return;
  }

  console.log(`\n🎯 Using avatar group: "${trainedGroup.name}" (${trainedGroup.id})`);

  // UPDATE THIS EMAIL to match your logged-in user
  const userEmail = 'augustdua@gmail.com'; // Change this to your actual email

  console.log(`\n📧 Syncing to user: ${userEmail}`);

  await syncAvatarToUser(userEmail, trainedGroup.id);
}

main().catch(console.error);
