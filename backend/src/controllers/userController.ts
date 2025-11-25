import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';
import multer from 'multer';
import {
  uploadAsset,
  generatePhotoAvatar,
  generatePhotoAvatarFromImage,
  createAvatarGroup,
  addLooksToGroup,
  trainAvatarGroup,
  generateLook,
  getGroupAvatars,
  listAvatarGroups
} from '../services/heygenPhotoAvatarService';

// Configure multer for photo uploads (memory storage)
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for images
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only image files are allowed.'));
    }
  }
});

export const photoUploadMiddleware = photoUpload.single('photo');

/**
 * Update user profile
 */
export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { firstName, lastName, bio, linkedinUrl } = req.body;

    const { data, error } = await supabase
      .from('users')
      .update({
        first_name: firstName,
        last_name: lastName,
        bio: bio,
        linkedin_url: linkedinUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    return res.json({ success: true, user: data });
  } catch (error: any) {
    console.error('Error in updateProfile:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        bio,
        linkedin_url,
        profile_picture_url,
        social_capital_score,
        social_capital_score_updated_at,
        is_profile_public,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'User not found' });
      }
      console.error('Error fetching user:', error);
      return res.status(500).json({ error: 'Failed to fetch user' });
    }

    return res.json(data);
  } catch (error: any) {
    console.error('Error in getUserById:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Search users
 */
export const searchUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        profile_picture_url,
        social_capital_score
      `)
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(Number(limit));

    if (error) {
      console.error('Error searching users:', error);
      return res.status(500).json({ error: 'Failed to search users' });
    }

    return res.json({ users: data || [] });
  } catch (error: any) {
    console.error('Error in searchUsers:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Discover users for the People tab
 * Calls the discover_users database function
 */
export const discoverUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      limit = 20,
      offset = 0,
      search,
      company,
      location,
      exclude_connected = false
    } = req.query;

    console.log(`🔍 Discovering users for ${userId}:`, { limit, offset, search, company, location, exclude_connected });

    // Call the discover_users database function with user_id parameter
    const { data, error } = await supabase.rpc('discover_users', {
      p_user_id: userId,
      p_limit: parseInt(limit as string),
      p_offset: parseInt(offset as string),
      p_search: search as string || null,
      p_company: company as string || null,
      p_location: location as string || null,
      p_exclude_connected: exclude_connected === 'true'
    });

    if (error) {
      console.error('❌ Error calling discover_users:', error);
      throw error;
    }

    console.log(`✅ Discovered ${data?.length || 0} users`);

    return res.status(200).json(data || []);
  } catch (error: any) {
    console.error('Error in discoverUsers:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Upload user photo and generate cartoon avatar
 * Step 1: Generate photo avatars (returns 3-4 seed images)
 */
export const uploadAvatarPhoto = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No photo file uploaded' });
    }

    // Get user preferences from request body
    const { age, gender, ethnicity, style, appearance } = req.body;

    // For now, we'll use a data URL approach since HeyGen expects image URLs or keys
    // In production, upload to Supabase storage first, then pass URL to HeyGen
    const photoBuffer = req.file.buffer;
    const photoBase64 = photoBuffer.toString('base64');
    const photoDataUrl = `data:${req.file.mimetype};base64,${photoBase64}`;

    // Note: HeyGen API typically needs a publicly accessible URL or uses their upload flow
    // For now, return guidance that frontend should upload to Supabase storage first
    return res.status(400).json({
      error: 'Direct photo upload not yet implemented. Please upload to Supabase storage first and provide URL.',
      guidance: 'Upload photo to Supabase storage bucket, then call /api/users/avatar/generate with image_url'
    });
  } catch (error: any) {
    console.error('Error in uploadAvatarPhoto:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Generate avatar from user's photo OR generate AI avatar with customization
 * Two modes:
 * - 'photo': Upload user photo to HeyGen (no customization during generation)
 * - 'ai-generate': Text-to-image generation with customization (no photo upload)
 */
export const generateUserAvatar = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { mode, imageUrl, age, gender, ethnicity, style, orientation, pose, appearance } = req.body;

    if (!mode || (mode !== 'photo' && mode !== 'ai-generate')) {
      return res.status(400).json({ error: 'mode must be "photo" or "ai-generate"' });
    }

    if (mode === 'photo') {
      // === Photo Upload Mode ===
      // Upload user's actual photo to HeyGen, NO customization

      if (!imageUrl) {
        return res.status(400).json({ error: 'imageUrl is required for photo mode' });
      }

      console.log(`📸 Photo mode: Uploading user photo for user ${userId}`);

      const imageKey = await uploadAsset(imageUrl);
      console.log(`✅ Image uploaded to HeyGen with key: ${imageKey}`);

      // Store the image key ONLY (no customization params for photo mode)
      const { error: updateError } = await supabase
        .from('users')
        .update({
          heygen_avatar_image_key: imageKey,
          heygen_avatar_mode: 'photo'
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Failed to update user avatar data:', updateError);
      }

      return res.status(200).json({
        success: true,
        imageKey,
        message: 'Photo uploaded to HeyGen successfully. Now call /train to create and train the avatar group.'
      });

    } else {
      // === AI Generate Mode ===
      // Text-to-image generation with customization parameters

      console.log(`🎨 AI Generate mode: Creating avatar for user ${userId} with customization:`, {
        age, gender, ethnicity, style, orientation, pose, appearance
      });

      // Store customization parameters (no image key for AI generation)
      const { error: updateError } = await supabase
        .from('users')
        .update({
          heygen_avatar_mode: 'ai-generate',
          heygen_avatar_age: age || 'Young Adult',
          heygen_avatar_gender: gender || 'Man',
          heygen_avatar_ethnicity: ethnicity || 'Unspecified',
          heygen_avatar_style: style || 'Realistic',
          heygen_avatar_orientation: orientation || 'square',
          heygen_avatar_pose: pose || 'half_body',
          heygen_avatar_appearance: appearance || ''
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Failed to update user avatar data:', updateError);
      }

      return res.status(200).json({
        success: true,
        message: 'Avatar customization saved. Now call /train to generate and train the avatar group.'
      });
    }
  } catch (error: any) {
    console.error('Error in generateUserAvatar:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Create and train avatar group
 * Handles both photo upload and AI generation modes
 */
export const createAndTrainAvatar = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { regenerate, mode } = req.body;

    // Get user info including mode and customization parameters
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('first_name, last_name, heygen_avatar_group_id, heygen_avatar_mode, heygen_avatar_image_key, heygen_avatar_age, heygen_avatar_gender, heygen_avatar_ethnicity, heygen_avatar_style, heygen_avatar_orientation, heygen_avatar_pose, heygen_avatar_appearance')
      .eq('id', userId)
      .single();

    if (userError) {
      throw new Error('Failed to fetch user data');
    }

    // If regenerating, clear old avatar data first to create a fresh group
    if (regenerate && userData.heygen_avatar_group_id) {
      console.log(`Regenerating avatar for user ${userId}, clearing old group ${userData.heygen_avatar_group_id}`);
      await supabase
        .from('users')
        .update({
          heygen_avatar_group_id: null,
          heygen_avatar_photo_id: null,
          heygen_avatar_preview_url: null,
          heygen_avatar_trained: false,
          heygen_avatar_training_started_at: null
        })
        .eq('id', userId);
    }

    const groupName = `${userData.first_name} ${userData.last_name} Avatar`.trim();
    const avatarMode = mode || userData.heygen_avatar_mode || 'photo';

    if (avatarMode === 'photo') {
      // === Photo Upload Mode ===
      // Create avatar group directly from uploaded image key (NO customization)

      if (!userData.heygen_avatar_image_key) {
        return res.status(400).json({ error: 'No image key found. Please upload a photo first.' });
      }

      console.log(`📸 Photo mode: Creating/updating avatar group for user ${userId} from uploaded photo`);

      let groupId: string;
      
      // If user already has a group and NOT regenerating, add to existing group
      if (userData.heygen_avatar_group_id && !regenerate) {
        groupId = userData.heygen_avatar_group_id;
        console.log(`➕ Adding avatar to existing group: ${groupId}`);
        await addLooksToGroup(groupId, groupName, [userData.heygen_avatar_image_key]);
      } else {
        // Create new group (first time or regenerating)
        console.log(`🆕 Creating new avatar group`);
        groupId = await createAvatarGroup(groupName, userData.heygen_avatar_image_key);
      }

      console.log(`✅ Avatar group ready: ${groupId}`);

      // Update user with group ID and mark training as started
      await supabase
        .from('users')
        .update({
          heygen_avatar_group_id: groupId,
          heygen_avatar_training_started_at: new Date().toISOString()
        })
        .eq('id', userId);

      // Start training (async, don't wait)
      trainAvatarGroup(groupId, false).catch(err => {
        console.error(`Training failed for group ${groupId}:`, err);
      });

      // Poll training completion in background
      setTimeout(async () => {
        try {
          await trainAvatarGroup(groupId, true);

          // Get the first talking photo from the group
          const avatars = await getGroupAvatars(groupId);
          const firstAvatar = avatars[0];

          console.log(`Avatar data:`, JSON.stringify(firstAvatar, null, 2));

          // Update user profile with trained avatar
          await supabase
            .from('users')
            .update({
              heygen_avatar_trained: true,
              heygen_avatar_photo_id: firstAvatar?.id || null,
              heygen_avatar_preview_url: firstAvatar?.image_url || firstAvatar?.motion_preview_url || null
            })
            .eq('id', userId);

          console.log(`Training completed for user ${userId}, group ${groupId}`);
        } catch (error) {
          console.error(`Background training failed for user ${userId}:`, error);
        }
      }, 5000);

      return res.status(200).json({
        success: true,
        groupId,
        message: 'Avatar group created from your photo and training started. Check status with /api/users/avatar/status'
      });

    } else {
      // === AI Generate Mode ===
      // Generate photo avatars using text-to-image with customization

      console.log(`🎨 AI Generate mode: Generating avatar for user ${userId} with customization:`, {
        age: userData.heygen_avatar_age,
        gender: userData.heygen_avatar_gender,
        ethnicity: userData.heygen_avatar_ethnicity,
        style: userData.heygen_avatar_style,
        orientation: userData.heygen_avatar_orientation,
        pose: userData.heygen_avatar_pose,
        appearance: userData.heygen_avatar_appearance
      });

      // Generate photo avatars using text-to-image (returns multiple images)
      const photoAvatarResult = await generatePhotoAvatar({
        name: groupName,
        age: userData.heygen_avatar_age || 'Young Adult',
        gender: userData.heygen_avatar_gender || 'Man',
        ethnicity: userData.heygen_avatar_ethnicity || 'Unspecified',
        style: userData.heygen_avatar_style || 'Realistic',
        orientation: userData.heygen_avatar_orientation || 'square',
        pose: userData.heygen_avatar_pose || 'half_body',
        appearance: userData.heygen_avatar_appearance
      });

      console.log(`✅ Photo avatar generation completed. Generated ${photoAvatarResult.imageKeyList.length} images`);
      console.log(`📸 Image keys:`, photoAvatarResult.imageKeyList);
      console.log(`📸 Image URLs:`, photoAvatarResult.imageUrlList);

      // Try using the generated image_keys directly first
      const assetKeys = photoAvatarResult.imageKeyList;

      let groupId: string;

      // If user already has a group and NOT regenerating, add to existing group
      if (userData.heygen_avatar_group_id && !regenerate) {
        groupId = userData.heygen_avatar_group_id;
        console.log(`➕ Adding ${assetKeys.length} avatars to existing group: ${groupId}`);
        await addLooksToGroup(groupId, `${groupName} - Additional Looks`, assetKeys);
      } else {
        // Create new group (first time or regenerating)
        console.log(`🆕 Creating new avatar group with ${assetKeys.length} avatars`);
        groupId = await createAvatarGroup(groupName, assetKeys[0]);

        // Add remaining generated images as additional looks
        if (assetKeys.length > 1) {
          await addLooksToGroup(groupId, `${groupName} - Additional Looks`, assetKeys.slice(1));
        }
      }

      // Update user with group ID and mark training as started
      await supabase
        .from('users')
        .update({
          heygen_avatar_group_id: groupId,
          heygen_avatar_training_started_at: new Date().toISOString()
        })
        .eq('id', userId);

      // Start training (async, don't wait)
      trainAvatarGroup(groupId, false).catch(err => {
        console.error(`Training failed for group ${groupId}:`, err);
      });

      // Poll training completion in background
      setTimeout(async () => {
        try {
          await trainAvatarGroup(groupId, true);

          // Get the first talking photo from the group
          const avatars = await getGroupAvatars(groupId);
          const firstAvatar = avatars[0];

          console.log(`Avatar data:`, JSON.stringify(firstAvatar, null, 2));

          // Update user profile with trained avatar
          await supabase
            .from('users')
            .update({
              heygen_avatar_trained: true,
              heygen_avatar_photo_id: firstAvatar?.id || null,
              heygen_avatar_preview_url: firstAvatar?.image_url || firstAvatar?.motion_preview_url || null
            })
            .eq('id', userId);

          console.log(`Training completed for user ${userId}, group ${groupId}`);
        } catch (error) {
          console.error(`Background training failed for user ${userId}:`, error);
        }
      }, 5000);

      return res.status(200).json({
        success: true,
        groupId,
        message: 'AI avatar generated and training started. Check status with /api/users/avatar/status'
      });
    }
  } catch (error: any) {
    console.error('Error in createAndTrainAvatar:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Check avatar training status and return ALL user's avatars from their group
 * Each user has exactly ONE group, and we show all avatars in that group
 */
export const getAvatarStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('heygen_avatar_group_id, heygen_avatar_photo_id, heygen_avatar_trained, heygen_avatar_training_started_at, heygen_avatar_preview_url')
      .eq('id', userId)
      .single();

    if (userError) {
      throw new Error('Failed to fetch user data');
    }

    if (!userData.heygen_avatar_group_id) {
      return res.status(200).json({
        hasAvatar: false,
        message: 'No avatar created yet',
        avatars: []
      });
    }

    // Fetch ALL avatars from HeyGen for THIS USER's group ONLY
    try {
      const groups = await listAvatarGroups();
      console.log(`🔍 All groups from HeyGen:`, groups.map(g => ({ 
        id: g.id, 
        name: g.name, 
        train_status: g.train_status,
        talking_photo_amount: g.talking_photo_amount 
      })));
      
      const userGroup = groups.find(g => g.id === userData.heygen_avatar_group_id);

      if (!userGroup) {
        console.warn(`❌ Avatar group ${userData.heygen_avatar_group_id} not found in HeyGen for user ${userId}`);
        console.warn(`Available group IDs:`, groups.map(g => g.id));
        return res.status(200).json({
          hasAvatar: false,
          message: 'Avatar group not found in HeyGen',
          avatars: []
        });
      }

      console.log(`📊 User ${userId} group FULL DATA:`, JSON.stringify(userGroup, null, 2));

      // Get all talking photos from THIS USER's group
      const avatars = await getGroupAvatars(userData.heygen_avatar_group_id);
      console.log(`📸 Found ${avatars.length} avatars in group ${userData.heygen_avatar_group_id} for user ${userId}`);
      
      if (avatars.length > 0) {
        console.log(`🎭 First avatar data:`, JSON.stringify(avatars[0], null, 2));
      }

      // Check if training is complete by checking if avatars exist and are completed
      // HeyGen sometimes reports train_status as 'empty' even when avatars are ready (API bug)
      // So we check the actual avatars instead of relying on group train_status
      const hasCompletedAvatars = avatars.length > 0 && 
                                  avatars.every((av: any) => av.status === 'completed' || !av.status);
      
      // Also trust trainStatus === 'ready' even if avatars array is temporarily empty
      const isTrainingComplete = hasCompletedAvatars || userGroup.train_status === 'ready';
      
      console.log(`✅ Training complete check:`, {
        trainStatus: userGroup.train_status,
        avatarCount: avatars.length,
        avatarStatuses: avatars.map((av: any) => ({ id: av.id, status: av.status })),
        hasCompletedAvatars,
        isComplete: isTrainingComplete
      });

      if (isTrainingComplete) {
        // Map all avatars to a clean format
        const avatarList = avatars.map((avatar: any) => ({
          id: avatar.id,
          name: avatar.name || 'Unnamed Avatar',
          previewUrl: avatar.image_url || avatar.motion_preview_url || null,
          thumbnailUrl: avatar.thumbnail_image_url || avatar.image_url || null,
          status: avatar.status || 'ready'
        }));

        // Update database with first avatar as default (only if not already set)
        const firstAvatar = avatars[0];
        if (!userData.heygen_avatar_trained) {
          await supabase
            .from('users')
            .update({
              heygen_avatar_trained: true,
              heygen_avatar_photo_id: firstAvatar?.id || null,
              heygen_avatar_preview_url: firstAvatar?.image_url || firstAvatar?.motion_preview_url || null
            })
            .eq('id', userId);
          console.log(`✅ Updated user ${userId} with trained avatar data`);
        }

        return res.status(200).json({
          hasAvatar: true,
          trained: true,
          groupId: userData.heygen_avatar_group_id,
          photoId: firstAvatar?.id,
          previewUrl: firstAvatar?.image_url || firstAvatar?.motion_preview_url || null,
          avatars: avatarList,
          defaultAvatarId: firstAvatar?.id,
          message: avatars.length === 0 ? 'Training complete but avatars list is temporarily empty. Try refreshing.' : undefined
        });
      }

      // Training still in progress
      console.log(`⏳ User ${userId} avatars still training (status: ${userGroup.train_status})`);
      return res.status(200).json({
        hasAvatar: true,
        trained: false,
        groupId: userData.heygen_avatar_group_id,
        trainStatus: userGroup.train_status || 'training',
        trainingStartedAt: userData.heygen_avatar_training_started_at,
        avatars: []
      });
    } catch (error) {
      console.error('Error checking training status from HeyGen:', error);
      // If we already have trained status in DB, return that
      if (userData.heygen_avatar_trained && userData.heygen_avatar_photo_id) {
        return res.status(200).json({
          hasAvatar: true,
          trained: true,
          groupId: userData.heygen_avatar_group_id,
          photoId: userData.heygen_avatar_photo_id,
          previewUrl: userData.heygen_avatar_preview_url,
          avatars: [],
          message: 'Using cached avatar data (HeyGen API unavailable)'
        });
      }
      return res.status(200).json({
        hasAvatar: true,
        trained: false,
        groupId: userData.heygen_avatar_group_id,
        trainStatus: 'unknown',
        trainingStartedAt: userData.heygen_avatar_training_started_at,
        avatars: []
      });
    }
  } catch (error: any) {
    console.error('Error in getAvatarStatus:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Generate a new look (outfit/style) for user's avatar
 */
/**
 * Refresh avatar data from HeyGen (for debugging)
 */
export const refreshAvatarData = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('heygen_avatar_group_id')
      .eq('id', userId)
      .single();

    if (userError || !userData.heygen_avatar_group_id) {
      return res.status(400).json({ error: 'No avatar group found' });
    }

    // Get avatars from the group
    const avatars = await getGroupAvatars(userData.heygen_avatar_group_id);
    const firstAvatar = avatars[0];

    if (!firstAvatar) {
      return res.status(404).json({ error: 'No avatars found in group' });
    }

    const previewUrl = firstAvatar.image_url || firstAvatar.motion_preview_url || null;

    // Update database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        heygen_avatar_photo_id: firstAvatar.id,
        heygen_avatar_preview_url: previewUrl
      })
      .eq('id', userId);

    if (updateError) {
      throw updateError;
    }

    return res.status(200).json({
      success: true,
      photoId: firstAvatar.id,
      previewUrl: previewUrl,
      avatarData: firstAvatar
    });
  } catch (error: any) {
    console.error('Error in refreshAvatarData:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const generateNewLook = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { prompt, orientation, pose, style } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('heygen_avatar_group_id, heygen_avatar_trained')
      .eq('id', userId)
      .single();

    if (userError || !userData.heygen_avatar_group_id) {
      return res.status(400).json({ error: 'No avatar group found. Please create an avatar first.' });
    }

    if (!userData.heygen_avatar_trained) {
      return res.status(400).json({ error: 'Avatar is still training. Please wait.' });
    }

    console.log(`Generating new look for user ${userId}`);

    const result = await generateLook({
      groupId: userData.heygen_avatar_group_id,
      prompt,
      orientation,
      pose,
      style
    });

    return res.status(200).json({
      success: true,
      generationId: result.generationId,
      imageKeyList: result.imageKeyList,
      imageUrlList: result.imageUrlList
    });
  } catch (error: any) {
    console.error('Error in generateNewLook:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Delete user's avatar group completely
 */
export const deleteAvatarGroup = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('heygen_avatar_group_id')
      .eq('id', userId)
      .single();

    if (userError || !userData.heygen_avatar_group_id) {
      return res.status(400).json({ error: 'No avatar group found to delete' });
    }

    console.log(`🗑️ Deleting avatar group ${userData.heygen_avatar_group_id} for user ${userId}`);

    // Clear user's avatar data in database
    // Note: HeyGen doesn't provide a delete API, so we just clear our reference
    // The group will remain in HeyGen but won't be used
    await supabase
      .from('users')
      .update({
        heygen_avatar_group_id: null,
        heygen_avatar_photo_id: null,
        heygen_avatar_preview_url: null,
        heygen_avatar_trained: false,
        heygen_avatar_training_started_at: null,
        heygen_avatar_image_key: null
      })
      .eq('id', userId);

    console.log(`✅ Avatar group deleted for user ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'Avatar group deleted successfully'
    });
  } catch (error: any) {
    console.error('Error in deleteAvatarGroup:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Get list of available HeyGen voices
 */
export const getAvailableVoices = async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const { getHeyGenVoices } = await import('../services/heygenService');
    const voices = await getHeyGenVoices();
    
    console.log(`✅ Fetched ${voices.length} voices from HeyGen`);
    
    return res.status(200).json({
      success: true,
      voices
    });
  } catch (error: any) {
    console.error('Error fetching voices:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to fetch voices',
      success: false
    });
  }
};

/**
 * Update user's preferred currency
 */
export const updateUserCurrency = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { preferred_currency } = req.body;

    // Validate currency
    if (!preferred_currency || (preferred_currency !== 'INR' && preferred_currency !== 'EUR')) {
      return res.status(400).json({ 
        error: 'Invalid currency. Must be "INR" or "EUR"' 
      });
    }

    console.log(`Updating currency for user ${userId} to ${preferred_currency}`);

    const { data, error } = await supabase
      .from('users')
      .update({ preferred_currency })
      .eq('id', userId)
      .select('id, preferred_currency')
      .single();

    if (error) {
      console.error('Error updating currency preference:', error);
      return res.status(500).json({ error: 'Failed to update currency preference' });
    }

    console.log(`✅ Currency updated successfully for user ${userId}`);

    return res.status(200).json({
      success: true,
      preferred_currency: data.preferred_currency
    });
  } catch (error: any) {
    console.error('Error in updateUserCurrency:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};